import { createSumTypeFactory } from "../src/index"
import R                        from "ramda"

const { env } = require( "sanctuary" )
const $ =       require( "sanctuary-def" )
const type =    require( "sanctuary-type-identifiers" )
const assert =  require( "assert" )

const log = R.tap( console.log )
const opts = { checkTypes:true, env }
const def = $.create( opts )
const o = f => g => h => f( g( h ) )

const SumType = createSumTypeFactory( opts )

describe( `createSumTypeFactory`
        , () =>
            describe( `()`
                    , () =>
                        it( `returns a function`
                          , () =>
                              assert( R.is( Function, createSumTypeFactory( opts ) ) )
                          )
                    )
        )

//region Definitions
const shapeName = `Shape`
const shapeVersion = 2
const shapeUrl = `url`
const nameSpace = `sum-type-validation`
const typeIdentifier = `${ nameSpace }/${ shapeName }@${ shapeVersion }`
const SumTypeTypeRep = { '@@type': typeIdentifier }

//    Point :: Type
const Point =
  $.Pair( $.ValidNumber, $.ValidNumber )

const move =
  ( [ dx, dy ], shape ) =>
    R.over( R.lensProp( `origin` )
          , ( [ x, y ] ) =>
              [ x + dx, y + dy ]
          , shape
          )
const move2 =
  ( dx, dy, shape ) =>
    R.over( R.lensProp( `origin` )
          , ( [ x, y ] ) =>
              [ x + dx, y + dy ]
          , shape
          )

const shapeDef =
  [ { tag: `Circle`
    , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
    , fns: { area: ( { radius } ) => Math.PI * radius * radius
           , move
           , move2
           , wrongType: _ => ( { origin: [ 0, 0 ], sides: [ 4, 5 ] } )
           }
    }
  , { tag: `Rect`
    , type: $.RecordType( { origin: Point, sides: Point } )
    , fns: { area: ( { sides : [ w, h ] } ) => w * h
           , move
           , move2
           , wrongType: _ => ( { origin: [ 0, 0 ], radius: 5 } )
           }
    }
  , { tag: `Square`
    , type: x =>
              $.test( [], $.RecordType( { origin: Point, sides: Point } ), x )
              && x.sides[ 0 ] === x.sides[ 1 ]
    , fns: { area: ( { sides : [ w, h ] } ) => w * h
           , move
           , move2
           , wrongType: _ => ( { origin: [ 0, 0 ], sides: [ 4, 5 ] } )
           }
    }
  , { tag: `SquareUnit5x5`
    , type: { origin: [ 0, 0 ], sides: [ 5, 5 ] }
    , fns: { area: ( { sides : [ w, h ] } ) => w * h
           , move
           , move2
           , wrongType: _ => ( { origin: [ 0, 0 ], sides: [ 4, 4 ] } )
           }
    }
  ]

const shapeSigsSameInputOutputType =
  { area:  ts => [ ts.__, $.ValidNumber ]
  , move:  ts => [ Point, ts.__, ts.__ ]
  , move2: ts => [ $.ValidNumber, $.ValidNumber, ts.__, ts.__ ]
  , wrongType: ts => [ ts.__, ts.__ ]
  }

const Shape = SumType( shapeName, shapeVersion, shapeUrl, shapeDef, shapeSigsSameInputOutputType )

// Test Output is Sum Type
const shapeDef2 =
  [ { tag: `Circle`
    , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
    , fns: { move3: move2
           , changeType: _ => ( { origin: [ 0, 0 ], sides: [ 4, 5 ] } )
           }
    }
  , { tag: `Rect`
    , type: $.RecordType( { origin: Point, sides: Point } )
    , fns: { move3: move2
           , changeType: _ => ( { origin: [ 0, 0 ], radius: 4 } )
           }
    }
  , { tag: `SquareUnit5x5`
    , type: { origin: [ 0, 0 ], sides: [ 5, 5 ] }
    , fns: { move3: move2
           , changeType: _ => ( { origin: [ 0, 0 ], sides: [ 4, 4 ] } )
           }
    }
  ]
const shapeSigsOutputIsSumType =
  { move3: ts => [ $.ValidNumber, $.ValidNumber, ts.ST, ts.ST ]
  , changeType: ts => [ ts.__, ts.ST ]
  }
const Shape2 = SumType( shapeName, shapeVersion, shapeUrl, shapeDef2, shapeSigsOutputIsSumType )

// Test Output is Explicit Type
const shapeDef3 =
  [ { tag: `Circle`
    , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
    , fns: { toCircle: x => x }
    }
  , { tag: `SquareUnit5x5`
    , type: { origin: [ 0, 0 ], sides: [ 5, 5 ] }
    , fns: { toCircle: x => ( { origin: x.origin, radius: x.sides[ 0 ] } ) }
    }
  ]
const shapeSigsOutputIsExplicitType =
  { toCircle: ts => [ ts.__, ts.Circle ] }
const Shape3 = SumType( shapeName, shapeVersion, shapeUrl, shapeDef3, shapeSigsOutputIsExplicitType )

