import babel       from "rollup-plugin-babel"
import builtins    from "rollup-plugin-node-builtins"
import commonjs    from "rollup-plugin-commonjs"
import nodeResolve from "rollup-plugin-node-resolve"
import replace     from "rollup-plugin-replace"
import bundleSize  from "rollup-plugin-bundle-size"
import uglify      from "rollup-plugin-uglify"

export default {
  moduleName: 'createSumTypeFactory' ,
  globals: {
    "sanctuary-def": "$",
    "ramda/src/__": "__",
    "ramda/src/ap": "ap",
    "ramda/src/append": "append",
    "ramda/src/clone": "clone",
    "ramda/src/concat": "concat",
    "ramda/src/contains": "contains",
    "ramda/src/converge": "converge",
    "ramda/src/curryN": "curryN",
    "ramda/src/equals": "equals",
    "ramda/src/findLastIndex": "findLastIndex",
    "ramda/src/find": "find",
    "ramda/src/flatten": "flatten",
    "ramda/src/fromPairs": "fromPairs",
    "ramda/src/init": "init",
    "ramda/src/is": "is",
    "ramda/src/last": "last",
    "ramda/src/lensIndex": "lensIndex",
    "ramda/src/memoize": "memoize",
    "ramda/src/over": "over",
    "ramda/src/path": "path",
    "ramda/src/pluck": "pluck",
    "ramda/src/reduce": "reduce",
    "ramda/src/reduced": "reduced",
    "ramda/src/repeat": "repeat",
    "ramda/src/tap": "tap",
    "ramda/src/toPairs": "toPairs",
    "ramda/src/uniq": "uniq",
    "ramda/src/values": "values",
    "ramda/src/zipObj": "zipObj",

  },
  plugins: [
    replace( {
      "global.setTimeout": "window.setTimeout",
      "global.clearTimeout": "window.clearTimeout",
      "global.performance": "window.performance",
      "process.env.NODE_ENV": JSON.stringify( process.env.NODE_ENV ),
    } ),
    builtins(),
    nodeResolve(),
    commonjs( {
      include: 'node_modules/**',
      namedExports: {
        "node_modules/sanctuary/index.js": [
          "create",
          "env"
        ],
        "node_modules/sanctuary-def/index.js": [
          "create",
          "env"
        ]
      }
    } ),
    babel( { exclude: [ "node_modules/**", "asdfasdf/asdf**" ] } ),
    process.env.NODE_ENV === "production" && uglify({
      compress: {
        passes: 3
      }
    }),
    bundleSize()
  ].filter(x => x)
 }
