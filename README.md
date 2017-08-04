# Sum Type Validation
Powerful, flexible, functional sum type / union type / ADT library with a focus on validation. For use in the browser or with nodejs. Currently around 16KB minified and gzipped (including dependencies) or around 4KB minified and gzipped on its own.
 
Powered by [sanctuary-def](https://github.com/sanctuary-js/sanctuary-def).

## Installation
I'll add this to npm as soon as I get the packaging worked out.

## Maximum Functionality, Maximum Flexibility
Each of the JavaScript sum type / union type libraries I've researched, and there are a few, offer APIs that limit the power and/or flexibility they **can** offer the developer. That's not necessarily a bad thing. If one of the other libraries ([see list](#other_libraries)) does everything you need (and everything you might need in the future), and does those things well, this particular library is probably overkill.

On the other hand, if you find yourself looking for more power and flexibility from your JavaScript sum type library, this may be just what the doctor ordered.
 
In short, it is my intention that this library will enable the developer to easily replicate all of the features of the others while offering significant additional functionality that the developer may choose to incorporate in their application.

### Functionality
1. In addition to case-specific constructors offered by most libraries, this library creates a generic constructor for every sum type. Have a `shape` object from an API, but you're not sure whether it's a circle, square or triangle? Pass it to your generic `Shape()` constructor and, assuming it's a valid `Shape.Type`, you'll get a tagged value back.

2. Sum types generated with this library are valid sanctuary-def types, and, in addition to the generic type created for each sum type, the factory generates a single, specific type for each case the developer specifies.

3. This library provides a number of methods (i.e. `hasTags`, `is`, `tag` and `tags`, as well as the generic type and constructor) that the developer can use to classify bare values from external sources (e.g. APIs and user input) as well as constructed values.

4. The library obviates the need for `switch...case` statements in polymorphic methods and helps ensure (but doesn't guarantee) that each method defined on a sum type covers data matching every case included in the type.

5. Standard and user-defined methods are properly `def`ined (in [sanctuary-def](https://github.com/sanctuary-js/sanctuary-def#sanctuary-def) terms) and will be type-checked at run time when type-checking is enabled.

6. This library does not mutate the data it's given to work with. Furthermore, it helps enforce immutability by cloning and freezing constructed objects when type-checking is enabled.

\* For performance reasons, the developer may wish to enable type-checking in the development environment while disabling it in production. 

### Flexibiliity
Unlike most other sum type libraries, this library allows the developer to work in a variety of ways and with practically no restrictions on data:

1. Work with a combination of constructed and bare values.
2. Incorporate complex and simple data types into sum types. Most libraries only work with either constructed values or complex data types (i.e. objects), which can require extra work when you need to serialize the data.
3. Supports fluent (with constructed values) and non fluent (with constructed and bare values) coding styles.
4. Offers mostly static methods with instance methods automatically added to constructed values.
5. Offers three ways to define case types: using any valid sanctuary-def type, using a predicate function or using a fixed value.

## Examples
Import sanctuary-def and the factory factory and initialize it:

```JavaScript
const $ = require('sanctuary-def')
const createSumTypeFactory = require('sum-type-validation')
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
         , 'http://url.to.documentation'
         , [ { tag: 'Circle'
             , type: $.RecordType( { origin: Point, radius: $.ValidNumber } )
             }
           , { tag: 'Rect'
             , type: $.RecordType( { origin: Point, sides: Point } )
             }
           ]
         , {}
         )

// bare values for reuse in the following examples:
const bareCircle = { origin: [ 0, 0 ], radius: 5 }
const bareRect = { origin: [ 0, 0 ], sides: [ 4, 5 ] }
const bareTriangle = { origin: [ 0, 0 ], p2: [ 0, 5 ], p3: [ 5, 0 ] }
```
Our `Shape` sum type has the following interesting properties and methods:

### `Shape()` (generic constructor)
Like `tag`, tests a bare value against each case, starting with the **first case** and short-circuiting as soon as a match is found. When called with a wrapped value, the generic constructor immediately returns an identical copy of the supplied argument.
```JavaScript
Shape( bareCircle )
//-> wrapped value with #tag='Circle', #isCircle=true and #value=bareCircle
Shape( bareRect )
//-> wrapped value with #tag='Rect', #isRect=true and #value=bareRect
Shape( bareTriangle )
//-> TypeError -- bareTriangle doesn't match any of our cases
````

### `#Circle()` and `#Rect()` (explicit constructors)
```JavaScript
const wrappedCircle = Shape.Circle( bareCircle )
//-> wrapped value with #tag='Circle', #isCircle=true and #value=bareCircle
const wrappedRect = Shape.Rect( bareRect )
//-> wrapped value with #tag='Rect', #isRect=true and #value=bareRect
const oops = Shape.Rect( bareCircle )
//-> TypeError -- bareCircle doesn't match the Rect case
```

### `#Type`, `#Circle#Type`, `#Rect#Type` (valid sanctuary-def types)
These offer all of the functionality you'd expect from valid sanctuary-def types.

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
Reports the tag a wrapped value has or a bare value would be given. Tests a bare value against each case, starting with the **last case** and short-circuiting as soon as a match is found.

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

### Why another sum type library?
Before I started working on this library, I researched the various sum type libraries that were already available on npm. While I found all of them to be useful, I also found each of them to be limiting in ways that made them less than optimal fits for my use case (data classification and validation). I read up on sum types in Haskell and tried to develop an API that mimics Haskell's behavior to the extent that that's possible in JavaScript, while also  