describe( `SumType`, () =>
  describe( `()`, () =>
    {
      describe( `Return Object Validity`, () =>
        {
          describe( `Standard Properties`, () =>
            {
              it( `has #hasTags() method`, () =>
                assert( typeof Shape.hasTags === 'function' )
              )
              it( `has #is() method`, () =>
                assert( typeof Shape.is === 'function' )
              )
              it( `has #tag() method`, () =>
                assert( typeof Shape.tag === 'function' )
              )
              it( `has #tags() method`, () =>
                assert( typeof Shape.tags === 'function' )
              )
              it( `has #value() method`, () =>
                assert( typeof Shape.value === 'function' )
              )
            }
          )
          describe( `User-Defined Properties`, () =>
            {
              it( `has #Circle() method`, () =>
                assert( typeof Shape.Circle === 'function' )
              )
              it( `has #CircleType is Type ( from Type )`, () =>
                assert( $.test( [], $.Type, Shape.CircleType ) )
              )
              it( `has #Rect() method`, () =>
                assert( typeof Shape.Rect === 'function' )
              )
              it( `has #RectType is ( Type from Type )`, () =>
                assert( $.test( [], $.Type, Shape.RectType ) )
              )
              it( `has #Shape() method`, () =>
                assert( typeof Shape.Shape === 'function' )
              )
              it( `has #ShapeType is Type ( sum type )`, () =>
                assert( $.test( [], $.Type, Shape.ShapeType ) )
              )
              it( `has #Square() method`, () =>
                assert( typeof Shape.Square === 'function' )
              )
              it( `has #SquareType is Type ( from predicate )`, () =>
                assert( $.test( [], $.Type, Shape.SquareType ) )
              )
              it( `has #SquareUnit5x5() method`, () =>
                assert( typeof Shape.SquareUnit5x5 === 'function' )
              )
              it( `has #SquareUnit5x5Type is Type (from Unit)`, () =>
                assert( $.test( [], $.Type, Shape.SquareUnit5x5Type ) )
              )
              it( `has #area() method ( user-defined )`, () =>
                assert( typeof Shape.area === 'function' )
              )
              it( `has #move() method`, () =>
                assert( typeof Shape.move === 'function' )
              )
              it( `has #move2() method`, () =>
                assert( typeof Shape.move2 === 'function' )
              )
            }
          )
        }
      )
      describe( `Invalid Input`, () =>
        {
          it( `throws a TypeError with missing case function`, () =>
            {
              // Shape definition with a missing function (move2)
              const ShapeDefMissingFn =
                R.append( { tag: 'MissingFn', type: 'x', fns:{ area: x => x, move: x => x } }, shapeDef )
              return assert.throws( _ => SumType( `Shape`, 2, `url`, ShapeDefMissingFn, shapeSigsSameInputOutputType ), TypeError )
            }
          )
          it( `throws a TypeError with invalid case function`, () =>
            {
              // Shape definition with an invalid function (move2)
              const ShapeDefInvalidFn =
                R.append( { tag: 'MissingFn', type: 'x', fns:{ area: x => x, move: x => x, move2: true } }, shapeDef )
              return assert.throws( _ => SumType( `Shape`, 2, `url`, ShapeDefInvalidFn, shapeSigsSameInputOutputType ), TypeError )
            }
          )
          it( `throws a TypeError with missing function signature`, () =>
            {
              // Missing signature (area)
              const missingSig =
                { move:  ts => [ Point, Point ]
                , move2: ts => [ Point, Point ]
                }
              return assert.throws( _ => SumType( `Shape`, 2, `url`, shapeDef, missingSig ), TypeError )
            }
          )
          it( `throws a TypeError with invalid function signature (not Array( Type ) with at least two Types)`, () =>
            {
              // Invalid signature (area)
              const invalidSig =
                { move:  ts => [ Point, Point ]
                , move2: ts => [ Point, Point ]
                , area: ts => [ true, true ]
                }
              return assert.throws( _ => SumType( `Shape`, 2, `url`, shapeDef, invalidSig ), TypeError )
            }
          )
          it( `throws a TypeError with invalid function signature (not Array( Type ) with at least two Types)`, () =>
            {
              // Invalid signature (area)
              const invalidSig =
                { move:  ts => [ Point, Point ]
                , move2: ts => [ Point, Point ]
                , area: ts => [ Point ]
                }
              return assert.throws( _ => SumType( `Shape`, 2, `url`, shapeDef, invalidSig ), TypeError )
            }
          )
        }
      )
    }
  )
)

const cBare = { origin: [ 0, 0 ], radius: 5 }
const cWrapped = Shape.Circle( cBare )

const rBare = { origin: [ 0, 0 ], sides: [ 4, 5 ] }
const rWrapped = Shape.Rect( rBare )

const sBare = { origin: [ 0, 0 ], sides: [ 4, 4 ] }
const sWrapped = Shape.Square( sBare )

const s5x5Bare = { origin: [ 0, 0 ], sides: [ 5, 5 ] }
const s5x5Wrapped = Shape.SquareUnit5x5( s5x5Bare )

