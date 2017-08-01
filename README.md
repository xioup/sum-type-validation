# Sum Type Validation
Powerful, flexible, functional sum type / union type / ADT library with a focus on validation -- powered by [sanctuary-def](https://github.com/sanctuary-js/sanctuary-def).

## Installation
I'll add this to npm as soon as I get the packaging worked out.

## Maximum Functionality, Maximum Flexibility
Each of the JavaScript sum type / union type libraries I've researched, and there are a few, offer APIs that fundamentally limit the power and/or flexibility they **can** offer the developer. That's not necessarily a bad thing. If one of the other libraries ([see list](#other_libraries)) does everything you need (and everything you might ever need in the future), and does those things well, this particular library may be overkill.

On the other hand, if you find yourself looking for more power and flexibility from your JavaScript sum type library, this one may be just what the doctor ordered.
 
 In short, with this library, the developer should be able easily to replicate all of the features of the others, while having the option of making use of significant additional functionality, should they so choose.

### Functionality


### Flexibiliity
Unlike most other sum type libraries, this library allows the developer to work in a variety of ways and with practically no restrictions on data:

1. Work with a combination of constructed and bare values.
2. Incorporate complex and simple data types into sum types.
3. Supports fluent (with constructed values) and non fluent (with constructed and bare values) coding styles.
4. Offers mostly static methods with 'faked' instance methods added to constructed values.
5. Offers three ways to define case types: with any valid sanctuary-def type, with a predicate function or with a fixed value.

## Examples and API
Import sanctuary-def and the factory factory and initialize it:

```JavaScript
const $ = require('sanctuary-def')
const SumType = createSumTypeFactory( { checkTypes: true, env: $.env } )
```

Create a simple `Shape` sum type with two cases, `Circle` and `Rect`.

```JavaScript
// Point type to help keep things DRY
const Point = $.Pair( $.ValidNumber )
// SumType( name, version, documentationUrl, cases, functionTypeSignatures )
const Shape = 
  SumType( 'Shape'
         , 1
         , ''
         , [ { tag: 'Circle'
             , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
             }
           , { tag: 'Rect'
             , type: $.RecordType( { origin: Point, sides: Point } )
             }
           ]
         , {}
         )
         
// some convenience objects for reuse in the following examples:
const bareCircle = { origin: [ 0, 0 ], radius: 5 }
const bareRect = { origin: [ 0, 0 ], sides: [ 4, 5 ] }
const bareTriangle = { p1: [ 0, 0 ], p2: [ 0, 5 ], p3: [ 5, 0 ] }
```
Our `Shape` sum type has the following interesting properties and methods:
### `#Circle()` and `#Rect()` (explicit constructors)
```JavaScript
const wrappedCircle = Shape.Circle( bareCircle )
//-> wrapped value with #tag='Circle', #isCircle=true and #value=bareCircle
const wrappedRect = Shape.Rect( bareRect )
//-> wrapped value with #tag='Rect', #isRect=true and #value=bareRect
const oops = Shape.Rect( bareCircle )
//-> TypeError -- bareCircle doesn't match the Rect case
```

### `#Shape()` (generic constructor)
Like `tag`, tests a bare value against each case, starting with the **first case** and short-circuiting as soon as a match is found. When called with a wrapped value, the generic constructor immediately returns an identical copy of the supplied argument.
```JavaScript
Shape.Shape( bareCircle )
//-> wrapped value with #tag='Circle', #isCircle=true and #value=bareCircle
Shape.Shape( bareRect )
//-> wrapped value with #tag='Rect', #isRect=true and #value=bareRect
Shape.Shape( bareTriangle )
//-> TypeError -- bareTriangle doesn't match any of our cases
```
### `#Shape_()` (alternate generic constructor)
Like `tag_`, tests a bare value against each case, starting with the **last case** and short-circuiting as soon as a match is found. When called with a wrapped value, the generic constructor immediately returns an identical copy of the supplied argument.

### `#ShapeType`, `#CircleType`, `#RectType` (valid sanctuary-def types)
These have all of the requisite functionality you'd expect from sanctuary-def types.

### `#hasTags()`
Reports whether a value (bare or wrapped) has or could have all of the specified tags. Like `is` but for multiple tags.
```JavaScript
Shape.hasTags( [ 'Circle' ], wrappedCircle )
//-> true -- wrappedCircle matches the 'Circle' case
Shape.hasTags( [ 'Circle' ], bareCircle )
//-> true -- bareCircle matches the 'Circle' case
Shape.hasTags( [ 'Circle', 'Rect' ], wrappedRect )
//-> false -- wrappedRect doesn't match the 'Circle' case
Shape.hasTags( [ 'Rect' ], bareTriangle )
//-> false -- bareTriangle doesn't match the 'Rect' case
```
### `#is()`
Reports whether a value (bare or wrapped) has or could have the specified tag. Like `hasTags` but for a single tag.

### `#tag()`
Reports the tag a wrapped value has or a bare value would be given. Like `Shape`, tests a bare value against each case, starting with the **first case** and short-circuiting as soon as a match is found.
```JavaScript
Shape.tag( wrappedCircle )
//-> 'Circle'
Shape.tag( bareCircle )
//-> 'Circle'
Shape.tag( 'Rect', wrappedRect )
//-> 'Rect'
Shape.tag( bareTriangle )
//-> null -- bareTriangle doesn't match any case
```
### `#tag_()` 
Reports the tag a wrapped value has or a bare value would be given. Like `Shape_`, tests a bare value against each case, starting with the **last case** and short-circuiting as soon as a match is found.
### `#value()`
Returns the bare value of a wrapped or bare value.
```JavaScript
Shape.value( wrappedCircle )
//-> { origin: [ 0, 0 ], radius: 5 }
Shape.value( bareCircle )
//-> { origin: [ 0, 0 ], radius: 5 }
Shape.value( wrappedRect )
//-> { origin: [ 0, 0 ], sides: [ 4, 5 ] }
Shape.value( bareTriangle )
//-> { p1: [ 0, 0 ], p2: [ 0, 5 ], p3: [ 5, 0 ] }
```

### Functionality
In addition to case-specific constructors offered by most libraries, this library provides a generic constructor for every sum type. Have a `shape` object from an API, but you're not sure whether it's a circle, square or triangle? Pass it to your generic `Shape.Shape()` constructor and, assuming it's a valid `ShapeType`, you'll get a correctly tagged value back.

Sum Types generated with this library are valid sanctuary-def types, and, in addition to a generic type, this library will generate a type for every case

### Flexibility


### Why another sum type library?
Before I started working on this library, I researched the various sum type libraries that were already available on npm. While I found all of them to be useful, I also found each of them to be limiting in ways that made them poor fits for my use case (validation) 

