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

//    Shape :: Type
const Shape =
  SumType( 'Shape'
         , 2
         , 'url'
         , [ { tag: 'Circle'
             , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
             , fns: { area: ( { radius } ) => Math.PI * radius * radius
                    , move
                    , move2
                    }
             }
           , { tag: 'Square'
             , type: $.RecordType( { origin: Point, side: $.ValidNumber } )
             , fns: { area: ( { side } ) => side * side
                    , move
                    , move2
                    }
             }
           , { tag: 'Rectangle'
             , type: $.RecordType( { origin: Point, sides: Point } )
             , fns: { area: ( { sides : [ w, h ] } ) => w * h
                    , move
                    , move2
                    }
             }
           ]
         , { move:  ts => [ Point, ts.PT, ts.PT ]
           , move2: ts => [ $.ValidNumber, $.ValidNumber, ts.PT, ts.PT ]
           , area:  ts => [ ts.PT, $.ValidNumber ]
           }
         )

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

const Bool =
  UntaggedSumType( 'Bool'
                 , 'url'
                 , [ true, false ]
                 )

const IntegerOrString =
  UntaggedSumType( 'IntegerOrString'
                 , 'url'
                 , [ $.Integer, $.String ]
                 )

const RegexFlags =
  UntaggedSumType( 'RegexFlags'
                 , 'url'
                 , [ $.EnumType( 'Standard', 'url', [ 'g', 'i', 'm' ] )
                   , $.EnumType( 'Experimental', 'url', [ 'u', 'y' ] )
                   ]
                 )
//endregion

// region Checks
const ShapeChecks =
  () =>
  (
    { z: ','
    , '0 Shape': Shape
    , '1 Inf Circle': Shape.Shape( { origin: [ 1, 2 ], radius: 2 } )
    , '2 Inf Square': Shape.Shape( { origin: [ 1, 2 ], side: 4 } )
    , '3 Inf Rectangle': Shape.Shape( { origin: [ 0, 0 ], sides: [ 5, 5 ] } )
    //, '3 Inf NoMatch_1': Shape.Shape( [ [ 1, 2 ] ] )
    //, '4 Inf NoMatch_2': Shape.Shape( [ [ 1, 2 ], [ true ] ] )
    }
  )

const dealIdentity =
  def( 'dealIdentity', {}, [ Deal.DealType, Deal.DealType ], x => x )
const DealChecks =
  () =>
  (
    { z: ','
    , '0 Inf DealNeverSaved': Deal.Deal( { id: null } )
    , '1 Inf DealSaved': Deal.Deal( { id: 1234 } )
    // , '2 Inf DealNoMatch': Deal.Deal( { id: 'a' } )
    , '3 DealNeverSaved': Deal.NeverSaved( { id: null } )
    , '4 DealSaved': Deal.Saved( { id: 1234 } )
    //, '5 DealNoMatch': Deal.Saved( { id: 'a' } )
    , '6 dealIdentity NeverSaved bare': dealIdentity( { id: null } )
    , '7 dealIdentity Saved bare': dealIdentity( { id: 1234 } )
    // , '8 dealIdentity Reg bare': dealIdentity( { id: 'a' } ) // this breaks (as it should)
    , '9 dealIdentity NeverSaved constr': dealIdentity( Deal.Deal( { id: null } ) )
    , '9_ dealIdentity Reg constr': dealIdentity( Deal.Deal( { id: 1234 } ) )
    }
  )

const BoolChecks =
  () =>
  (
    { '0 BoolTrue': Bool( true )
    , '1 BoolFalse': Bool( false )
    , '2 BoolNoMatch': Bool( 1 )
    }
  )

const IntegerOrStringChecks =
  () =>
  (
    { IntegerOrStringInt: IntegerOrString( 1 )
    , IntegerOrStringString: IntegerOrString( 'a string' )
    , IntegerOrStringBoolean: IntegerOrString( true )
    }
  )

const RegexFlagsChecks =
  () =>
  (
    { G: RegexFlags( 'g' )
    , Y: RegexFlags( 'y' )
    , Z: RegexFlags( 'z' )
    }
  )
//endregion