describe( `Shape`, () => {
  describe( `Constructors`, () =>
    {
      describe( `#Shape()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `returns a Shape.ShapeType with member`, () =>
                assert( $.test( [], Shape.ShapeType, Shape.Shape( cWrapped ) ) )
              )
              it( `returns a Shape.CircleType with circle`, () =>
                assert( $.test( [], Shape.CircleType, Shape.Shape( cWrapped ) ) )
              )
              describe( `Ambiguous Type`, () =>
                {
                  it( `return has the first matching type (RectType) with square`, () =>
                    assert( $.test( [], Shape.RectType, Shape.Shape( sWrapped ) ) )
                  )
                }
              )
              describe( `Return Object Validity`, () =>
                {
                  it( `has #@@type === typeIdentifier`, () =>
                    assert( Shape.Shape( cWrapped )[ '@@type' ] === typeIdentifier )
                  )
                  it( `has #constructor R.equals SumTypeTypeRep`, () =>
                    assert( R.equals( Shape.Shape( cWrapped ).constructor, SumTypeTypeRep ) )
                  )
                  it( `has #isCircle === true`, () =>
                    assert( Shape.Shape( cWrapped ).isCircle === true )
                  )
                  it( `has #name === shapeName`, () =>
                    assert( Shape.Shape( cWrapped ).name === shapeName )
                  )
                  it( `has #tag === 'Circle'`, () =>
                    assert( Shape.Shape( cWrapped ).tag === 'Circle' )
                  )
                  it( `has #url === shapeUrl`, () =>
                    assert( Shape.Shape( cWrapped ).url === shapeUrl )
                  )
                  it( `has #value R.equals circle.value`, () =>
                    assert( R.equals( Shape.Shape( cWrapped ).value, cWrapped.value ) )
                  )
                  it( `has #value !== circle.value`, () =>
                    assert( Shape.Shape( cWrapped ).value !== cWrapped.value )
                  )
                }
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `returns a Shape.ShapeType with member`, () =>
                assert( $.test( [], Shape.ShapeType, Shape.Shape( cBare ) ) )
              )
              it( `returns a Shape.CircleType with circle`, () =>
                assert( $.test( [], Shape.CircleType, Shape.Shape( cBare ) ) )
              )
              describe( `Ambiguous Type`, () =>
                {
                  it( `return has the first matching type (RectType) with square`, () =>
                    assert( $.test( [], Shape.RectType, Shape.Shape( sBare ) ) )
                  )
                }
              )
              describe( `Return Object Validity`, () =>
                {
                  it( `has #@@type === typeIdentifier`, () =>
                    assert( Shape.Shape( cBare )[ '@@type' ] === typeIdentifier )
                  )
                  it( `has #constructor R.equals SumTypeTypeRep`, () =>
                    assert( R.equals( Shape.Shape( cBare ).constructor, SumTypeTypeRep ) )
                  )
                  it( `has #isCircle === true`, () =>
                    assert( Shape.Shape( cBare ).isCircle === true )
                  )
                  it( `has #name === shapeName`, () =>
                    assert( Shape.Shape( cBare ).name === shapeName )
                  )
                  it( `has #tag === 'Circle'`, () =>
                    assert( Shape.Shape( cBare ).tag === 'Circle' )
                  )
                  it( `has #url === shapeUrl`, () =>
                    assert( Shape.Shape( cBare ).url === shapeUrl )
                  )
                  it( `has #value R.equals circle`, () =>
                    assert( R.equals( Shape.Shape( cBare ).value, cBare ) )
                  )
                  it( `has #value !== circle`, () =>
                    assert( Shape.Shape( cBare ).value !== cBare )
                  )
                }
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `throws a TypeError with a non member input`, () =>
                assert.throws( () => Shape.Shape( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#Circle()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `returns a Shape.CircleType with member`, () =>
                assert( $.test( [], Shape.CircleType, Shape.Circle( cWrapped ) ) )
              )
              it( `throws a TypeError with a sum type member that doesn't match`, () =>
                assert.throws( () => Shape.Circle( rWrapped ), TypeError )
              )
              describe( `Return Object Validity`, () =>
                {
                  it( `has #@@type === typeIdentifier`, () =>
                    assert( Shape.Circle( cWrapped )[ '@@type' ] === typeIdentifier )
                  )
                  it( `has #constructor R.equals SumTypeTypeRep`, () =>
                    assert( R.equals( Shape.Circle( cWrapped ).constructor, SumTypeTypeRep ) )
                  )
                  it( `has #isCircle === true`, () =>
                    assert( Shape.Circle( cWrapped ).isCircle === true )
                  )
                  it( `has #name === shapeName`, () =>
                    assert( Shape.Circle( cWrapped ).name === shapeName )
                  )
                  it( `has #tag === 'Circle'`, () =>
                    assert( Shape.Circle( cWrapped ).tag === 'Circle' )
                  )
                  it( `has #url === shapeUrl`, () =>
                    assert( Shape.Circle( cWrapped ).url === shapeUrl )
                  )
                  it( `has #value R.equals circle.value`, () =>
                    assert( R.equals( Shape.Shape( cWrapped ).value, cWrapped.value ) )
                  )
                  it( `has #value !== circle.value`, () =>
                    assert( Shape.Shape( cWrapped ).value !== cWrapped.value )
                  )
                }
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `returns a Shape.CircleType with member`, () =>
                assert( $.test( [], Shape.CircleType, Shape.Circle( cBare ) ) )
              )
              it( `throws a TypeError with a sum type member that doesn't match`, () =>
                assert.throws( () => Shape.Circle( rBare ), TypeError )
              )
              describe( `Return Object Validity`, () =>
                {
                  it( `has #@@type === typeIdentifier`, () =>
                    assert( Shape.Circle( cBare )[ '@@type' ] === typeIdentifier )
                  )
                  it( `has #constructor R.equals SumTypeTypeRep`, () =>
                    assert( R.equals( Shape.Circle( cBare ).constructor, SumTypeTypeRep ) )
                  )
                  it( `has #isCircle === true`, () =>
                    assert( Shape.Circle( cBare ).isCircle === true )
                  )
                  it( `has #name === shapeName`, () =>
                    assert( Shape.Circle( cBare ).name === shapeName )
                  )
                  it( `has #tag === 'Circle'`, () =>
                    assert( Shape.Circle( cBare ).tag === 'Circle' )
                  )
                  it( `has #url === shapeUrl`, () =>
                    assert( Shape.Circle( cBare ).url === shapeUrl )
                  )
                  it( `has #value R.equals circle`, () =>
                    assert( R.equals( Shape.Shape( cBare ).value, cBare ) )
                  )
                  it( `has #value !== circle`, () =>
                    assert( Shape.Shape( cBare ).value !== cBare )
                  )
                }
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `throws a TypeError with a non member input`, () =>
                assert.throws( () => Shape.Circle( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#Rect()`, () =>
        {
          describe( `Ambiguous Type`, () =>
            {
              it( `returns a Shape.RectType with bare square`, () =>
                assert( $.test( [], Shape.RectType, Shape.Rect( sBare ) ) )
              )
              it( `returns a Shape.RectType with wrapped square`, () =>
                assert( $.test( [], Shape.RectType, Shape.Rect( sWrapped ) ) )
              )
            }
          )
        }
      )
      describe( `#Square()`, () =>
        {
          describe( `Ambiguous Type`, () =>
            {
              it( `throws a TypeError with bare rect`, () =>
                assert.throws( () => Shape.Square( rBare ), TypeError )
              )
              it( `throws a TypeError with wrapped rect`, () =>
                assert.throws( () => Shape.Square( rWrapped ), TypeError )
              )
            }
          )
        }
      )
      describe( `#SquareUnit5x5()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `returns a Shape.SquareUnit5x5 with 5x5 squareUnit`, () =>
                assert( $.test( [], Shape.SquareUnit5x5Type, Shape.SquareUnit5x5( s5x5Wrapped ) ) )
              )
              it( `returns a Shape.SquareUnit5x5 with 5x5 square`, () =>
                assert( $.test( [], Shape.SquareUnit5x5Type, Shape.SquareUnit5x5( Shape.Square( s5x5Bare ) ) ) )
              )
            }
          )
          describe( `Bare Input`, () =>
            {
              it( `returns a Shape.SquareUnit5x5 with 5x5 square`, () =>
                assert( $.test( [], Shape.SquareUnit5x5Type, Shape.SquareUnit5x5( s5x5Bare ) ) )
              )
            }
          )
          describe( `Ambiguous Type`, () =>
            {
              it( `throws a TypeError with bare rect`, () =>
                assert.throws( () => Shape.SquareUnit5x5( rBare ), TypeError )
              )
              it( `throws a TypeError with wrapped rect`, () =>
                assert.throws( () => Shape.SquareUnit5x5( rWrapped ), TypeError )
              )
              it( `throws a TypeError with non matching bare square`, () =>
                assert.throws( () => Shape.SquareUnit5x5( sBare ), TypeError )
              )
              it( `throws a TypeError with non matching wrapped square`, () =>
                assert.throws( () => Shape.SquareUnit5x5( sWrapped ), TypeError )
              )
            }
          )
        }
      )
    }
  )
  describe( `Types`, () =>
    {
      describe( `#ShapeType`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `matches a circle`, () =>
                assert( $.test( [], Shape.ShapeType, cWrapped ) )
              )
              it( `matches a rect`, () =>
                assert( $.test( [], Shape.ShapeType, rWrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `matches a circle`, () =>
                assert( $.test( [], Shape.ShapeType, cBare ) )
              )
              it( `matches a rect`, () =>
                assert( $.test( [], Shape.ShapeType, rBare ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `doesn't match non member`, () =>
                assert( R.not( $.test( [], Shape.ShapeType, {} ) ) )
              )
            }
          )
        }
      )
      describe( `#CircleType ( from Type )`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `matches a circle`, () =>
                assert( $.test( [], Shape.CircleType, cWrapped ) )
              )
              it( `doesn't match a rect`, () =>
                assert( R.not( $.test( [], Shape.CircleType, rWrapped ) ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `matches a circle`, () =>
                assert( $.test( [], Shape.CircleType, cBare ) )
              )
              it( `doesn't match a rect`, () =>
                assert( R.not( $.test( [], Shape.CircleType, rBare ) ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `doesn't match a non member`, () =>
                assert( R.not( $.test( [], Shape.RectType, {} ) ) )
              )
            }
          )
        }
      )
      describe( `#RectType ( from Type )`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `matches a rect`, () =>
                assert( $.test( [], Shape.RectType, rWrapped ) )
              )
              it( `doesn't match a circle`, () =>
                assert( R.not( $.test( [], Shape.RectType, cWrapped ) ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `matches a rect`, () =>
                assert( $.test( [], Shape.RectType, rBare ) )
              )
              it( `doesn't match a circle`, () =>
                assert( R.not( $.test( [], Shape.RectType, cBare ) ) )
              )
            }
          )
          describe( `Ambiguous Type`, () =>
            {
              it( `matches a bare square`, () =>
                assert( $.test( [], Shape.RectType, sBare ) )
              )
              it( `matches a wrapped square`, () =>
                assert( $.test( [], Shape.RectType, sWrapped ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `doesn't match a non member`, () =>
                assert( R.not( $.test( [], Shape.RectType, {} ) ) )
              )
            }
          )
        }
      )
      describe( `#SquareType ( from predicate )`, () =>
        {
          describe( `Ambiguous Type`, () =>
            {
              it( `doesn't match a wrapped rect`, () =>
                assert( R.not( $.test( [], Shape.SquareType, rWrapped ) ) )
              )
              it( `doesn't match a bare rect`, () =>
                assert( R.not( $.test( [], Shape.SquareType, rBare ) ) )
              )
              it( `matches a wrapped squareUnit5x5`, () =>
                assert( $.test( [], Shape.SquareType, s5x5Wrapped ) )
              )
              it( `matches a bare squareUnit5x5`, () =>
                assert( $.test( [], Shape.SquareType, s5x5Bare ) )
              )
            }
          )
        }
      )
      describe( `#SquareUnit5x5Type ( from unit )`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `matches a squareUnit5x5`, () =>
                assert( $.test( [], Shape.SquareUnit5x5Type, s5x5Wrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `matches a squareUnit5x5`, () =>
                assert( $.test( [], Shape.SquareUnit5x5Type, s5x5Bare ) )
              )
            }
          )
          describe( `Ambiguous Type`, () =>
            {
              it( `doesn't match a rect`, () =>
                assert( R.not( $.test( [], Shape.SquareUnit5x5Type, rWrapped ) ) )
              )
              it( `doesn't match a square with the wrong dimensions`, () =>
                assert( R.not( $.test( [], Shape.SquareUnit5x5Type, sBare ) ) )
              )
            }
          )
        }
      )
    }
  )
  describe( `Standard Methods`, () =>
    {
      describe( `#hasTags()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `rect hasTags ['Rect']`, () =>
                assert( Shape.hasTags( ['Rect'], rWrapped ) )
              )
              it( `rect hasn't tags ['Square']`, () =>
                assert( R.not( Shape.hasTags( ['Square'], rWrapped ) ) )
              )
              it( `rect hasn't tags ['SquareUnit5x5']`, () =>
                assert( R.not( Shape.hasTags( ['SquareUnit5x5'], rWrapped ) ) )
              )
              it( `square hasTags ['Square', 'Rect']`, () =>
                assert( Shape.hasTags( ['Square', 'Rect'], sWrapped ) )
              )
              it( `4x4 square hasn't tags ['SquareUnit5x5']`, () =>
                assert( R.not( Shape.hasTags( ['SquareUnit5x5'], sWrapped ) ) )
              )
              it( `5x5 square hasTags ['SquareUnit5x5', 'Square', 'Rect']`, () =>
                assert( Shape.hasTags( ['SquareUnit5x5', 'Square', 'Rect'], s5x5Wrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `rect hasTags ['Rect']`, () =>
                assert( Shape.hasTags( ['Rect'], rBare ) )
              )
              it( `rect hasn't tags ['Square']`, () =>
                assert( R.not( Shape.hasTags( ['Square'], rBare ) ) )
              )
              it( `rect hasn't tags ['SquareUnit5x5']`, () =>
                assert( R.not( Shape.hasTags( ['SquareUnit5x5'], rBare ) ) )
              )
              it( `square hasTags ['Square', 'Rect']`, () =>
                assert( Shape.hasTags( ['Square', 'Rect'], sBare ) )
              )
              it( `4x4 square hasn't tags ['SquareUnit5x5']`, () =>
                assert( R.not( Shape.hasTags( ['SquareUnit5x5'], sBare ) ) )
              )
              it( `5x5 square hasTags ['SquareUnit5x5', 'Square', 'Rect']`, () =>
                assert( Shape.hasTags( ['SquareUnit5x5', 'Square', 'Rect'], s5x5Bare ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `['Rect'] is false for non member`, () =>
                assert( R.not( Shape.hasTags( ['Rect'], {} ) ) )
              )
            }
          )
        }
      )
      describe( `#is()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `'Circle' matches a circle`, () =>
                assert( Shape.is( `Circle`, cWrapped ) )
              )
              it( `'Circle' doesn't match a rect`, () =>
                assert( R.not( Shape.is( `Circle`, rWrapped ) ) )
              )
              it( `'Rect' matches a rect`, () =>
                assert( Shape.is( `Rect`, rWrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `'Circle' matches a circle`, () =>
                assert( Shape.is( `Circle`, cBare ) )
              )
              it( `'Circle' doesn't match a rect`, () =>
                assert( R.not( Shape.is( `Circle`, rBare ) ) )
              )
              it( `'Rect' matches a rect`, () =>
                assert( Shape.is( `Rect`, rBare ) )
              )
            }
          )
          describe( `Ambiguous Type`, () =>
            {
              it( `'Rect' matches a wrapped square`, () =>
                assert( Shape.is( `Rect`, sWrapped ) )
              )
              it( `'Rect' matches a bare square`, () =>
                assert( Shape.is( `Rect`, sBare ) )
              )
              it( `'Square' doesn't match a wrapped rect`, () =>
                assert( R.not( Shape.is( `Square`, rWrapped ) ) )
              )
              it( `'Square' doesn't match a bare rect`, () =>
                assert( R.not( Shape.is( `Square`, rBare ) ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `'Circle' doesn't match a non member`, () =>
                assert( R.not( Shape.is( `Circle`, {} ) ) )
              )
            }
          )
        }
      )
      describe( `#tag()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `equals 'Circle' for circle`, () =>
                assert.equal( 'Circle', Shape.tag( cWrapped ) )
              )
              it( `equals 'Rect' for rect`, () =>
                assert.equal( 'Rect', Shape.tag( rWrapped ) )
              )
              it( `equals 'Square' for square`, () =>
                assert.equal( 'Square', Shape.tag( sWrapped ) )
              )
              it( `equals 'SquareUnit5x5' for 5x5 square`, () =>
                assert.equal( 'SquareUnit5x5', Shape.tag( s5x5Wrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `equals 'Circle' for circle`, () =>
                assert.equal( 'Circle', Shape.tag( cBare ) )
              )
              it( `equals 'Rect' for rect`, () =>
                assert.equal( 'Rect', Shape.tag( rBare ) )
              )
              it( `equals 'Rect' for square`, () =>
                assert.equal( 'Rect', Shape.tag( sBare ) )
              )
              it( `equals 'Rect' for 5x5 square`, () =>
                assert.equal( 'Rect', Shape.tag( s5x5Bare ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              // TODO borrowing sanctuary-def's TypeError here. Need to replace it with our own.
              it( `throws a TypeError for non member`, () =>
                assert.throws( _ => Shape.tag( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#tags()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `equals ['Circle'] for circle`, () =>
                assert.deepEqual( ['Circle'], Shape.tags( cWrapped ) )
              )
              it( `equals ['Rect'] for rect`, () =>
                assert.deepEqual( ['Rect'], Shape.tags( rWrapped ) )
              )
              it( `equals ['Rect', 'Square'] for square`, () =>
                assert.deepEqual( ['Rect', 'Square'], Shape.tags( sWrapped ) )
              )
              it( `equals ['Rect', 'Square', 'SquareUnit5x5'] for 5x5 square`, () =>
                assert.deepEqual( ['Rect', 'Square', 'SquareUnit5x5'], Shape.tags( s5x5Wrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `equals ['Circle'] for circle`, () =>
                assert.deepEqual( ['Circle'], Shape.tags( cBare ) )
              )
              it( `equals ['Rect'] for rect`, () =>
                assert.deepEqual( ['Rect'], Shape.tags( rBare ) )
              )
              it( `equals ['Rect', 'Square'] for square`, () =>
                assert.deepEqual( ['Rect', 'Square'], Shape.tags( sBare ) )
              )
              it( `equals ['Rect', 'Square', 'SquareUnit5x5'] for 5x5 square`, () =>
                assert.deepEqual( ['Rect', 'Square', 'SquareUnit5x5'], Shape.tags( s5x5Bare ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              // TODO borrowing sanctuary-def's TypeError here. Need to replace it with our own.
              it( `throws a TypeError for non member`, () =>
                assert.throws( _ => Shape.tag( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#value()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `equals circle#value for circle`, () =>
                assert.deepEqual( cWrapped.value, Shape.value( cWrapped ) )
              )
              it( `equals rect#value for rect`, () =>
                assert.deepEqual( rWrapped.value, Shape.value( rWrapped ) )
              )
              it( `equals square#value for square`, () =>
                assert.deepEqual( sWrapped.value, Shape.value( sWrapped ) )
              )
              it( `equals 5x5 square#value for 5x5 square`, () =>
                assert.deepEqual( s5x5Wrapped.value, Shape.value( s5x5Wrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `equals circle for circle`, () =>
                assert.deepEqual( cBare, Shape.value( cBare ) )
              )
              it( `equals rect for rect`, () =>
                assert.deepEqual( rBare, Shape.value( rBare ) )
              )
              it( `equals square for square`, () =>
                assert.deepEqual( sBare, Shape.value( sBare ) )
              )
              it( `equals 5x5 square for 5x5 square`, () =>
                assert.deepEqual( s5x5Bare, Shape.value( s5x5Bare ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `equals input for non member`, () =>
                assert.deepEqual( {}, Shape.value( {} ) )
              )
            }
          )
        }
      )
    }
  )
  describe( `User-Defined Methods`, () =>
    {
      describe( `#area()`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `equals 24 for rect`, () =>
                assert.equal( 20, Shape.area( rWrapped ) )
              )
              it( `equals 78.53981633974483 for circle`, () =>
                assert.equal( 78.53981633974483, Shape.area( cWrapped ) )
              )
              it( `equals 24 for square`, () =>
                assert.equal( 16, Shape.area( sWrapped ) )
              )
              it( `equals 24 for 5x5 square`, () =>
                assert.equal( 25, Shape.area( s5x5Wrapped ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `equals 24 for rect`, () =>
                assert.equal( 20, Shape.area( rBare ) )
              )
              it( `equals 78.53981633974483 for circle`, () =>
                assert.equal( 78.53981633974483, Shape.area( cBare ) )
              )
              it( `equals 24 for square`, () =>
                assert.equal( 16, Shape.area( sBare ) )
              )
              it( `equals 24 for 5x5 square`, () =>
                assert.equal( 25, Shape.area( s5x5Bare ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `throws a TypeError for non member`, () =>
                assert.throws( _ => Shape.area( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#move( [ 1, 1 ] )`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `#value#origin == [ 1, 1 ] for rect`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], rWrapped ).value.origin )
              )
              it( `#value#origin == [ 1, 1 ] for circle`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], cWrapped ).value.origin )
              )
              it( `#value#origin == [ 1, 1 ] for square`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], sWrapped ).value.origin )
              )
              // we can't 'move' a wrapped Unit Type because the return will not match the unit
              //TODO: think about how this should work
              it( `throws a TypeError for Unit type (5x5 square)`, () =>
                assert.throws( _ => Shape.move( [ 1, 1 ], s5x5Wrapped ), TypeError )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `#origin == [ 1, 1 ] for rect`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], rBare ).origin )
              )
              it( `#origin == [ 1, 1 ] for circle`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], cBare ).origin )
              )
              it( `#origin == [ 1, 1 ] for square`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], sBare ).origin )
              )
              it( `#origin == [ 1, 1 ] for 5x5 square`, () =>
                assert.deepEqual( [ 1, 1 ], Shape.move( [ 1, 1 ], s5x5Bare ).origin )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `throws a TypeError for non member`, () =>
                assert.throws( _ => Shape.move( [ 1, 1 ], {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#move2() - Output is Placeholder Type`, () =>
        {
          describe( `Total Application`, () =>
            {
              describe( `Wrapped Input`, () =>
                {
                  it( `#value#origin == [ 1, 1 ] for rect`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, rWrapped ).value.origin )
                  )
                  it( `#value#origin == [ 1, 1 ] for circle`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, cWrapped ).value.origin )
                  )
                  it( `#value#origin == [ 1, 1 ] for square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, sWrapped ).value.origin )
                  )
                  // we can't 'move' a wrapped Unit Type because the return will not match the unit
                  //TODO: think about how this should work
                  it( `throws a TypeError for Unit type (5x5 square)`, () =>
                    assert.throws( _ => Shape.move2( 1, 1, s5x5Wrapped ), TypeError )
                  )
                }
              )
              describe( `Bare Member Input`, () =>
                {
                  it( `#origin == [ 1, 1 ] for rect`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, rBare ).origin )
                  )
                  it( `#origin == [ 1, 1 ] for circle`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, cBare ).origin )
                  )
                  it( `#origin == [ 1, 1 ] for square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, sBare ).origin )
                  )
                  it( `#origin == [ 1, 1 ] for 5x5 square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1, 1, s5x5Bare ).origin )
                  )
                }
              )
              describe( `Non Member`, () =>
                {
                  it( `throws a TypeError for non member`, () =>
                    assert.throws( _ => Shape.move2( 1, 1, {} ), TypeError )
                  )
                }
              )
            }
          )
          describe( `Partial Application`, () =>
            {
              describe( `Wrapped Input`, () =>
                {
                  it( `#value#origin == [ 1, 1 ] for rect`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( rWrapped ).value.origin )
                  )
                  it( `#value#origin == [ 1, 1 ] for circle`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( cWrapped ).value.origin )
                  )
                  it( `#value#origin == [ 1, 1 ] for square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( sWrapped ).value.origin )
                  )
                  // we can't 'move' a wrapped Unit Type because the return will not match the unit
                  //TODO: think about how this should work
                  it( `throws a TypeError for Unit type (5x5 square)`, () =>
                    assert.throws( _ => Shape.move2( 1 )( 1 )( s5x5Wrapped ), TypeError )
                  )
                }
              )
              describe( `Bare Member Input`, () =>
                {
                  it( `#origin == [ 1, 1 ] for rect`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( rBare ).origin )
                  )
                  it( `#origin == [ 1, 1 ] for circle`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( cBare ).origin )
                  )
                  it( `#origin == [ 1, 1 ] for square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( sBare ).origin )
                  )
                  it( `#origin == [ 1, 1 ] for 5x5 square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape.move2( 1 )( 1 )( s5x5Bare ).origin )
                  )
                }
              )
              describe( `Non Member`, () =>
                {
                  it( `throws a TypeError for non member`, () =>
                    assert.throws( _ => Shape.move2( 1 )( 1 )( {} ), TypeError )
                  )
                }
              )
            }
          )
        }
      )
      describe( `#wrongType() - Output is Placeholder Type`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `throws a TypeError for circle`, () =>
                assert.throws( _ => Shape.wrongType( cWrapped ), TypeError )
              )
              it( `throws a TypeError for rect`, () =>
                assert.throws( _ => Shape.wrongType( rWrapped ), TypeError )
              )
              it( `throws a TypeError for square`, () =>
                assert.throws( _ => Shape.wrongType( sWrapped ), TypeError )
              )
              it( `throws a TypeError for 5x5 square`, () =>
                assert.throws( _ => Shape.wrongType( s5x5Wrapped ), TypeError )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `throws a TypeError for circle`, () =>
                assert.throws( _ => Shape.wrongType( cBare ), TypeError )
              )
              it( `throws a TypeError for rect`, () =>
                assert.throws( _ => Shape.wrongType( rBare ), TypeError )
              )
              it( `throws a TypeError for square`, () =>
                assert.throws( _ => Shape.wrongType( sBare ), TypeError )
              )
              it( `throws a TypeError for 5x5 square`, () =>
                assert.throws( _ => Shape.wrongType( sBare ), TypeError )
              )
            }
          )
        }
      )
      describe( `#move3() - Output is Sum Type`, () =>
        {
          describe( `Total Application`, () =>
            {
              describe( `Wrapped Input`, () =>
                {
                  it( `#value#origin == [ 1, 1 ] for 5x5 square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape2.move3( 1, 1, s5x5Wrapped ).value.origin )
                  )
                  it( `#tag == 'Rect' for 5x5 square`, () =>
                    assert.equal( 'Rect', Shape2.move3( 1, 1, s5x5Wrapped ).tag )
                  )
                }
              )
            }
          )
          describe( `Partial Application`, () =>
            {
              describe( `Wrapped Input`, () =>
                {
                  it( `#value#origin == [ 1, 1 ] for 5x5 square`, () =>
                    assert.deepEqual( [ 1, 1 ], Shape2.move3( 1 )( 1 )( s5x5Wrapped ).value.origin )
                  )
                  it( `#tag == 'Rect' for 5x5 square`, () =>
                    assert.equal( 'Rect', Shape2.move3( 1 )( 1 )( s5x5Wrapped ).tag )
                  )
                }
              )
            }
          )
        }
      )
      describe( `#changeType() - Output is Sum Type`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `circle to rect`, () =>
                assert.equal( 'Rect', Shape.tag( Shape2.changeType( cWrapped ) ) )
              )
              it( `rect to circle`, () =>
                assert.equal( 'Circle', Shape.tag( Shape2.changeType( rWrapped ) ) )
              )
              it( `5x5 square to 4x4 square (rect)`, () =>
                assert.equal( 'Rect', Shape.tag( Shape2.changeType( s5x5Wrapped ) ) )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `circle to rect`, () =>
                assert.equal( 'Rect', Shape.tag( Shape2.changeType( cBare ) ) )
              )
              it( `rect to circle`, () =>
                assert.equal( 'Circle', Shape.tag( Shape2.changeType( rBare ) ) )
              )
              // The following looks strange but is correct for a bare 5x5 square
              // because its first match is rect, and rect.changeType() returns a circle
              it( `5x5 square to circle (over rect)`, () =>
                assert.equal( 'Circle', Shape.tag( Shape2.changeType( s5x5Bare ) ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `throws a TypeError for non member`, () =>
                assert.throws( _ => Shape.changeType( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( `#toCircle() - Output is Explicit Type`, () =>
        {
          describe( `Wrapped Input`, () =>
            {
              it( `#value#radius == 5 for 5x5 square`, () =>
                assert.equal( 5, Shape3.toCircle( s5x5Wrapped ).value.radius )
              )
              it( `#tag == 'Circle' for 5x5 square`, () =>
                assert.equal( 'Circle', Shape3.toCircle( s5x5Wrapped ).tag )
              )
            }
          )
          describe( `Bare Member Input`, () =>
            {
              it( `#value#radius == 5 for 5x5 square`, () =>
                assert.equal( 5, Shape3.toCircle( s5x5Bare ).radius )
              )
              it( `#tag == 'Circle' for 5x5 square`, () =>
                assert.equal( 'Circle', Shape3.tag( Shape3.toCircle( s5x5Bare ) ) )
              )
            }
          )
          describe( `Non Member`, () =>
            {
              it( `throws a TypeError for non member`, () =>
                assert.throws( _ => Shape.move2( 1 )( 1 )( {} ), TypeError )
              )
            }
          )
        }
      )
    }
  )
})

const Offer =
  SumType( `Offer`
         , 1
         , `url`
         , [ { tag: `NeverSaved`
             , type: $.RecordType( { id: $.Null } )
             }
           , { tag: `Saved`
             , type: $.RecordType( { id: $.PositiveInteger } )
             }
           , { tag: `Offered`
             , type: $.RecordType( { offered: $.Date } )
             }
           , { tag: `Accepted`
             , type: $.RecordType( { accepted: $.Date } )
             }
           ]
         , {}
         )

const Deal =
  SumType( `Deal`
         , 1
         , `url`
         , [ { tag: `NeverSaved`
             , type: $.RecordType( { id: $.Null } )
             }
           , { tag: `Saved`
             , type: $.RecordType( { id: $.PositiveInteger } )
             }
           , { tag: `Offered`
             , type:
                 y =>
                   typeof
                     R.find( o( y =>
                                  typeof y !== `undefined`
                                  && $.Date.validate( y.offered )
                              )
                              ( R.prop( `proposals` ) )
                              ( y )
                           )
                     !== `undefined`
             }
           ]
         , {}
         )
//endregion
