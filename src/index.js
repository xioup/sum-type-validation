import R        from "./R"
import $        from "sanctuary-def"
import type     from "sanctuary-type-identifiers"

const log = R.tap( console.log )
log( `using log so eslint doesn't complain` )

const memo = R.memoize
const nTest = $.test( [] )
const nType = $.NullaryType
const o = f => g => h => f( g( h ) )
const contains_ = R.flip( R.contains )
//const concat_ = R.flip( R.concat )
const W = f => x => f( x )( x )
const pipe =
  fns => x =>
    fns.reduce( ( acc, fn ) => fn( acc ), x )
const reverse =
  xs => xs.slice().reverse()
const prop =
  p => x => x[ p ]
const toUnary =
  fn => x => fn( x )
const map =
  fn => xs => xs.map( toUnary( fn ) )
const ifte =
  ifFn => tFn => eFn => x =>
    ifFn( x )
      ? tFn( x )
      : eFn( x )
const when =
  ifFn => tFn => x =>
    ifFn( x )
      ? tFn( x )
      : x
//const unless =
//  ifFn => tFn => x =>
//    !ifFn( x )
//      ? tFn( x )
//      : x
const both =
  p1 => p2 => x => p1( x ) && p2( x )
//const isUndefined =
//  x => typeof x === 'undefined'
const isDefined =
  x => typeof x !== 'undefined'
/*
const isNull =
  x => x === null
  */
const isNil =
  x => x == null
//const isNotNil =
//  x => x != null
const id =
  x => x
const keys =
  ifte( isNil )
      ( _ => [] )
      ( Object.keys )
const of =
  x => [ x ]
const append =
  x => ys => [ ...ys, x ]

