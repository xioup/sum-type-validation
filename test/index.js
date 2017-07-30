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

describe( 'Array'
        , () =>
            describe( '#indexOf()'
                    , () =>
                        it( 'returns -1 when the value is not present'
                          , () =>
                              assert.equal( -1, [ 1, 2, 3 ].indexOf( 4 ) )
                        )
            )
)

describe( 'createSumTypeFactory'
        , () =>
            describe( '()'
                    , () =>
                        it( 'returns a function'
                          , () =>
                              assert( R.is( Function, createSumTypeFactory( opts ) ) )
                          )
                    )
        )

//region Definitions
//    Point :: Type
const Point =
  $.Pair( $.ValidNumber, $.ValidNumber )

const move =
  ( [ dx, dy ], shape ) =>
    R.over( R.lensProp( 'origin' )
          , ( [ x, y ] ) =>
              [ x + dx, y + dy ]
          , shape
          )
const move2 =
  ( dx, dy, shape ) =>
    R.over( R.lensProp( 'origin' )
          , ( [ x, y ] ) =>
              [ x + dx, y + dy ]
          , shape
          )

const shapeDef =
  [ { tag: 'Circle'
    , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
    , fns: { area: ( { radius } ) => Math.PI * radius * radius
           , move
           , move2
           }
    }
  , { tag: 'Rect'
    , type: $.RecordType( { origin: Point, sides: Point } )
    , fns: { area: ( { sides : [ w, h ] } ) => w * h
           , move
           , move2
           }
    }
  , { tag: 'Square'
    , type: $.RecordType( { origin: Point, sides: Point } )
    , fns: { area: ( { sides : [ w, h ] } ) => w * h
           , move
           , move2
           }
    }
  ]

const shapeSigs =
  { move:  ts => [ Point, ts.PT, ts.PT ]
  , move2: ts => [ $.ValidNumber, $.ValidNumber, ts.PT, ts.PT ]
  , area:  ts => [ ts.PT, $.ValidNumber ]
  }

const shapeName = 'Shape'
const shapeVersion = 2
const shapeUrl = 'url'
const Shape = SumType( shapeName, shapeVersion, shapeUrl, shapeDef, shapeSigs )

describe( 'SumType', () =>
  describe( '()', () =>
    it( 'returns an object', () =>
      assert( R.is( Object, SumType( 'Shape', 2, 'url', shapeDef, shapeSigs ) ) )
    )
  )
)

const cBare = { origin: [ 0, 0 ], radius: 5 }
const cWrapped = Shape.Circle( cBare )

const rBare = { origin: [ 0, 0 ], sides: [ 4, 5 ] }
const rWrapped = Shape.Rect( rBare )

const sBare = { origin: [ 0, 0 ], sides: [ 5, 5 ] }
const sWrapped = Shape.Square( sBare )

