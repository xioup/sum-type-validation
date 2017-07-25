import * as R          from "ramda"
import { create, env } from "sanctuary"
import $               from "sanctuary-def"

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
  name => x =>
    x[ '@@type' ] === name

// _allCasesTags :: Array( Object ) -> Array( String )
const _allCasesTags =
  R.pluck( 'tag' )

const _SumType =
  ( name, url, cases, sharedFns ) =>
    {
      /*
      * Set constant values for reuse
      */

      // allCasesTags :: Array( String )
      // Array with one tag per case
      const allCasesTags =
        _allCasesTags( cases )

      // allCasesTypes :: Array( Type )
      // Array with one Type per case
      const allCasesTypes =
        R.map( ( { tag, type } ) =>
                 $.test( [], $.Type, type )
                   // We have a type - return it
                   ? type
                   : R.is( Function, type )
                     // create Type from predicate function
                     ? $.NullaryType( tag
                                    , url
                                    , y => type( y )
                                    )
                     // create Unit Type
                     : $.NullaryType( tag
                                    , url
                                    , y => y === type
                                    )
             )
             ( cases )

      // allCasesTypesMap :: StrMap
      // StrMap with one Type per case
      const allCasesTypesMap =
        R.zipObj( allCasesTags, allCasesTypes )

      // _type :: Type
      // This is the SumType
      const _type =
        $.NullaryType( name
                     , url
                     , x =>
                         isConstructed( x )
                         || firstMatchingCase( x ) !== false
                     )

      // _allFnNames :: Array( Object ) -> Array( String )
      // Unique array of all case and default function names
      const _allFnNames =
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

      /*
      * Function definition Begins here
      */

      const isConstructed = _isConstructed( name )

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
                ( _allFnNames )

      const _dispatchFn =
        fnName =>
          { const sig =
              R.pathOr( R.identity, [ fnName, 'sig' ], sharedFns )( _type )
            if ( !$.test( [], $.Array( $.Type ), sig ) )
              { throw new TypeError( `Missing or invalid signature for function '${ fnName }' on '${ name }'.` ) }
            // Get the index toName the last __input__ toName our _type. This is used to determine
            // whether or not to return a constructed value when the return value is toName our _type.
            const typeArgIndex =
              R.findLastIndex( R.equals( _type ), R.init( sig ) )
            // If we return a value toName our _type and the last __input__ toName our _type is constructed,
            // we return a constructed value, otherwise a bare value.
            const returnsOurType =
              R.equals( _type, R.last( sig ) )
            return (
              ( ...args ) =>
                { const typeArg = args[ typeArgIndex ]
                  const typeArgIsConstructed = isConstructed( typeArg )
                  const tag =
                    typeArgIsConstructed
                      ? typeArg.tag
                      : firstMatchingTag( typeArg )
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
                      ? _toFirstMatch( bare )
                      : bare
                  )
                }
            )
          }

      // _sharedFns -> Pair( String, Fn )
      const _sharedFns =
        R.map( fnName =>
                 [ fnName
                 , _dispatchFn( fnName )
                 ]
             )
             ( _allFnNames )

      // allTags :: Any -> Array( String )
      // returns all tags that an input value 'has' (or could have)
      const allTags =
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
           , [ _type, $.Object, _type ]
           , ( x, kase ) =>
               (
                 { ...R.pipe( //log,
                              R.map( ( [ name, fn ] ) =>
                                       [ name
                                       , memo( ( ...ys ) =>
                                                 fn( ...R.pipe( //log,
                                                                R.clone
                                                              , _toFirstMatch
                                                              , appendTo( ys )
                                                              )
                                                              ( x )
                                                   )
                                             )
                                       ]
                                   )
                            , R.fromPairs
                            )
                            ( _sharedFns )
                 , name
                 , url
                 , value: x
                 , [ 'is' + kase.tag ]: true
                 , tag: kase.tag
                 , allTags: memo( _ => allTags( x ) )
                 //, hasTags: memo( tagNames => hasTags( x ) )
                 , '@@type': name
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

      // firstMatchingTag :: Any -> String
      const firstMatchingTag =
        R.pipe( //log,
                firstMatchingCase
              , R.prop( 'tag' )
              )

      // toFirstMatch :: Any -> SumType
      const _toFirstMatch =
        x =>
          R.pipe( //log,
                  firstMatchingCase
                , _tagIt( x )
                )
                ( x )
      const toFirstMatch = def( 'toFirstMatch', {}, [ $.Any, _type ], _toFirstMatch )

      // is :: String -> Any -> Either( ? )
      const is =
        ( tagName, x ) =>
          !R.contains( tagName, allCasesTags )
          ? S.Left( `Sum Type '${ name }' does not have a tag named '${ tagName }'.` )
          : x.tag === tagName
            || R.contains( tagName, allTags( x ) )
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
        { [ name ]: _type // 'matches constructed and bare values'
        , [ 'to' + name ]: toFirstMatch
        , isConstructed
        , getValue
        , allTags
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
        , ...R.fromPairs( _sharedFns )
        }
      )
    }

const SumType =
  def( 'SumType'
     , {}
     , [ $.String, $.String, $.Array( $.Object ), $.Nullable( $.Object ), $.Object ]
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