if ( typeof window !== 'undefined' ) {
  window.$ = $
  window.S = S
  window.type = type
  window.def = def
  window.Shape = Shape
  window.circleDef = { origin: [ 1, 2 ], radius: 2 }
  window.circle = Shape.Shape( window.circleDef )
  window.squareDef = { origin: [ 1, 2 ], side: 4 }
  window.square = Shape.Shape( window.squareDef )
  window.rectDef = { origin: [ 0, 0 ], sides: [ 5, 5 ] }
  window.rect = Shape.Shape( window.rectDef )
  window.Offer = Offer
  window.Deal = Deal
  window.dealNeverSaved = Deal.Deal( { id: null } )
}

console.group( 'union-types' )
console.log( 'ShapeChecks', ShapeChecks() )
console.log( 'DealChecks', DealChecks() )
////console.log( 'DealNew_tag', Deal.Deal( { id: null } ).tag )
//console.log( 'BoolChecks', BoolChecks() )
//console.log( 'IntegerOrStringChecks', IntegerOrStringChecks() )
//console.log( 'RegexFlagsChecks', RegexFlagsChecks() )
////console.log( 'validate', Union.validate( Shape.inferShape( 1, 2, 3 ) ) )
////console.log( 'Right', S.Right(1) )
////console.log( 'Real validate', $.Integer.validate( 1 ) )
console.groupEnd()

/*
// times are with type-checking enabled / disabled
console.time( 'circle.hasTags()' )
R.times( _ => circle.hasTags( ['Circle'] ), 1000 ) // 12ms / 12ms
console.timeEnd( 'circle.hasTags()' )
console.time( 'Shape.hasTags(circle)' )
R.times( _ => Shape.hasTags( ['Circle'], circle ), 1000 ) // 1.6ms / 1.5ms
console.timeEnd( 'Shape.hasTags(circle)' )
console.time( 'Shape.hasTags(circleDef)' )
R.times( _ => Shape.hasTags( ['Circle'], circleDef ), 1000 ) // 91ms / 90ms
console.timeEnd( 'Shape.hasTags(circleDef)' )

console.time( 'circle.move2()' )
R.times( _ => window.circle.move2( 1, 2 ) , 1000 ) // 8.5ms / 8.3ms
console.timeEnd( 'circle.move2()' )
console.time( 'circle.move2()()' )
R.times( _ => window.circle.move2( 1 )( 2 ) , 1000 ) // 9.5ms / 6.3ms
console.timeEnd( 'circle.move2()()' )
console.time( 'circle.move' )
R.times( _ => window.circle.move( [1,2] ), 1000 ) // 17ms / 12.7ms
console.timeEnd( 'circle.move' )

console.time( 'Shape.move2(circle)' )
R.times( _ => Shape.move2( 1, 2, window.circle ) , 1000 ) // 171ms / 23ms
console.timeEnd( 'Shape.move2(circle)' )
console.time( 'Shape.move2(circleDef)' )
R.times( _ => Shape.move2( 1, 2, window.circleDef ) , 1000 ) // 174ms / 100ms
console.timeEnd( 'Shape.move2(circleDef)' )
console.time( 'Shape.move2()()(circleDef)' )
R.times( _ => Shape.move2( 1 )( 2 )( window.circleDef ) , 1000 ) // 153ms / 95ms
console.timeEnd( 'Shape.move2()()(circleDef)' )
console.time( 'Shape.move(circle)' )
R.times( _ => Shape.move( [ 1, 2], window.circle ) , 1000 ) // 104ms / 21ms
console.timeEnd( 'Shape.move(circle)' )
console.time( 'Shape.move(circleDef)' )
R.times( _ => Shape.move( [ 1, 2], window.circleDef ) , 1000 ) // 164ms / 58ms
console.timeEnd( 'Shape.move(circleDef)' )
*/

/*
R.identity( { z: ','
            , '00 ShapeChecks': ShapeChecks()
            , '10 DealChecks': DealChecks()
            //, '20 DealNew_tag': Deal.Deal( { id: null } ).tag
            , '30 BoolChecks': BoolChecks()
            , '50 IntegerOrStringChecks': IntegerOrStringChecks()
            , '60 RegexFlagsChecks': RegexFlagsChecks()
            //, '80 validate': Union.validate( Shape.inferShape( 1, 2, 3 ) )
            //, '90 Right': S.Right(1)
            }
          )
*/
