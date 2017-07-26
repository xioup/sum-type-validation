import * as R          from "ramda"
import { create, env } from "sanctuary"
import $               from "sanctuary-def"
import type          from "sanctuary-type-identifiers"

const S = create( { checkTypes: true, env } )
const def = $.create( { checkTypes: true, env } )

const log = R.tap( console.log )
const memo = R.memoize
const appendTo = R.flip( R.append )

const isOfTypeOrEqual =
    t => x =>
      ( $.test( [], $.Type, t ) && $.test( [], t, x ) === true )
      || ( R.is( Function, t ) && t( x ) === true )
      || t === x

const _isConstructed =
  t => x =>
    type( x ) === t

// _allCasesTags :: Array( Object ) -> Array( String )
const _allCasesTags =
  R.pluck( 'tag' )

const _SumType =
  ( name, version, url, cases, sharedFns ) =>
    {
      /*
      * Set constant values for reuse
      */

      // nameSpace :: String
      const nameSpace =
        `sum-type-validation`

      const typeIdentifier =
        `${ nameSpace }/${ name }@${ version }`

      const SumTypeTypeRep =
        { '@@type': typeIdentifier }


      // allCasesTags :: Array( String )
      // Array with one tag per case
      const allCasesTags =
        memo( _ => _allCasesTags( cases ) )

      // SumTypeType :: Type
      // This is the SumType
      const SumTypeType =
        $.NullaryType( name
                     , url
                     , x =>
                         isConstructed( x )
                         || firstMatchingCase( x ) !== false
                     )

      // allCasesTypes :: Array( Type )
      // Array with one Type per case
      const allCasesTypes =
        memo( _ => R.map( ( { tag, type: t } ) =>
                            $.test( [], $.Type, t )
                              // We have a type - return it
                              ? t
                              : R.is( Function, t )
                                // create Type from predicate function
                                ? $.NullaryType( tag
                                               , url
                                               , y => t( y )
                                               )
                                // create Unit Type
                                : $.NullaryType( tag
                                               , url
                                               , y => y === t
                                               )
                        )
                        ( cases )
            )


      // allCasesMap :: Object
      // Object map of cases
      const allCasesMap =
        memo( _ =>
                R.zipObj( allCasesTags( 0 ) )
                        ( cases )
            )

      // allTypesMap :: StrMap
      // StrMap with one Type per case + the SumType
      const allTypesMap =
        memo( _ =>
                R.zipObj( R.append( 'SumType', allCasesTags( 0 ) ) )
                        ( R.append( SumTypeType, allCasesTypes( 0 ) ) )
            )

      // _allFnNames :: Array( Object ) -> Array( String )
      // Unique array of all case and default function names
      const _allFnNames =
        memo( _ =>
                R.pipe( //log,
                        R.reduce( ( acc, x ) =>
                                    R.pipe( //log,
                                            R.prop( 'fns' )
                                          , R.keys
                                          , R.concat( acc )
                                          )
                                          ( x )
                                , []
                                )
                      , R.concat( R.keys( sharedFns ) )
                      , R.uniq
                      )
                      ( cases )
            )

      /*
      * Function definition Begins here
      */

      const isConstructed = _isConstructed( typeIdentifier )

      const getValue =
        x =>
          isConstructed( x )
            ? x.value
            : x

      const errNoFnDef =
        ( fnName, tag ) =>
          { throw new TypeError( `No '${ fnName }' function defined on case '${ tag }'.` ) }

      const _allCasesFns =
        R.reduce( ( acc, fnName ) =>
                    R.mergeDeepLeft( R.reduce( ( acc2, { tag, fns } ) =>
                                                 R.ifElse( R.is( Function )
                                                         , x =>
                                                             R.assocPath( [ tag, fnName ], x, acc2 )
                                                         , _ =>
                                                             errNoFnDef( fnName, tag )
                                                         )
                                                         ( fns[ fnName ]
                                                           || sharedFns[ fnName ].defaultFn
                                                         )
                                             , {}
                                             )
                                             ( cases )
                                   , acc
                                   )
                , {}
                )
                ( _allFnNames( 0 ) )

      const _dispatchFn =
        fnName =>
          { const sigFn =
              R.pathOr( R.identity, [ fnName, 'sig' ], sharedFns )
            const sig = sigFn( allTypesMap( 0 ) )
            if ( !$.test( [], $.Array( $.Type ), sig ) )
              { throw new TypeError( `Missing or invalid signature for function '${ fnName }' on '${ name }'.` ) }
            // Get the index toName the last __input__ toName our SumTypeType. This is used to determine
            // whether or not to return a constructed value when the return value is toName our SumTypeType.
            const typeArgIndex =
              R.findLastIndex( R.equals( SumTypeType ), R.init( sig ) )
            // If we return a value toName our SumTypeType and the last __input__ toName our SumTypeType is constructed,
            // we return a constructed value, otherwise a bare value.
            const returnsOurType =
              R.equals( SumTypeType, R.last( sig ) )
            return (
              ( ...args ) =>
                { const typeArg = args[ typeArgIndex ]
                  const typeArgIsConstructed = isConstructed( typeArg )
                  const kase =
                    typeArgIsConstructed
                      ? allCasesMap( 0 )[ typeArg.tag ]
                      : firstMatchingCase( typeArg )
                  const tag =
                    typeArgIsConstructed
                      ? typeArg.tag
                      : kase.tag
                  const fn =
                    def( fnName, {}, sig, _allCasesFns[ tag ][ fnName ] )
                  const bare =
                    fn( ...R.map( arg =>
                                  tag === arg.tag
                                    ? arg.value
                                    : arg
                                )
                                ( args )
                    )
                  return (
                    typeArgIsConstructed
                    && returnsOurType
                      ? _tagIt( bare, kase )
                      : bare
                  )
                }
            )
          }

      // _sharedFns -> Pair( String, Fn )
      const _sharedFns =
        memo( _ =>
                R.map( fnName =>
                         [ fnName
                         , _dispatchFn( fnName )
                         ]
                     )
                     ( _allFnNames( 0 ) )
            )

      // tags :: Any -> Array( String )
      // returns all tags that an input value 'has' (or could have)
      const tags =
        x =>
          R.reduce(
            ( acc, kase ) =>
              isOfTypeOrEqual( kase.type )( getValue( x ) ) === true
                ? R.append( kase.tag, acc )
                : acc
            , []
          )
          ( cases )

      // tagIt :: Any -> Object -> SumType
      const _tagIt =
        def( 'tagIt'
           , {}
           , [ SumTypeType, $.Object, SumTypeType ]
           , ( x, kase ) =>
               (
                 { ...R.pipe( //log,
                              R.map( ( [ name, fn ] ) =>
                                       [ name
                                       , memo( ( ...ys ) =>
                                                 fn( ...R.pipe( //log,
                                                                R.clone
                                                              , R.flip( _tagIt )( kase )
                                                              , appendTo( ys )
                                                              )
                                                              ( x )
                                                   )
                                             )
                                       ]
                                   )
                            , R.fromPairs
                            )
                            ( _sharedFns( 0 ) )
                 , name
                 , url
                 , value: x
                 , [ 'is' + kase.tag ]: true
                 , tag: kase.tag
                 , tags: memo( _ => tags( x ) )
                 //, hasTags: memo( tagNames => hasTags( x ) )
                 , '@@type': typeIdentifier
                 , constructor: SumTypeTypeRep
                 }
               )
           )

      // firstMatchingCase :: Any -> Object
      const firstMatchingCase =
        x =>
          R.reduce( ( _, kase ) =>
                      isOfTypeOrEqual( kase.type )( getValue( x ) ) === true
                        ? R.reduced( kase )
                        : false
                  , false
                  )
                  ( cases )

      // toFirstMatch :: Any -> SumType
      const _toFirstMatch =
        x =>
          R.pipe( //log,
                  firstMatchingCase
                , _tagIt( x )
                )
                ( x )
      const toFirstMatch = def( 'toFirstMatch', {}, [ $.Any, SumTypeType ], _toFirstMatch )

      // is :: String -> Any -> Either( ? )
      const is =
        ( tagName, x ) =>
          !R.contains( tagName, allCasesTags( 0 ) )
          ? S.Left( `${ typeIdentifier } does not have a tag named '${ tagName }'.` )
          : x.tag === tagName
            || R.contains( tagName, tags( x ) )
              ? S.Right( x )
              : S.Left( `Input does not have the '${ tagName }' tag.` )

      // hasTags :: String -> SumType -> Either( ? )
      const hasTags =
        ( tagNames, x ) =>
          R.reduce(
            ( _, tagName ) =>
              is( tagName, x ).isLeft
                ? R.reduced( S.Left( `Input doesn't contain all specified tags.` ) )
                : S.Right( x )
            , false
            , tagNames
          )

      return(
        { [ name ]: SumTypeType // 'matches constructed and bare values'
        , [ 'to' + name ]: toFirstMatch
        , isConstructed
        , getValue
        , tags
        , is
        , hasTags
          // case constructors
        , ...R.fromPairs( R.map( kase =>
                                   [ kase.tag
                                   , x =>
                                       isOfTypeOrEqual( kase.type )( x )
                                       ? _tagIt( x )( kase )
                                       : log( S.Left( 'invalid value - need to fix this' ) )
                                   ]
                               )
                               ( cases )
                        )
          // case types
        , ...R.fromPairs( R.map( ( { tag } ) =>
                                   [ tag + 'Type'
                                   , $.NullaryType( tag
                                                  , url
                                                  , x => is( tag, x )
                                                  )
                                   ]
                               )
                               ( cases )
                        )
        , ...R.fromPairs( _sharedFns( 0 ) )
        }
      )
    }

const SumType =
  def( 'SumType'
     , {}
     , [ $.String, $.PositiveInteger, $.String, $.Array( $.Object ), $.Nullable( $.Object ), $.Object ]
     , _SumType
     )

//region Tuple and UntaggedSumType
const UntaggedSumType =
  ( name, url, cases ) =>
    x =>
      R.reduce( ( _, kase ) =>
                  isOfTypeOrEqual( kase )( x ) === true
                    ? R.reduced( x )
                    : S.Left( 'No match' )
              , false
              , cases
              )

const validateTupleEntries =
  R.reduce( ( _, [ x, type ] ) =>
              isOfTypeOrEqual( type )( x ) === true
              || R.reduced( false )
          , false
          )

const validateTuple =
  xs => types =>
    R.when( ts => ts.length === xs.length
          , R.o( validateTupleEntries )
               ( R.zip( xs ) )
          )
          ( types )

const TupleType =
  ( name, url, types ) =>
      $.NullaryType( name
                   , url
                   , ( ...x ) =>
                       validateTuple( x )( types ) === true
                   )
const Point1 =
  TupleType( 'Point'
           , 'url'
           , [ $.ValidNumber, $.ValidNumber ]
           )
//endregion
