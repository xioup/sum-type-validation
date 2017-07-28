import * as R   from "ramda"
import * as R_  from "./ramda"
import { env }  from "sanctuary"
import $        from "sanctuary-def"
import type     from "sanctuary-type-identifiers"

//const S = createSumTypeFactory( { checkTypes: true, env } )

const log = R.tap( console.log )

const memo = R.memoize
const nTest = $.test( [] )
const o = f => g => h => f( g( h ) )
const contains_ = R.flip( R.contains )
const concat_ = R.flip( R.concat )
const W = f => x => f( x )( x )

export const createSumTypeFactory = opts => {
  const def = $.create( opts )

  const checkTypes = opts.checkTypes
  const env = opts.env

  // nameSpace :: String
  const nameSpace = `sum-type-validation`

  const _SumType = ( name, version, url, cases, fnSigs ) =>
  {
    /*
    * Set constant and "constant" values for reuse
    */

    const typeIdentifier = `${ nameSpace }/${ name }@${ version }`

    const SumTypeTypeRep = { '@@type': typeIdentifier }

    // SumTypeType :: Type
    const SumTypeType =
      $.NullaryType( `${ nameSpace }/${ name }.${ name }`
                   , url
                   , x =>
                       type( x ) === typeIdentifier
                       || _firstMatchingCase( x ) !== false
                   )

    // PlaceholderType :: Type
    const PlaceholderType =
      $.NullaryType( `${ nameSpace }/${ name }._PlaceholderType`
                   , url
                   , x => false
                   )

    // _allCasesMap :: StrMap( Case )
    // StrMap of cases
    const _allCasesMap =
      W( o( R.zipObj )
          ( R.pluck( 'tag' ) )
       )
       ( cases )

    // _allCasesTags :: Array( String )
    // Array with one _tag per case
    const _allCasesTags =
      R.keys( _allCasesMap )

    // _allCasesTypesMap :: Array( Type )
    // StrMap with one Type per case
    const _allCasesTypesMap =
      R.reduce( ( acc, { tag, type: t } ) =>
                  R.assoc( tag )
                         ( $.NullaryType( `${ nameSpace }/${ name }.${ tag }`
                                        , url
                                        , nTest( $.Type, t )
                                            // We have a type - wrap and return it
                                            ? x =>
                                                type( x ) === typeIdentifier
                                                  ? nTest( t, x.value )
                                                 : nTest( t, x )
                                            : R.is( Function, t )
                                              // createSumTypeFactory Type from predicate function
                                              ? x =>
                                                 type( x ) === typeIdentifier
                                                    ? t( x.value )
                                                   : t( x )
                                              // createSumTypeFactory Unit Type
                                              : x =>
                                                  type( x ) === typeIdentifier
                                                    ? t === x.value
                                                    : t === x
                                        )
                         )
                         ( acc )
           )
           ( {} )
           ( cases )

    // _allTypesMap :: StrMap( Type )
    // StrMap with one Type per case + the SumType & Placeholder
    const _allTypesMap =
      R.merge( _allCasesTypesMap )
             ( { ST: SumTypeType
               , PT: PlaceholderType
               }
             )

    // _allFnNames :: Array( Case ) -> Array( String )
    // Unique array of all function names
    const _allFnNames =
      R_.p( [ R.pluck( 'fns' )
            , R.map( R.keys )
            , R.values
            , R.flatten
            , R.uniq
            ]
          )
          ( _allCasesMap )

    /*
    * Function definition Begins here
    */

    const isConstructed =
        x => type( x ) === typeIdentifier

    const _throwMissingFunctionErr =
      ( fnName, tag ) =>
        { throw new TypeError( `No '${ fnName }' function defined on case '${ tag }'.` ) }

    const _dispatchMap =
      ( fnName, sig ) =>
        R.fromPairs(
          R.map( tag =>
                   { const fn =
                       R.path( [ tag, 'fns', fnName ] )
                             ( _allCasesMap )
                     return(
                       R.is( Function, fn )
                         ? [ tag
                           , def( fnName )
                                ( {} )
                                ( R.map( R.when( R.equals( PlaceholderType ) )
                                               ( _ => _allCasesTypesMap[ tag ] )
                                       )
                                       ( sig )
                                )
                                ( fn )
                           ]
                         : _throwMissingFunctionErr( fnName, tag )
                     )
                   }
               )
               ( _allCasesTags )
        )

    const _throwMissingSignatureErr =
      ( fnName, name ) =>
        { throw new TypeError( `Missing or invalid signature for function '${ fnName }' on '${ name }'.` ) }

    const _dispatchFn =
      fnName =>
        { const sigFn = R.prop( fnName, fnSigs )
          const sig = sigFn( _allTypesMap )
          if ( !nTest( $.Array( $.Type ), sig ) )
            _throwMissingSignatureErr( fnName, name )
          // Get the index of the last __input__ that is of our SumType. This is used to determine
          // whether or not to return a constructed value when the return value is toName our SumTypeType.
          const typeArgIndex =
            R.findLastIndex( contains_( R.values( _allTypesMap ) ), R.init( sig ) )
          // If we return a value of our SumType and the last __input__ of our SumType is constructed,
          // we return a constructed value, otherwise a bare value.
          const returnsOurType =
            R.contains( R.last( sig ), R.values( _allTypesMap ) )
          const dispatchMap =
            _dispatchMap( fnName, sig )

          return (
            R.curryN( _staticMethodArity( fnName ) )
                    ( ( ...args ) =>
                       { const x = args[ typeArgIndex ]
                         const kase = _firstMatchingCase( x )
                         const typeArgIsConstructed =
                           isConstructed( x )
                         const tag =
                           typeArgIsConstructed
                             ? x.tag
                             : kase.tag
                         const bareRes =
                           dispatchMap[ tag ]( ...R.map( _value )( args ) )
                         return(
                           typeArgIsConstructed && returnsOurType
                             ? tagIt( bareRes, kase )
                             : bareRes
                         )
                       }
                    )
          )
        }

    const _staticMethodArity =
      fnName => R.prop( fnName, fnSigs )( _allTypesMap ).length - 1

    const _instanceMethodArity =
      fnName => _staticMethodArity( fnName ) - 1

    // _sharedFns :: Tuple( String, Fn, $.NonNegativeInteger )
    const _sharedFns =
      R.map( o( R.ap( [ x => x, _dispatchFn, _instanceMethodArity ] ) )
              ( R.of )
           )
           ( _allFnNames )

    const _value =
      R.ifElse( isConstructed )
              ( x => x.value )
              ( x => x )

    // tags :: Any -> Array( String )
    // returns all tags that an input value 'has' (or could have)
    const tags =
      x =>
        R.reduce( ( acc, { tag } ) =>
                  ( isConstructed( x ) && x[ 'is' + tag ] )
                  || nTest( _allCasesTypesMap[ tag ], x )
                    ? R.append( tag, acc )
                    : acc
                )
                ( [] )
                ( cases )

    // This lets us memoize calls to the tags 'instance' method
    const _dispatchTags =
      R.ifElse( isConstructed )
              ( x => x.tags() )
              ( tags )

    // tagIt :: Any -> Case -> SumType
    const _tagIt =
      ( x, { tag } ) =>
        { const value =
            checkTypes && R.is( Object )
              ? Object.freeze( Object.assign( {}, x ) )
              : x
          const r =
            { name
            , url
            , value
            , tag
            , '@@type':       typeIdentifier
            , constructor:    SumTypeTypeRep
            , tags:           R.once( _ => tags( r ) )
            , is:             memo( tag => is( tag, r ) )
            , hasTags:        memo( tagNames => hasTags( tagNames, r ) )
            , [ 'is' + tag ]: true
            }

          // TODO: Can this be sped up?
          // Mutation ahead!
          _sharedFns.forEach(
            ( [ name, fn, arity ] ) =>
              r[ name ] =
                arity < 2
                  ? memo( ( ...ys ) => fn( ...R.append( r, ys ) ) )
                  : R.curryN( arity
                            , memo( ( ...ys ) => fn( ...R.append( r, ys ) ) )
                            )
          )
          return r
        }
    const tagIt = def( 'tagIt', {}, [ SumTypeType, $.Object, SumTypeType ], _tagIt )

    // _firstMatchingCase :: Any -> Object
    const _firstMatchingCase =
      x =>
        isConstructed( x )
          ? _allCasesMap[ x.tag ]
          : R.reduce( ( _, kase ) =>
                        nTest( _allCasesTypesMap[ kase.tag ] )
                             ( x )
                           ? R.reduced( kase )
                           : false
                   )
                   ( false )
                   ( cases )

    // toFirstMatch :: Any -> SumType
    const _toFirstMatch =
      R.converge( tagIt )
                ( [ x => x, _firstMatchingCase ] )

    // _getTag :: Any -> string
    const _getTag =
      R.ifElse( isConstructed )
              ( x => x.tag )
              ( o( R.prop( 'tag' ) )
                 ( _firstMatchingCase )
              )

    const _throwInvalidTagErr =
      ( tag, name ) =>
        { throw new TypeError( `Invalid tag '${ tag }' provided for sum type '${ name }'.` ) }

    // is :: String -> Any -> Either( ? )
    const is =
      ( tag, x ) =>
        R.contains( tag, _allCasesTags )
          ? ( isConstructed( x ) && x[ 'is' + tag ] )
            || nTest( _allCasesTypesMap[ tag ], x )
          : _throwInvalidTagErr( tag, name )

    // hasTags :: String -> SumType -> Either( ? )
    const hasTags =
      ( tags, x ) =>
        R.reduce( ( _, tag ) =>
                    is( tag, x )
                      ? true
                      : R.reduced( false )
                )
                ( false )
                ( tags )

    return(
      { [ name + 'Type' ]: SumTypeType
      , [ name ]: def( 'toFirstMatch', {}, [ $.Any, SumTypeType ], _toFirstMatch )
      , value: _value
      , tag: def( 'getTag', {}, [ $.Any, $.String ], _getTag )
      , tags: _dispatchTags
      , is
      , hasTags
           // caseFns :: StrMap( Function )
      , ...R.fromPairs( _sharedFns )
           // caseTypes :: StrMap( Type )
      , ...R_.p( [ R.toPairs
                 , R.map( R.over( R.lensIndex( 0 )
                                , concat_( 'Type' )
                                )
                        )
                 , R.fromPairs
                 ]
               )
               ( _allCasesTypesMap )
           // caseConstructors :: StrMap( Function )
      , ...R.map( _ => _toFirstMatch )
                ( _allCasesMap )
      }
    )
  }

  return (
    def( 'SumType'
       , {}
       , [ $.String, $.PositiveInteger, $.String, $.Array( $.Object ), $.Nullable( $.Object ), $.Object ]
       , _SumType
       )
  )
}

// example:
// import { env }  from "sanctuary"
// import { createSumTypeFactory  }  from './union-type'
// const SumType = createSumTypeFactory( { checkTypes: true, env } )