describe( 'Shape', () => {
  describe( 'Constructors', () =>
    {
      describe( '#Shape()', () =>
        {
          describe( 'Wrapped Input', () =>
            {
              it( 'returns a Shape.ShapeType with member', () =>
                assert( $.test( [], Shape.ShapeType, Shape.Shape( cWrapped ) ) )
              )
              it( 'returns a Shape.CircleType with circle', () =>
                assert( $.test( [], Shape.CircleType, Shape.Shape( cWrapped ) ) )
              )
              it( 'return.value R.equals circle.value', () =>
                assert( R.equals( Shape.Shape( cWrapped ).value, cWrapped.value ) )
              )
              it( 'return.value !== circle.value', () =>
                assert( Shape.Shape( cWrapped ).value !== cWrapped.value )
              )
              describe( 'Ambiguous Type', () =>
                {
                  it( 'return has the first matching type (RectType) with square', () =>
                    assert( $.test( [], Shape.RectType, Shape.Shape( sWrapped ) ) )
                  )
                }
              )
            }
          )
          describe( 'Bare Member Input', () =>
            {
              it( 'returns a Shape.ShapeType with member', () =>
                assert( $.test( [], Shape.ShapeType, Shape.Shape( cBare ) ) )
              )
              it( 'returns a Shape.CircleType with circle', () =>
                assert( $.test( [], Shape.CircleType, Shape.Shape( cBare ) ) )
              )
              it( 'return.value R.equals circle', () =>
                assert( R.equals( Shape.Shape( cBare ).value, cBare ) )
              )
              it( 'return.value !== circle', () =>
                assert( Shape.Shape( cBare ).value !== cBare )
              )
              describe( 'Ambiguous Type', () =>
                {
                  it( 'return has the first matching type (RectType) with square', () =>
                    assert( $.test( [], Shape.RectType, Shape.Shape( sBare ) ) )
                  )
                }
              )
            }
          )
          describe( 'Non Member', () =>
            {
              it( 'throws a TypeError with a non member input', () =>
                assert.throws( () => Shape.Shape( {} ), TypeError )
              )
            }
          )
        }
      )
      describe( '#Circle()', () =>
        {
          describe( 'Wrapped Input', () =>
            {
              it( 'returns a Shape.CircleType with member', () =>
                assert( $.test( [], Shape.CircleType, Shape.Circle( cWrapped ) ) )
              )
              it( 'return.value R.equals circle.value', () =>
                assert( R.equals( Shape.Circle( cWrapped ).value, cWrapped.value ) )
              )
              it( 'return.value !== circle.value', () =>
                assert( Shape.Circle( cWrapped ).value !== cWrapped.value )
              )
              it( 'throws a TypeError with a sum type member that doesn\'t match', () =>
                assert.throws( () => Shape.Circle( rWrapped ), TypeError )
              )
            }
          )
          describe( 'Bare Member Input', () =>
            {
              it( 'returns a Shape.CircleType with member', () =>
                assert( $.test( [], Shape.CircleType, Shape.Circle( cBare ) ) )
              )
              it( 'return.value R.equals circle.value', () =>
                assert( R.equals( Shape.Circle( cBare ).value, cBare ) )
              )
              it( 'return.value !== circle.value', () =>
                assert( Shape.Circle( cBare ).value !== cBare )
              )
              it( 'throws a TypeError with a sum type member that doesn\'t match', () =>
                assert.throws( () => Shape.Circle( rBare ), TypeError )
              )
            }
          )
          describe( 'Non Member', () =>
            {
              it( 'throws a TypeError with a non member input', () =>
                assert.throws( () => Shape.Circle( {} ), TypeError )
              )
            }
          )
        }
      )
    }
  )
  describe( 'Types', () =>
    {
      describe( '#ShapeType', () =>
        {
          describe( 'Wrapped Input', () =>
            {
              it( 'matches a circle', () =>
                assert( $.test( [], Shape.ShapeType, cWrapped ) )
              )
              it( 'matches a rect', () =>
                assert( $.test( [], Shape.ShapeType, rWrapped ) )
              )
            }
          )
          describe( 'Bare Member Input', () =>
            {
              it( 'matches a circle', () =>
                assert( $.test( [], Shape.ShapeType, cBare ) )
              )
              it( 'matches a rect', () =>
                assert( $.test( [], Shape.ShapeType, rBare ) )
              )
            }
          )
          describe( 'Non Member', () =>
            {
              it( 'does not match non member', () =>
                assert( R.not( $.test( [], Shape.ShapeType, {} ) ) )
              )
            }
          )
        }
      )
      describe( '#CircleType', () =>
        {
          describe( 'Wrapped Input', () =>
            {
              it( 'matches a circle', () =>
                assert( $.test( [], Shape.CircleType, cWrapped ) )
              )
              it( 'does not match a rect', () =>
                assert( R.not( $.test( [], Shape.CircleType, rWrapped ) ) )
              )
            }
          )
          describe( 'Bare Member Input', () =>
            {
              it( 'matches a circle', () =>
                assert( $.test( [], Shape.CircleType, cBare ) )
              )
              it( 'does not match a rect', () =>
                assert( R.not( $.test( [], Shape.CircleType, rBare ) ) )
              )
            }
          )
          describe( 'Non Member', () =>
            {
              it( 'does not match a non member', () =>
                assert( R.not( $.test( [], Shape.RectType, {} ) ) )
              )
            }
          )
        }
      )
      describe( '#RectType', () =>
        {
          describe( 'Wrapped Input', () =>
            {
              it( 'matches a rect', () =>
                assert( $.test( [], Shape.RectType, rWrapped ) )
              )
              it( 'does not match a circle', () =>
                assert( R.not( $.test( [], Shape.RectType, cWrapped ) ) )
              )
            }
          )
          describe( 'Bare Member Input', () =>
            {
              it( 'matches a rect', () =>
                assert( $.test( [], Shape.RectType, rBare ) )
              )
              it( 'does not match a circle', () =>
                assert( R.not( $.test( [], Shape.RectType, cBare ) ) )
              )
            }
          )
          describe( 'Ambiguous Type', () =>
            {
              it( 'matches a square', () =>
                assert( $.test( [], Shape.RectType, sBare ) )
              )
              it( 'matches a square', () =>
                assert( $.test( [], Shape.RectType, sWrapped ) )
              )
            }
          )
          describe( 'Non Member', () =>
            {
              it( 'does not match a non member', () =>
                assert( R.not( $.test( [], Shape.RectType, {} ) ) )
              )
            }
          )
        }
      )
    }
  )
})

const Offer =
  SumType( 'Offer'
         , 1
         , 'url'
         , [ { tag: 'NeverSaved'
             , type: $.RecordType( { id: $.Null } )
             }
           , { tag: 'Saved'
             , type: $.RecordType( { id: $.PositiveInteger } )
             }
           , { tag: 'Offered'
             , type: $.RecordType( { offered: $.Date } )
             }
           , { tag: 'Accepted'
             , type: $.RecordType( { accepted: $.Date } )
             }
           ]
         , {}
         )

const Deal =
  SumType( 'Deal'
         , 1
         , 'url'
         , [ { tag: 'NeverSaved'
             , type: $.RecordType( { id: $.Null } )
             }
           , { tag: 'Saved'
             , type: $.RecordType( { id: $.PositiveInteger } )
             }
           , { tag: 'Offered'
             , type:
                 y =>
                   typeof
                     R.find( o( y =>
                                  typeof y !== 'undefined'
                                  && $.Date.validate( y.offered )
                              )
                              ( R.prop( 'proposals' ) )
                              ( y )
                           )
                     !== 'undefined'
             }
           ]
         , {}
         )
//endregion
