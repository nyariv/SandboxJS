# SandboxJS - ECMAScript Feature Status

[![codecov](https://codecov.io/gh/nyariv/SandboxJS/branch/main/graph/badge.svg)](https://codecov.io/gh/nyariv/SandboxJS)

This document describes the current implementation status of ECMAScript features in SandboxJS.

**Test Coverage**: 1222 total tests | Code Coverage: ~96% statement coverage, ~90% branch coverage

---

## 🐛 Known Bugs & Limitations

The following limitations have been identified during testing:

1. **Computed property names** - Object/class computed property names are not parsed correctly
2. **Unicode identifier escapes** - `\uXXXX` escape sequences in variable names are not supported
3. **Generator `return()`/`throw()`** - Calling `.return(val)` or `.throw(err)` on a generator iterator is not supported; the current implementation eagerly collects all yielded values
4. **Generator `next(value)` injection** - Sending a value back into a paused generator via `gen.next(value)` is not supported
5. **`yield` as expression value** - Using the result of a yield expression (e.g. `yield n--`) is not supported; use separate statements instead

---

## ✅ Supported Features

SandboxJS supports the following ECMAScript features with comprehensive test coverage:

### Arithmetic Operators

- ✅ **Addition** - `1+1` → `2`
- ✅ **Subtraction** - `1 * 2 + 3 * (4 + 5) * 6` → `164`
- ✅ **Multiplication** - `1 * 2` → `2`
- ✅ **Division** - `1+2*4/5-6+7/8 % 9+10-11-12/13*14` → `-16.448...`
- ✅ **Modulus** - `test2 %= 1` → `0`
- ✅ **Exponentiation** - `2 ** 3` → `8`, `3 ** 2 ** 2` → `81`
- ✅ **Exponentiation assignment** - `test2 **= 0` → `1`
- ✅ **Unary plus** - `+'1'` → `1`
- ✅ **Unary minus** - `-'1'` → `-1`

### Logical Operators

- ✅ **Logical AND** - `true && true || false` → `true`
- ✅ **Logical OR** - `test2 || false` → `3`
- ✅ **Logical NOT** - `!test2` → `false`, `!!test2` → `true`
- ✅ **Nullish coalescing** - `null ?? 'default'` → `'default'`, `0 ?? 'default'` → `0`

### Comparison Operators

- ✅ **Equality** - `test2 == '3'` → `true`
- ✅ **Strict equality** - `test2 === '3'` → `false`
- ✅ **Inequality** - `test2 != '3'` → `false`
- ✅ **Strict inequality** - `test2 !== '3'` → `true`
- ✅ **Less than** - `test2 < 3` → `false`
- ✅ **Greater than** - `test2 > 3` → `false`
- ✅ **Less than or equal** - `test2 <= 3` → `true`
- ✅ **Greater than or equal** - `test2 >= 3` → `true`

### Bitwise Operators

- ✅ **Bitwise AND** - `test2 & 1` → `1`
- ✅ **Bitwise OR** - `test2 | 4` → `7`
- ✅ **Bitwise NOT** - `~test2` → `-2`
- ✅ **Bitwise XOR** - `test2 ^= 1` → `1`
- ✅ **Left shift** - Tested in complex expressions
- ✅ **Right shift** - Tested in complex expressions
- ✅ **Unsigned right shift** - Tested in complex expressions
- ✅ **Left shift assignment** - `let x = 5; x <<= 1` → `10`
- ✅ **Right shift assignment** - `let x = 8; x >>= 1` → `4`
- ✅ **Unsigned right shift assignment** - `let x = 8; x >>>= 2` → `2`
- ✅ **XOR assignment** - `test2 ^= 1` → `1`
- ✅ **AND assignment** - `test2 &= 3` → `1`
- ✅ **OR assignment** - `test2 |= 2` → `3`

### Assignment Operators

- ✅ **Simple assignment** - `test2 = 1` → `1`
- ✅ **Addition assignment** - `test2 += 1` → `2`
- ✅ **Subtraction assignment** - `test2 -= 1` → `1`
- ✅ **Multiplication assignment** - `test2 *= 2` → `2`
- ✅ **Division assignment** - `test2 /= 2` → `1`
- ✅ **Exponentiation assignment** - `test2 **= 0` → `1`
- ✅ **Modulus assignment** - `test2 %= 1` → `0`
- ✅ **XOR assignment** - `test2 ^= 1` → `1`
- ✅ **AND assignment** - `test2 &= 3` → `1`
- ✅ **OR assignment** - `test2 |= 2` → `3`
- ✅ **Logical AND assignment (&&=)** - `let x = 10; x &&= 5` → `5`
- ✅ **Logical OR assignment (||=)** - `let x = 0; x ||= 5` → `5`
- ✅ **Nullish coalescing assignment (??=)** - `let x = null; x ??= 5` → `5`
- ✅ **Post-increment** - `test2++` → `1`
- ✅ **Pre-increment** - `++test2` → `3`

### Other Operators

- ✅ **Conditional (ternary)** - `test[test2] ? true : false ? 'not ok' : 'ok'` → `'ok'`
- ✅ **Optional chaining** - `!({}).a?.a` → `true`, `({}).a?.toString()` → `undefined`
- ✅ **Comma operator** - `1,2` → `2`
- ✅ **typeof** - `typeof '1'` → `'string'`, `typeof x === 'undefined'` → `true`
- ✅ **instanceof** - `{} instanceof Object` → `true`
- ✅ **in operator** - `'a' in {a: 1}` → `true`
- ✅ **delete operator** - `delete 1` → `true`, `let a = {b: 1}; return delete a.b` → `true`
- ✅ **void operator** - `void 2 == '2'` → `false`
- ✅ **new operator** - `new Date(0).toISOString()` → `'1970-01-01T00:00:00.000Z'`

### Data Types

- ✅ **Numbers** - `2.2204460492503130808472633361816E-16` → Scientific notation
- ✅ **BigInt** - `(1n + 0x1n).toString()` → `'2'`
- ✅ **Binary literals** - `0b1010` → `10`, `0B1111` → `15`, `0b1010n` → `'10'` (BigInt), `0b1_000` → `8` (with separators)
- ✅ **Octal literals** - `0o17` → `15`, `0O77` → `63`, `0o17n` → `'15'` (BigInt), `0o7_777` → `4095` (with separators)
- ✅ **Strings** - `"test2"` → `'test2'`
- ✅ **Template literals** - `` `test2 is ${`also ${test2}`}` `` → `'test2 is also 1'`
- ✅ **Tagged template functions** - ``tag`hello ${"world"}` `` → function receives string parts and interpolated values
- ✅ **Escape sequences** - `"\\"` → `'\\'`, `"\\xd9"` → `'Ù'`, `"\\n"` → `'\n'`
- ✅ **Boolean** - `true`, `false`
- ✅ **null** - `null ?? 'default'` → `'default'`
- ✅ **undefined** - `typeof x === 'undefined'` → `true`
- ✅ **Arrays** - `[test2, 2]` → `[1, 2]`
- ✅ **Objects** - `{"aa": test[0](), b: test2 * 3}` → `{ "aa": 1, "b": 3 }`
- ✅ **Regular expressions** - `/a/.test('a')` → `true`, `/a/i.test('A')` → `true`

### Objects & Arrays

- ✅ **Object literals** - `{a: 1, b: 2}` → `{ a: 1, b: 2 }`
- ✅ **Array literals** - `[1, 2]` → `[1, 2]`
- ✅ **Property access (dot)** - `a.b.c` → `2`
- ✅ **Property access (bracket)** - `a['b']['c']` → `2`
- ✅ **Computed property names** - `{"aa": test[0]()}` → `{ "aa": 1 }`
- ✅ **Object spread** - `{a: 1, ...{b: 2, c: {d: test2,}}, e: 5}` → Full object
- ✅ **Array spread** - `[1, ...[2, [test2, 4]], 5]` → `[1, 2, [3, 4], 5]`
- ✅ **Object method shorthand** - `let y = {a: 1, b(x) {return this.a + x}}; return y.b(2)` → `3`

### Functions

- ✅ **Function declarations** - `function f(a) { return a + 1 } return f(2);` → `3`
- ✅ **Function expressions** - `(function () { return 1 })()` → `1`
- ✅ **Arrow functions (single param)** - `(a => a + 1)(1)` → `2`
- ✅ **Arrow functions (multiple params)** - `((a) => {return a + 1})(1)` → `2`
- ✅ **Arrow functions (expression body)** - `(a => a + 1)(1)` → `2`
- ✅ **Arrow functions (block body)** - `(() => {return 1})()` → `1`
- ✅ **Async arrow functions** - `(async () => 1)()` → `1`
- ✅ **Async function expressions** - `(async () => await 1)()` → `1`
- ✅ **Rest parameters** - `[0,1].filter((...args) => args[1])` → `[1]`
- ✅ **Parameter default values** - `function fn(a = 1) { return a; }` → `1`
- ✅ **Spread in function calls** - `Math.pow(...[2, 2])` → `4`
- ✅ **Constructor functions** - `function LinkedListNode(e){this.value=e,this.next=null}` with `new`
- ✅ **Recursive functions** - Linked list reverse example

#### Destructuring
- ✅ **Array destructuring** - `const [a, b] = [1, 2]`
- ✅ **Object destructuring** - `const {a, b} = {a: 1, b: 2}`
- ✅ **Nested destructuring** - `const {a: {b}} = {a: {b: 42}}`
- ✅ **Destructuring with defaults** - `const {a = 1} = {}`
- ✅ **Custom variable names (renaming)** - `const {a: myA} = {a: 1}`
- ✅ **Destructuring in function parameters** - `function fn({a, b}) { }`
- ✅ **Rest in destructuring** - `const [a, ...rest] = [1, 2, 3]`, `const {a, ...rest} = obj`
- ✅ **Computed property names in destructuring** - `const {[key]: val} = obj`
- ✅ **Destructuring in for-of/for-in loops** - `for (const [a, b] of arr) { }`
- ✅ **Destructuring in function parameters with defaults** - `function fn({a = 1, b = 2} = {}) { }`

### Control Flow

#### Conditionals
- ✅ **if statement** - `if (true) { return true; } else return false` → `true`
- ✅ **else statement** - `if (false) { return true; } else return false` → `false`
- ✅ **if/else chains** - `if (false) return true; else if (false) {return true} else return false` → `false`
- ✅ **Nested if statements** - Complex nested if/else with 9 levels
- ✅ **Inline ternary** - `true ? 1 : 2` → `1`

#### Loops
- ✅ **for loop** - `let x; for(let i = 0; i < 2; i++){ x = i }; return x;` → `1`
- ✅ **while loop** - `let x = 2; while(--x){ }; return x;` → `0`
- ✅ **do-while loop** - `let x = 1; do {x++} while(x < 1); return x;` → `2`
- ✅ **for-of loop** - `for(let i of [1,2]){ return i };` → `1`
- ✅ **for-in loop** - `for(let i in [1,2]){ return i };` → `'0'`
- ✅ **break statement** - `for(let i = 0; i < 2; i++){ x = i; break; }` → Exits early
- ✅ **continue statement** - `for (let i = 0; i < 5; i++) { if (i === 2) continue; sum += i; }` → Skips iteration

#### Switch
- ✅ **switch statement** - `switch(1) {case 1: b = 2; break; case 2: b = 3; default: b = 4}; return b` → `2`
- ✅ **case clauses** - Multiple case tests
- ✅ **default clause** - `switch(3) {case 1: b = 2; break; case 2: b = 3; default: b = 4}; return b` → `4`
- ✅ **Fall-through behavior** - `switch(1) {case 1:b = 2; case 2: b = 3; default: b = 4}; return b` → `4`

#### Error Handling
- ✅ **try/catch** - `try {a.x.a} catch {return 1}; return 2` → `1`
- ✅ **try/catch with exception variable** - `try { throw new Error('msg'); } catch(e) { return e.message; }` → `'msg'`
- ✅ **finally block** - `try { return 1; } finally { x = 2; }` → Finally executes before return
- ✅ **finally overrides return** - `try { return 1; } finally { return 2; }` → `2`
- ✅ **finally overrides error** - `try { throw Error('a'); } finally { throw Error('b'); }` → Error: 'b'
- ✅ **throw statement** - `throw new Error('test')` → Error with message

#### Other
- ✅ **Code blocks** - `{let j = 1; i += j;}` → Block scope
- ✅ **this binding** - `let y = {a: 1, b(x) {return this.a + x}}` → Method context
- ✅ **Closures** - `const a = () => {return 1}; const b = () => {return 2}; return (() => a() + b())()` → `3`

### Variables

- ✅ **var declaration** - `var i = 1; return i + 1` → `2`
- ✅ **let declaration** - `let j = 1; return j + 1` → `2`
- ✅ **const declaration** - `const k = 1; return k + 1` → `2`
- ✅ **const immutability** - `const l = 1; return l = 2` → Error

### Async/Await

- ✅ **async functions** - `(async () => 1)()` → Promise resolves to `1`
- ✅ **await keyword** - `(async () => await 1)()` → `1`
- ✅ **await with promises** - `(async () => await (async () => 1)())()` → `1`
- ✅ **async with variables** - `let p = (async () => 1)(); return (async () => 'i = ' + await p)()` → `'i = 1'`
- ✅ **Async arrow functions** - `let i = 0; (async () => i += 1)(); return i;` → `1`
- ✅ **for-await-of loops** - `for await (const item of asyncIterable) { }`

#### Generators (ES6)
- ✅ **Generator functions (function*)** - `function* gen() { yield 1; }`
- ✅ **yield keyword**
- ✅ **yield* delegation**
- ✅ **Async generators** - `async function* gen() { yield 1; }`
- ✅ **Iterator `.return()`/`.throw()`** - Protocol methods for early termination and error injection
- ✅ **`next(value)` injection** - Sending values back into a paused generator

### Other Built-in Objects

- ✅ **WeakMap** - All methods work: `set()`, `get()`, `has()`, `delete()` (6 tests)
- ✅ **WeakSet** - All methods work: `add()`, `has()`, `delete()`

### Comments

- ✅ **Single-line comments** - `1 // 2` → `1`
- ✅ **Multi-line comments** - `/* 2 */ 1` → `1`

### Operator Precedence

Comprehensive operator precedence testing has been implemented with 35 tests covering:
- NOT (!) with comparison operators
- Logical NOT with AND/OR
- Comparison operator chaining
- Bitwise vs logical operators
- Bitwise shift with arithmetic
- Mixed bitwise operators (correct precedence: shift > & > ^ > |)
- Exponentiation (right-associative)
- typeof, delete, void with various operators
- Optional chaining and nullish coalescing
- Increment/decrement with arithmetic
- Multiple unary operators
- Comma operator in expressions

---

## ❌ Not Supported Features

The following ECMAScript features are not currently supported in SandboxJS:

### HIGH PRIORITY

#### Classes (ES6)
- ❌ **class declarations**
- ❌ **extends keyword (inheritance)**
- ❌ **super keyword**
- ❌ **Static methods**
- ❌ **Class fields (public)**
- ❌ **Private fields (#field)**
- ❌ **Private methods**
- ❌ **Static class fields**
- ❌ **Static initialization blocks**

#### Object Features
- ❌ **Getters in object literals** - `{get prop() { return 1; }}`
- ❌ **Setters in object literals** - `{set prop(v) { this.val = v; }}`

### LOW PRIORITY

#### Modules
Module features are not supported by design as SandboxJS is intended for sandboxed code execution:
- ❌ **import statements**
- ❌ **export statements**
- ❌ **Dynamic import()**
- ❌ **import.meta**

#### Other Advanced Features
- ❌ **Trailing commas in function parameters** - `function fn(a, b,) { }`
- ❌ **Async iteration protocols** - `Symbol.asyncIterator`

---

## 🔒 Security-Related Restrictions (Intentionally Blocked)

These features are intentionally blocked for security reasons:

- 🔒 Direct access to global scope
- 🔒 Access to `__proto__` (prototype pollution prevention)
- 🔒 Global object pollution
- 🔒 Prototype method overriding
- 🔒 Access to non-whitelisted globals
- 🔒 Access to non-whitelisted prototype methods
- 🔒 `with` statement
- 🔒 `arguments` object (security risk, use rest parameters `...args` instead)
- 🔒 Execution beyond quota limits

---

## 📝 Notes

- **Priority Levels**:
  - **HIGH**: Common patterns used frequently in production code
  - **MEDIUM**: Less common but still important for completeness
  - **LOW**: Edge cases and advanced features with limited use
- **Implementation Focus**: SandboxJS focuses on core ES5-ES2018 features with strong security controls
- **Performance**: Advanced meta-programming features are omitted to maintain sandbox safety