export const createSumTypeFactory = options => {
  const def = $.create( options )

  const { checkTypes } = options

  // nameSpace :: String
  const nameSpace = `sum-type-validation`

  const _SumType = ( name, version, url, cases, fnSigs ) =>
  {
    const typeIdentifier = `${ nameSpace }/${ name }@${ version }`

    const SumTypeTypeRep = { '@@type': typeIdentifier }

    const isConstructed =
      o( R.equals( typeIdentifier ) )
       ( type )

    // _firstMatchingCase :: Any -> Object
    const _firstMatchingCase =
      kases => x =>
        isConstructed( x )
          ? _allCasesMap[ x.tag ]
          : R.find( kase =>
                      nTest( _allCasesTypesMap[ kase.tag ] )
                           ( x )
                   )
                   ( kases )

    // SumTypeType :: Type
    const SumTypeType =
      nType( `${ nameSpace }/${ name }` )
           ( url )
           ( o( isDefined )
              ( _firstMatchingCase( cases ) )
           )

    // PlaceholderType :: Type
    const PlaceholderType =
      nType( `${ nameSpace }/_PlaceholderType` )
           ( url )
           ( _ => false )

    // cases_ :: Array( Case )
    const cases_ = reverse( cases )

    // _allCasesMap :: StrMap( Case )
    const _allCasesMap =
      W( o( R.zipObj )
          ( R.pluck( 'tag' ) )
       )
       ( cases )

    // _allCasesTags :: Array( String )
    const _allCasesTags =
      keys( _allCasesMap )

    // _allCasesTypesMap :: StrMap( Type )
    const _allCasesTypesMap =
      R.reduce( ( acc, { tag, type: t } ) =>
                  R.assoc( tag )
                         ( nType( `${ nameSpace }/${ name }.${ tag }` )
                                ( url )
                                ( nTest( $.Type, t )
                                    ? x => nTest( t, _getValue( x ) ) // Type
                                    : R.is( Function, t )
                                      ? x => t( _getValue( x ) ) // Predicate
                                      : x => R.equals( t, _getValue( x ) ) // Unit
                                )
                         )
                         ( acc )
              )
              ( {} )
              ( cases )

    // _allTypesMap :: StrMap( Type )
    const _allTypesMap =
      R.merge( { __: PlaceholderType
               , ST: SumTypeType
               }
             )
             ( _allCasesTypesMap )

    // _allFnNames :: Array( String )
    const _allFnNames =
      pipe( [ R.pluck( 'fns' )
            , R.values
            , map( keys )
            , R.flatten
            , R.uniq
            ]
          )
          ( _allCasesMap )

    const _throwMissingFunctionErr =
      ( fnName, tag ) =>
        { throw new TypeError( `No '${ fnName }' function defined on case '${ tag }'.` ) }

    const _getFnDispatchMap =
      fnName => sig =>
        R.fromPairs(
          map( tag =>
                 { const fn =
                     R.path( [ tag, 'fns', fnName ] )
                           ( _allCasesMap )
                   return(
                     R.is( Function, fn )
                       ? checkTypes
                         // we're checking types - return defined function
                         ? [ tag
                           , def( `${ tag }.${ fnName }` )
                                ( {} )
                                ( map( when( R.equals( PlaceholderType ) )
                                           ( _ => _allCasesTypesMap[ tag ] )
                                     )
                                     ( sig )
                                )
                                ( fn )
                           ]
                         // we're not checking types, return the raw function
                         : [ tag, fn ]
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
        { const sigFn =
            prop( fnName )
                ( fnSigs )
          if ( typeof sigFn !== 'function' )
            _throwMissingSignatureErr( fnName, name )
          const sig = sigFn( _allTypesMap )
          if ( !nTest( $.Array( $.Type ), sig ) || sig.length < 2 )
            _throwMissingSignatureErr( fnName, name )
          // Get the index of the last __input__ that is of our SumType. This is used to determine
          // whether or not to return a constructed value when the return value is toName our SumTypeType.
          const typeArgIndex =
            R.findLastIndex( contains_( R.values( _allTypesMap ) ) )
                           ( R.init( sig ) )
          // If we return a value of our SumType and the last __input__ of our SumType is constructed,
          // we return a constructed value, otherwise a bare value.
          const outputType = R.last( sig )
          const outputIsPlaceholderType =
            R.equals( outputType )
                    ( PlaceholderType )
          const returnsOurType =
            R.contains( outputType )
                      ( R.values( _allTypesMap ) )
          const dispatchMap =
            _getFnDispatchMap( fnName )
                             ( sig )

          return (
            R.curryN( _staticFnArity( fnName ) )
                    ( ( ...args ) =>
                       { const x = args[ typeArgIndex ]
                         //INFERENCE
                         const kase =
                           _firstMatchingCase( cases )( x )
                         const bareRes =
                           dispatchMap[ kase.tag ]( ...map( _getValue )( args ) )
                         return(
                           returnsOurType && isConstructed( x )
                             ? outputIsPlaceholderType
                               ? st[ kase.tag ]( bareRes )
                               //INFERENCE
                               : _toFirstMatch( cases )( bareRes )
                             : bareRes
                         )
                       }
                    )
          )
        }

    // _fnSigLength :: String -> NonNegativeInteger
    const _fnSigLength =
      fnName =>
        prop( fnName )
            ( fnSigs )
            ( _allTypesMap ).length

    // _staticFnArity :: String -> NonNegativeInteger
    const _staticFnArity =
        fnName => _fnSigLength( fnName ) - 1

    // _instanceFnArity :: String -> NonNegativeInteger
    const _instanceFnArity =
        fnName => _fnSigLength( fnName ) - 2

    // _sharedFns :: Tuple( String, Fn, NonNegativeInteger )
    const _sharedFns =
      map( o( R.ap( [ id
                    , _dispatchFn
                    , _instanceFnArity
                    ]
                  )
            )
            ( of )
         )
         ( _allFnNames )

    const _getValue =
      ifte( isConstructed )
          ( x => x.value )
          ( id )

    // tags :: Any -> Array( String )
    // returns input's implicit tags
    const tags =
      x =>
        R.reduce( ( acc, { tag } ) =>
                  ( isConstructed( x ) && x[ 'is' + tag ] )
                  || nTest( _allCasesTypesMap[ tag ], x )
                    ? append( tag )( acc )
                    : acc
                )
                ( [] )
                ( cases )

    // This lets us memoize calls to the tags 'instance' method
    const _dispatchTags =
      ifte( isConstructed )
          ( x => x.tags( 0 ) )
          ( tags )

    // TODO need to throw own TypeError on non member input
    // _getTag :: Any -> string
    const _getTag =
      kases =>
        ifte( isConstructed )
            ( prop( 'tag' ) )
            ( o( ifte( both( R.is( Object ) )
                           ( x => R.is( String )( x.tag ) )
                     )
                     ( prop( 'tag' ) )
                     ( _ => null )
               )
               ( _firstMatchingCase( kases ) )
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

    // makeMember :: Any -> Case -> SumType
    const _makeMember =
      ( x, proto ) =>
        { const r = Object.create( proto )

          r.value =
            checkTypes && R.is( Object )
              ? Object.freeze( R.clone( x ) )
              : x

          r.tags    = memo( _ => tags( r ) )
          r.hasTags = memo( tagNames => hasTags( tagNames, r ) )
          r.is      = memo( tagName => is( tagName, r ) )

          // Mutation ahead!
          _sharedFns.forEach(
            ( [ name, fn, arity ] ) =>
              { r[ name ] =
                  arity < 2
                    ? ( ...ys ) => fn( ...append( r )( ys ) )
                    : R.curryN( arity
                              , ( ...ys ) => fn( ...append( r )( ys ) )
                              )
              }
          )

          return r
        }
    const makeMember = def( 'makeMember', {}, [ SumTypeType, $.Any, SumTypeType ], _makeMember )

    const constructors =
      ( n, kasesMap ) =>
      { const proto = { [ '@@type' ]: typeIdentifier }
        const TypeRep =
          def( n, {}, [ SumTypeType, SumTypeType ], x =>
        st[ _firstMatchingCase( cases )( x ).tag ]( x ) )
        TypeRep.prototype = proto
        TypeRep.Type = SumTypeType
        TypeRep.hasTags = def( 'hasTags', {}, [ $.Array( $.String ), $.Any, $.Boolean ], hasTags )
        TypeRep.is = $.test( [], SumTypeType )
        TypeRep.tag = def( 'getTag', {}, [ $.Any, $.Nullable( $.String ) ], _getTag( cases ) )
        TypeRep.tag_ = def( 'getTag_', {}, [ $.Any, $.Nullable( $.String ) ], _getTag( cases_ ) )
        TypeRep.tags = def( 'tags', {}, [ $.Any, $.Array( $.Nullable( $.String ) ) ], _dispatchTags )
        TypeRep.value = def( 'value', {}, [ SumTypeType, SumTypeType ], _getValue )

        _sharedFns.forEach(
          ( [ fnName, fn ] ) =>
            TypeRep[ fnName ] = fn
        )

        proto.constructor = SumTypeTypeRep

        Object.keys( kasesMap ).forEach(
          tagName =>
            {
              const tagProto = Object.create( proto )
              const tagType = _allCasesTypesMap[ tagName ]

              const memberProto =
                { name
                , url
                , tag:                tagName
                , '@@type':           typeIdentifier
                , constructor:        SumTypeTypeRep
                , [ 'is' + tagName ]: true
                }

              const tagConstructor =
                def( tagName
                   , {}
                   , [ tagType, tagType ]
                   , x =>
                       makeMember( _getValue( x ) )
                                 ( memberProto )
                   )

              const _is =
                  tagName => x => is( tagName, x )
              tagConstructor.is =
                def( `${ tagName }.is`, {}, [ $.Any, $.Boolean ], _is( tagName ) )
              tagConstructor.url = url
              tagConstructor.Type = tagType
              tagConstructor.prototype = tagProto
              TypeRep[ tagName ] = tagConstructor
            }
        )
        return TypeRep
      }

    const st = constructors( name, _allCasesMap )

    // toFirstMatch :: Any -> SumType
    const _toFirstMatch =
      kases => x =>
        st[ _firstMatchingCase( kases )( x ).tag ]( x )

    return st
  }

  return (
    def( 'SumType'
       , {}
       , [ $.String, $.PositiveInteger, $.String, $.Array( $.Object ), $.Nullable( $.Object ), $.AnyFunction ]
       , _SumType
       )
  )
}

// example:
// import { env }  from "sanctuary"
// import { createSumTypeFactory  }  from './union-type'
// const SumType = createSumTypeFactory( { checkTypes: true, env } )
