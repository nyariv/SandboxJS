[![GitHub](https://img.shields.io/github/license/nyariv/SandboxJS)](https://github.com/nyariv/SandboxJS/blob/main/LICENSE) ![npm (scoped)](https://img.shields.io/npm/v/@nyariv/sandboxjs) ![Package size gzipped](https://img.shields.io/bundlephobia/minzip/@nyariv/sandboxjs) [![GitHub issues](https://img.shields.io/github/issues-raw/nyariv/SandboxJS)](https://github.com/nyariv/SandboxJS/issues)

# SandboxJS - Safe eval runtime

This is a javascript sandboxing library. When embedding any kind of js code inside your app (either web or nodejs based) you are essentially giving access to the entire kingdom, hoping there is no malicious code in a dependency such as with supply chain attacks. For securing code, sandboxing is needed.

>  a "sandbox" is a security mechanism for separating running programs, usually in an effort to mitigate system failures or software vulnerabilities from spreading. It is often used to execute untested or untrusted programs or code, possibly from unverified or untrusted third parties, suppliers, users or websites, without risking harm to the host machine or operating system. - Wikipedia

There are many vulnerable modules available on the global scope of a js environment, and unfortunately it is way to easy to get access to that if 3rd party code is allowed to be included. The main way is through the `eval` or `Function` globals because they execute code in the global context. Trying to block access to some global components through proxies or limiting scope variables is fruitless because of one main issue: _every function inherits the `Function` prototype, and can invoke `eval` by calling its constructor_, essentially making `eval` at most two properties away from anything in js.

Example:
```javascript
[].filter.constructor("alert('jailbreak')")()
```

To make matters worse, it is extremely difficult to blacklist functions because code is easily obfuscated. For example, it is possible to execute anything using only `(`, `)`, `[`, `]`, `!`, and `+`. ([source](http://www.jsfuck.com/))

```javascript
[+!+[]]+[] // This evaluates to the number one, go a head type that in console
```

**SandboxJS** solves this problem by parsing js code and executing it though its own js runtime, while in the process checking every single prototype function that is being called. This allows whitelisting anything and everything, regardless of obfuscation.

This means that you can potentially give different libraries different permissions, such as allowing `fetch()` for one library, or allowing access to the `Node` prototype for another, depending what the library requires and nothing more, and any objects that are gotten from the sandbox will remain sandboxed when used outside of it.

Additionaly, `eval` and `Function` are sandboxed as well, and can be used recursively safely, which is why they are considered safe globals in SandboxJS.

There is an `audit` method that will return all the accessed functions and prototypes during runtime if you need to know what permissions to give a certain library.

Since parsing and executing are separated, execution with SandboxJS can be sometimes even faster than `eval`, allowing to prepare the execution code ahead of time.

## Installation

```
npm install @nyariv/sandboxjs
```

## Usage

The following is the bare minimum of code for using SandboxJS. This assumes safe whilelisted defaults.

```javascript
const code = `return myTest;`;
const scope = { myTest: "hello world" };
const sandbox = new Sandbox();
const exec = sandbox.compile(code);
const result = exec(scope).run(); // result: "hello world"
```

It is possible to defined multiple scopes in case you are reusing scopes with multiple layers.

```javascript
const sandbox = new Sandbox();

const scopeA = {a: 1};
const scopeB = {b: 2};
const scopeC = {c: 3};

const code = `a = 4; let d = 5; let b = 6`;
const exec = sandbox.compile(code);
exec(scopeA, scopeB, scopeC).run();

console.log(scopeA); // {a: 4}
console.log(scopeB); // {b: 2}
console.log(scopeC); // {c: 3, d: 5, b: 6}
```

You can set your own whilelisted prototypes and global properties like so (`alert` and `Node` are added to whitelist in the following code):

```javascript
const prototypeWhitelist = Sandbox.SAFE_PROTOTYPES;
prototypeWhitelist.set(Node, new Set());

const globals = {...Sandbox.SAFE_GLOBALS, alert};

const sandbox = new Sandbox({globals, prototypeWhitelist});
```

You can audit a piece of code, which will permit all globals and prototypes but will return a json with accessed globals and prototypes over time.

```javascript
const code = `console.log("test")`;
console.log(Sandbox.audit(code));
```

## Safe Globals

- `Function`
- `eval`
- `console`
- `isFinite`
- `isNaN`
- `parseFloat`
- `parseInt`
- `decodeURI`
- `decodeURIComponent`
- `encodeURI`
- `encodeURIComponent`
- `escape`
- `unescape`
- `Boolean`
- `Number`
- `BigInt`
- `String`
- `Object`
- `Array`
- `Symbol`
- `Error`
- `EvalError`
- `RangeError`
- `ReferenceError`
- `SyntaxError`
- `TypeError`
- `URIError`
- `Int8Array`
- `Uint8Array`
- `Uint8ClampedArray`
- `Int16Array`
- `Uint16Array`
- `Int32Array`
- `Uint32Array`
- `Float32Array`
- `Float64Array`
- `Map`
- `Set`
- `WeakMap`
- `WeakSet`
- `Promise`
- `Intl`
- `JSON`
- `Math`

# Safe Prototypes

- `SandboxGlobal`
- `Function`
- `Boolean`
- `Object`
- `Number`
- `BigInt`
- `String`
- `Date`
- `RegExp`
- `Error`
- `Array`
- `Int8Array`
- `Uint8Array`
- `Uint8ClampedArray`
- `Int16Array`
- `Uint16Array`
- `Int32Array`
- `Uint32Array`
- `Float32Array`
- `Float64Array`
- `Map`
- `Set`
- `WeakMap`
- `WeakSet`
- `Promise`

## Goals

|Feature|Status|
|---|---|
|Prototype access protection|done|
|Globals access protection|done|
|Prototype proxying|done|
|Single line sandboxing|done|
|Multi line sandboxing|done|
|Functions support|done|
|Audit prototype and globals access|done|
|Code blocks (try/catch, ifs, and loops)|done|
|Async/await|done|
|Execution time protection|done|
|Extensibility|done|
|Full ECMAScript support|90%|
|Script source and import sandboxing|Won't fix - handled by 3rd party|
|DOM ownership and inherited permissions|See [scope-js](https://github.com/nyariv/scope-js)|
|Tests|done|
