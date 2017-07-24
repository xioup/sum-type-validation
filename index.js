import * as R          from "ramda"
import { create, env } from "sanctuary"
import $               from "sanctuary-def"

const S = create( { checkTypes: true, env } )
const def = $.create( { checkTypes: true, env } )

const log = R.tap( console.log )

const isOfTypeOrEqual =
    t => x =>
      ( $.test( [], $.Type, t ) && $.test( [], t, x ) === true )
      || ( R.is( Function, t ) && t( x ) === true )
      || t === x

const _SumType =
  ( name, url, cases, sharedFns ) =>
    {

      const hasMatchingCase =
        x =>
          R.reduce( ( _, { type } ) =>
                      isOfTypeOrEqual( type )( x ) === true
                        ? R.reduced( true )
                        : false
                 , false
                 , cases
                 )

      const isConstructed =
        S.allPass( [ //log,
                     S.pipe( [ //log,
                               S.get( S.equals( name ), '@@type' )
                             , log
                             , S.isJust
                             ]
                           )
                   , S.pipe( [ //log,
                               S.get( hasMatchingCase, 'value' )
                             , S.isJust
                             ]
                           )
                   ]
                 )

      const isConstructedNew =
        S.pipe( [ //log,
                  S.toMaybe
                , S.filterM( S.allPass( [ S.get( S.equals( name ), '@@type' )
                                        , S.get( hasMatchingCase, 'value' )
                                        ]
                                      )
                           )
                , log
                ]
              )

      const _type =
        $.NullaryType( name
                     , url
                     , S.anyPass( [ isConstructed
                                  , hasMatchingCase
                                  ]
                                )
                     )

      const getValue =
        x =>
          isConstructed( x )
            ? x.value
            : x

      const _allCasesFnsOrig =
        R.reduce( ( acc, { tag, fns } ) =>
                    R.assoc( tag, fns, acc )
                , {}
                )
                ( cases )

      const _allFnNames =
        R.pipe( R.reduce( ( acc, { tag, fns } ) =>
                    R.assoc( tag, fns, acc )
                , {}
                )
              , R.keys
              , R.reduce( ( acc, x ) =>
                            R.concat( R.keys( _allCasesFnsOrig[ x ] )
                                    , acc
                                    )
                        , []
                        )
              , R.concat( R.keys( sharedFns ) )
              , R.uniq
              )
              ( cases )

      const _assignFn =
        fnName =>
          R.reduce( ( acc, { tag, fns } ) =>
                      R.ifElse( R.is( Function )
                              , x =>
                                  R.assocPath( [ tag, fnName ], x, acc )
                              , _ =>
                                  { throw new TypeError( `No '${ fnName }' function defined on case '${ tag }' or default.` ) }
                              )
                              ( fns[ fnName ]
                                || sharedFns[ fnName ].defaultFn
                              )
                  , {}
                  )
                  ( cases )

      const _allCasesFns =
        R.reduce( ( acc, x ) =>
                    R.mergeDeepLeft( _assignFn( x ), acc )
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
                { const typeArg = R.prop( typeArgIndex, args )
                  const typeArgIsConstructed = isConstructed( typeArg )
                  const tag = R.prop( 'tag', _toName( typeArg ) )
                  const fn =
                    def( fnName, {}, sig, _allCasesFns[ tag ][ fnName ] )
                  const prepArgs =
                    arg =>
                      R.equals( tag, arg.tag )
                        ? arg.value
                        : arg
                  const bare = fn( ...R.map( prepArgs, args ) )
                  return (
                    typeArgIsConstructed
                    && returnsOurType
                      ? _toName( bare )
                      : bare
                  )
                }
            )
          }

      const _makeSharedFns =
        fnName =>
          [ fnName
          , _dispatchFn( fnName )
          ]

      const _sharedFns =
        _allFnNames.map( _makeSharedFns )

      const staticToInstance =
        x => ( [ name, fn ] ) =>
          [ name
          , ( ...z ) =>
              fn( ...R.append( _toName( x ), z ) )
          ]

      const _makeInstanceMethods =
        x =>
          R.pipe( //log,
                  R.map( staticToInstance( x ) )
                , R.fromPairs
                )
                ( _sharedFns )

      // returns all tags that an input value 'has' (or could have)
      const allTags =
        x =>
          R.is( Array, x.allTags )
          ? x.allTags
          : R.reduce(
              ( acc, kase ) =>
                isOfTypeOrEqual( kase.type )( getValue( x ) ) === true
                  ? R.append( kase.tag, acc )
                  : acc
              , []
              , cases
            )

      const _tagIt =
        def( 'tagIt'
           , {}
           , [ $.Object, _type, _type ]
           , ( kase, x ) =>
               { const r =
                   { ..._makeInstanceMethods( x )
                   , name
                   , url
                   , value: R.clone( x )
                   , [ 'is' + kase.tag ]: true
                   , tag: kase.tag
                   , allTags: allTags( x )
                   , '@@type': name
                   }
                 r.constructor = name
                 return r
               }
           )

      const _toName =
        x =>
          R.reduce( ( _, kase ) =>
                      { const value = getValue( x )
                        return(
                          isOfTypeOrEqual( kase.type )( value ) === true
                            ? R.reduced( _tagIt( kase )( value ) )
                            : false
                        )
                      }
                  , false
                  , cases
                  )
      const toName = def( 'toName', {}, [ $.Any, _type ], _toName )

      const allCaseTags =
        R.pluck( 'tag', cases )

      const is =
        ( tagName, x ) =>
          !R.contains( tagName, allCaseTags )
          ? S.Left( `Sum Type '${ name }' does not have a tag named '${ tagName }'.` )
          : x.tag === tagName
            || R.contains( tagName, allTags( x ) )
              ? S.Right( x )
              : S.Left( `Input does not have the '${ tagName }' tag.` )

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

      const _makeCaseConstructors =
        kase =>
          typeof kase.valueConstructor !== 'undefined'
            ? [ kase.tag
              , kase.valueConstructor
              ]
            : [ kase.tag
              , x =>
                  isOfTypeOrEqual( kase.type )( x )
                  ? _tagIt( kase )( x )
                  : log( S.Left( 'invalid value - need to fix this in _makeCaseConstructors' ) )
              ]

      const _makeCaseTypes =
        kase =>
          [ kase.tag + 'Type'
          , $.NullaryType( kase.tag
                         , url
                         , x => is( kase.tag, x )
                         )
          ]

      const r =
        { [ name ]: _type // 'matches constructed and bare values'
        , [ 'to' + name ]: toName
        , isConstructed
        , getValue
        , allTags
        , is
        , hasTags
        , ...R.fromPairs( cases.map( _makeCaseConstructors ) )
        , ...R.fromPairs( cases.map( _makeCaseTypes ) )
        , ...R.fromPairs( _sharedFns )
        }
      r.constructor = 'SumType'

      return r
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
                  isOfTypeOrEqual( x )( kase ) === true
                    ? R.reduced( x )
                    : S.Left( 'No match' )
              , false
              , cases
              )

const validateTupleEntries =
  R.reduce( ( _, [ x, type ] ) =>
              isOfTypeOrEqual( x )( type ) === true
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
//endregion
