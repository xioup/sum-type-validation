import * as R   from "ramda"
import { env }  from "sanctuary"
import $        from "sanctuary-def"
import type     from "sanctuary-type-identifiers"

//const S = createSumTypeFactory( { checkTypes: true, env } )

const log = R.tap( console.log )

const memo = R.memoize
const mergeDL = R.mergeDeepLeft
const nTest = $.test( [] )
const o = f => g => h => f( g( h ) )
const containedBy = R.flip( R.contains )


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

    // _allCasesTags :: Array( String )
    // Array with one _tag per case
    const _allCasesTags =
      R.pluck( 'tag' )( cases )

    // _allCasesTypes :: Array( Type )
    // Array with one Type per case
    const _allCasesTypes =
      R.map( ( { tag, type: t } ) =>
               $.NullaryType( `${ nameSpace }/${ name }.${ tag }`
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
           ( cases )

    // _allCasesMap :: StrMap( Case )
    // Object map of cases
    const _allCasesMap =
      R.zipObj( _allCasesTags )( cases )

    // _allTypesMap :: StrMap( Type )
    // StrMap with one Type per case + the SumType
    const _allTypesMap =
      R.zipObj( R.concat( [ 'ST', 'PT' ]
                        , _allCasesTags
                        )
              )
              ( R.concat( [ SumTypeType, PlaceholderType ]
                        , _allCasesTypes
                        )
              )

    // _allTypes :: Array( Type )
    // Array with one Type per case + the SumType & Placeholder
    const _allTypes =
      R.values( _allTypesMap )

    // _allFnNames :: Array( Case ) -> Array( String )
    // Unique array of all case and default function names
    const _allFnNames =
      R.pipe( R.pluck( 'fns' )
            , R.ap( [ R.keys ] )
            , R.flatten
            , R.uniq
            )
            ( cases )

    const _throwMissingFunctionErr =
      ( fnName, tag ) =>
        { throw new TypeError( `No '${ fnName }' function defined on case '${ tag }'.` ) }

    // _allCasesFns :: Array( Case ) -> Array( Fn )
    const _allCasesFns =
      R.reduce( ( acc, fnName ) =>
                mergeDL( R.reduce( ( acc2, { tag, fns } ) =>
                                     R.ifElse( R.is( Function )
                                     , x =>
                                         R.assocPath( [ tag, fnName ], x, acc2 )
                                     , _ =>
                                         _throwMissingFunctionErr( fnName, tag )
                                     )
                                     ( fns[ fnName ] )
                                 )
                                 ( {} )
                                 ( cases )
                       )
                       ( acc )
            )
            ( {} )
            ( _allFnNames )

    /*
    * Function definition Begins here
    */

    const _dispatchFn =
      fnName =>
        { const sigFn = R.prop( fnName, fnSigs )
          const sig = sigFn( _allTypesMap )
          if ( !nTest( $.Array( $.Type ), sig ) )
            { throw new TypeError( `Missing or invalid signature for function '${ fnName }' on '${ name }'.` ) }
          // Get the index of the last __input__ that is of our SumTypeType. This is used to determine
          // whether or not to return a constructed value when the return value is toName our SumTypeType.
          const typeArgIndex =
            R.findLastIndex( containedBy( _allTypes ), R.init( sig ) )
          // If we return a value of our SumTypeType and the last __input__ of our SumTypeType is constructed,
          // we return a constructed value, otherwise a bare value.
          const returnsOurType =
            R.contains( R.last( sig ), _allTypes )
          return (
            R.curryN( _staticMethodArity( fnName )
            , ( ...args ) =>
               { const x = args[ typeArgIndex ]
                 const kase = _firstMatchingCase( x )
                 const typeArgIsConstructed =
                   type( x ) === typeIdentifier
                 const tag =
                   typeArgIsConstructed
                     ? x.tag
                     : kase.tag
                 const fn =
                   checkTypes
                     ? def( fnName )
                          ( {} )
                          ( R.map( R.when( R.equals( PlaceholderType ) )
                                         ( _ => _allTypesMap[ tag ] )
                                 )
                                 ( sig )
                          )
                          ( R.path( [ tag, fnName ] )
                                  ( _allCasesFns )
                          )
                     : R.path( [ tag, fnName ] )
                             ( _allCasesFns )
                 const bareRes =
                   fn( ...R.map( _value )( args ) )
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
      fnName =>
        { const sigFn = R.prop( fnName, fnSigs )
          const sig = sigFn( _allTypesMap )
          return sig.length - 1
        }

    const _instanceMethodArity =
      fnName =>
        { const sigFn = R.prop( fnName, fnSigs )
          const sig = sigFn( _allTypesMap )
          return sig.length - 2
        }

    // _sharedFns :: Array( Case ) -> Pair( String, Fn )
    const _sharedFns =
      R.map( R.converge( ( ...xs ) => xs )
                       ( [ x => x, _dispatchFn, _instanceMethodArity ] )
           )
           ( _allFnNames )

    const _value =
      R.ifElse( x => type( x ) === typeIdentifier )
              ( x => x.value )
              ( x => x )

    // tags :: Any -> Array( String )
    // returns all tags that an input value 'has' (or could have)
    const tags =
      x =>
        R.reduce( ( acc, { tag } ) =>
                  ( type( x ) === typeIdentifier && x[ 'is' + tag ] )
                  || nTest( _allTypesMap[ tag ], x )
                    ? R.append( tag, acc )
                    : acc
                )
                ( [] )
                ( cases )

    // This lets us memoize calls to the tags 'instance' method
    const _dispatchTags =
      R.ifElse( x => type( x ) === typeIdentifier )
              ( x => x.tags() )
              ( tags )

    // tagIt :: Any -> Case -> SumType
    const _tagIt =
      ( x, { tag } ) =>
        { let r = {}
          const tmp =
            { name
            , url
            , '@@type':    typeIdentifier
            , constructor: SumTypeTypeRep
            , value:       Object.assign( {}, x )
            , tag
            , tags:        R.once( _ => tags( r ) )
            , is:          memo( tag => is( tag, r ) )
            , hasTags:     memo( tagNames => hasTags( tagNames, r ) )
            , [ 'is' + tag ]: true
            }

          // TODO: Can this be sped up?
          // Mutation ahead!
          _sharedFns.forEach(
            ( [ name, fn, arity ] ) =>
              arity < 2
                ? r[ name ] = memo( ( ...ys ) => fn( ...R.append( r, ys ) ) )
                : r[ name ] =
                    R.curryN( arity
                            , memo( ( ...ys ) => fn( ...R.append( r, ys ) ) )
                            )
          )
          return Object.assign( r, tmp )
        }
    const tagIt = def( 'tagIt', {}, [ SumTypeType, $.Object, SumTypeType ], _tagIt )

    // _firstMatchingCase :: Any -> Object
    const _firstMatchingCase =
      x =>
        type( x ) === typeIdentifier
          ? _allCasesMap[ x.tag ]
          : R.reduce( ( _, kase ) =>
                        nTest( _allTypesMap[ kase.tag ] )
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
      R.ifElse( x => type( x ) === typeIdentifier )
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
          ? ( type( x ) === typeIdentifier && x[ 'is' + tag ] )
            || nTest( _allTypesMap[ tag ], x )
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
      , ...R.pipe( R.converge( R.zip )
                             ( [ _allCasesTags, _allCasesTypes ] )
                 , R.map( ( [ tag, type ] ) => [ tag + 'Type', type ] )
                 , R.fromPairs
                 )
           // caseConstructors :: StrMap( Function )
      , ...R.fromPairs( R.map( R.converge( R.pair )
                                         ( [ R.prop( 'tag' ), _ => _toFirstMatch ] )
                             )
                             ( cases )
                      )
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


//region Tuple and UntaggedSumType
const isOfTypeOrEqual =
    t => x =>
      ( nTest( $.Type, t ) && nTest( t, x ) === true )
      || ( R.is( Function, t ) && t( x ) === true )
      || t === x

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
          , o( validateTupleEntries )
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
