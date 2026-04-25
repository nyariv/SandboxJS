const require_errors = require("./errors.js");
//#region src/utils/functionReplacements.ts
/**
* Checks if adding `expectTicks` would exceed the tick limit, and throws SandboxExecutionQuotaExceededError
* (which bypasses user try/catch) if so. Otherwise increments the tick counter.
*/
function checkTicksAndThrow(ctx, expectTicks) {
	const { ticks } = ctx.ctx;
	if (ticks.tickLimit !== void 0 && ticks.tickLimit <= ticks.ticks + expectTicks) throw new require_errors.SandboxExecutionQuotaExceededError("Execution quota exceeded");
	ticks.ticks += expectTicks;
}
var typedArrayProtos = new Set([
	Int8Array,
	Uint8Array,
	Uint8ClampedArray,
	Int16Array,
	Uint16Array,
	Int32Array,
	Uint32Array,
	Float32Array,
	Float64Array
].map((T) => Object.getPrototypeOf(T.prototype)));
function isTypedArray(obj) {
	return ArrayBuffer.isView(obj) && !(obj instanceof DataView) && typedArrayProtos.has(Object.getPrototypeOf(Object.getPrototypeOf(obj)));
}
function makeReplacement(original, getTicks) {
	return (ctx) => function(...args) {
		checkTicksAndThrow(ctx, getTicks(this, args));
		return original.apply(this, args);
	};
}
var arr = [];
var arrProto = Array.prototype;
function arrayTicks(complexity, original) {
	return (thisArg, args) => {
		if (!Array.isArray(thisArg)) return 0n;
		const n = BigInt(thisArg.length);
		switch (complexity) {
			case "one": return 1n;
			case "n": return n;
			case "nlogn": return thisArg.length <= 1 ? 1n : n * BigInt(Math.round(Math.log2(thisArg.length)));
			case "arrs": {
				let ticks = 0n;
				const maxDepth = original === arr.flat ? typeof args[0] === "number" ? args[0] : 1 : 1;
				const recurse = (a, depth = 0) => {
					ticks += BigInt(a.length);
					if (depth >= maxDepth) return;
					for (const item of a) if (Array.isArray(item)) recurse(item, depth + 1);
				};
				recurse(thisArg);
				return ticks;
			}
		}
	};
}
var arrayReplacementDefs = [
	[arr.push, "one"],
	[arr.pop, "one"],
	[arrProto.at, "one"],
	[arr.fill, "n"],
	[arr.includes, "n"],
	[arr.indexOf, "n"],
	[arr.lastIndexOf, "n"],
	[arr.find, "n"],
	[arr.findIndex, "n"],
	[arrProto.findLast, "n"],
	[arrProto.findLastIndex, "n"],
	[arr.forEach, "n"],
	[arr.map, "n"],
	[arr.filter, "n"],
	[arr.reduce, "n"],
	[arr.reduceRight, "n"],
	[arr.every, "n"],
	[arr.some, "n"],
	[arr.join, "n"],
	[arr.reverse, "n"],
	[arr.shift, "n"],
	[arr.unshift, "n"],
	[arr.splice, "n"],
	[arr.slice, "n"],
	[arr.copyWithin, "n"],
	[arr.entries, "n"],
	[arr.keys, "n"],
	[arr.values, "n"],
	[arrProto.toReversed, "n"],
	[arrProto.toSpliced, "n"],
	[arrProto.with, "n"],
	[arr.toString, "n"],
	[arr.toLocaleString, "n"],
	[arr.sort, "nlogn"],
	[arrProto.toSorted, "nlogn"],
	[arr.flat, "arrs"],
	[arr.flatMap, "arrs"],
	[arr.concat, "arrs"]
];
var str = "";
var strProto = String.prototype;
function stringTicks(complexity) {
	return (thisArg) => {
		if (typeof thisArg !== "string") return 0n;
		return complexity === "one" ? 1n : BigInt(thisArg.length);
	};
}
var stringReplacementDefs = [
	[str.charAt, "one"],
	[str.charCodeAt, "one"],
	[str.codePointAt, "one"],
	[strProto.at, "one"],
	[str.indexOf, "n"],
	[str.lastIndexOf, "n"],
	[str.includes, "n"],
	[str.startsWith, "n"],
	[str.endsWith, "n"],
	[str.slice, "n"],
	[str.substring, "n"],
	[str.padStart, "n"],
	[str.padEnd, "n"],
	[str.repeat, "n"],
	[str.split, "n"],
	[str.replace, "n"],
	[strProto.replaceAll, "n"],
	[str.match, "n"],
	[str.matchAll, "n"],
	[str.search, "n"],
	[str.trim, "n"],
	[str.trimStart, "n"],
	[str.trimEnd, "n"],
	[str.toLowerCase, "n"],
	[str.toUpperCase, "n"],
	[str.toLocaleLowerCase, "n"],
	[str.toLocaleUpperCase, "n"],
	[str.normalize, "n"],
	[str.concat, "n"],
	[str.toString, "n"],
	[str.valueOf, "n"]
];
var _map = /* @__PURE__ */ new Map();
var mapReplacementDefs = [
	[_map.get, "one"],
	[_map.set, "one"],
	[_map.has, "one"],
	[_map.delete, "one"],
	[_map.keys, "n"],
	[_map.values, "n"],
	[_map.entries, "n"],
	[_map.forEach, "n"],
	[_map.clear, "n"]
];
function mapTicks(complexity) {
	return (thisArg) => {
		if (!(thisArg instanceof Map)) return 0n;
		return complexity === "one" ? 1n : BigInt(thisArg.size);
	};
}
var _set = /* @__PURE__ */ new Set();
var setReplacementDefs = [
	[_set.add, "one"],
	[_set.has, "one"],
	[_set.delete, "one"],
	[_set.values, "n"],
	[_set.keys, "n"],
	[_set.entries, "n"],
	[_set.forEach, "n"],
	[_set.clear, "n"]
];
function setTicks(complexity) {
	return (thisArg) => {
		if (!(thisArg instanceof Set)) return 0n;
		return complexity === "one" ? 1n : BigInt(thisArg.size);
	};
}
var typedArrayReplacementDefs = [];
for (const proto of typedArrayProtos) {
	if (proto.at) typedArrayReplacementDefs.push([proto.at, "one"]);
	if (proto.set) typedArrayReplacementDefs.push([proto.set, "one"]);
	for (const m of [
		"fill",
		"find",
		"findIndex",
		"findLast",
		"findLastIndex",
		"includes",
		"indexOf",
		"lastIndexOf",
		"forEach",
		"map",
		"filter",
		"reduce",
		"reduceRight",
		"every",
		"some",
		"join",
		"reverse",
		"slice",
		"subarray",
		"copyWithin",
		"entries",
		"keys",
		"values",
		"toReversed",
		"with",
		"toString",
		"toLocaleString"
	]) if (proto[m]) typedArrayReplacementDefs.push([proto[m], "n"]);
	if (proto.sort) typedArrayReplacementDefs.push([proto.sort, "nlogn"]);
	if (proto.toSorted) typedArrayReplacementDefs.push([proto.toSorted, "nlogn"]);
}
function typedArrayTicks(complexity) {
	return (thisArg) => {
		if (!isTypedArray(thisArg)) return 0n;
		const n = BigInt(thisArg.length);
		switch (complexity) {
			case "one": return 1n;
			case "n": return n;
			case "nlogn": return thisArg.length <= 1 ? 1n : n * BigInt(Math.round(Math.log2(thisArg.length)));
		}
	};
}
var mathReplacementDefs = [
	[Math.max],
	[Math.min],
	[Math.hypot]
];
var _re = /x/;
var regexpReplacementDefs = [
	_re.exec,
	_re.test,
	_re[Symbol.match],
	_re[Symbol.matchAll],
	_re[Symbol.replace],
	_re[Symbol.search],
	_re[Symbol.split]
];
var promiseReplacementDefs = [
	Promise.all,
	Promise.allSettled,
	Promise.race,
	...typeof Promise.any === "function" ? [Promise.any] : []
];
var objectReplacementDefs = [
	[Object.prototype.hasOwnProperty, "one"],
	[Object.prototype.propertyIsEnumerable, "one"],
	[Object.prototype.isPrototypeOf, "one"],
	[Object.create, "one"],
	[Object.getPrototypeOf, "one"],
	[Object.setPrototypeOf, "one"],
	[Object.is, "one"],
	[Object.defineProperty, "one"],
	[Object.getOwnPropertyDescriptor, "one"],
	[Object.isExtensible, "one"],
	[Object.preventExtensions, "one"],
	[Object.keys, "n"],
	[Object.values, "n"],
	[Object.entries, "n"],
	[Object.assign, "n"],
	[Object.fromEntries, "n"],
	[Object.getOwnPropertyNames, "n"],
	[Object.getOwnPropertySymbols, "n"],
	[Object.getOwnPropertyDescriptors, "n"],
	[Object.freeze, "n"],
	[Object.seal, "n"],
	[Object.isFrozen, "n"],
	[Object.isSealed, "n"]
];
function objectTicks(complexity, isStatic) {
	return (thisArg, args) => {
		if (complexity === "one") return 1n;
		const target = isStatic ? args[0] : thisArg;
		if (target !== null && typeof target === "object") return BigInt(Object.keys(target).length);
		return 1n;
	};
}
var staticObjectMethods = new Set([
	Object.keys,
	Object.values,
	Object.entries,
	Object.assign,
	Object.fromEntries,
	Object.getOwnPropertyNames,
	Object.getOwnPropertySymbols,
	Object.getOwnPropertyDescriptors,
	Object.freeze,
	Object.seal,
	Object.isFrozen,
	Object.isSealed
]);
var DEFAULT_FUNCTION_REPLACEMENTS = /* @__PURE__ */ new Map();
var THIS_DEPENDENT_FUNCTION_REPLACEMENTS = /* @__PURE__ */ new Set();
for (const [original, complexity] of arrayReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, arrayTicks(complexity, original)));
	THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
for (const [original, complexity] of stringReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, stringTicks(complexity)));
	THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
for (const [original, complexity] of mapReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, mapTicks(complexity)));
	THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
for (const [original, complexity] of setReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, setTicks(complexity)));
	THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
for (const [original, complexity] of typedArrayReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, typedArrayTicks(complexity)));
	THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
for (const [original] of mathReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, (_thisArg, args) => BigInt(args.length)));
}
for (const original of [JSON.parse, JSON.stringify]) DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, (_thisArg, args) => {
	const target = args[0];
	if (typeof target === "string") return BigInt(target.length);
	if (target !== null && typeof target === "object") return BigInt(Object.keys(target).length);
	return 1n;
}));
for (const original of regexpReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, (_thisArg, args) => {
		const input = args[0];
		return typeof input === "string" ? BigInt(input.length) : 1n;
	}));
	THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
for (const original of promiseReplacementDefs) {
	if (!original) continue;
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, (_thisArg, args) => {
		const iterable = args[0];
		return Array.isArray(iterable) ? BigInt(iterable.length) : 0n;
	}));
}
for (const [original, complexity] of objectReplacementDefs) {
	if (!original) continue;
	const isStatic = staticObjectMethods.has(original);
	DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, objectTicks(complexity, isStatic)));
	if (!isStatic) THIS_DEPENDENT_FUNCTION_REPLACEMENTS.add(original);
}
if (Array.from) DEFAULT_FUNCTION_REPLACEMENTS.set(Array.from, makeReplacement(Array.from, (_thisArg, args) => {
	const source = args[0];
	if (source != null && typeof source.length === "number") return BigInt(source.length);
	return 0n;
}));
if (typeof Array.fromAsync === "function") {
	const fromAsync = Array.fromAsync;
	DEFAULT_FUNCTION_REPLACEMENTS.set(fromAsync, makeReplacement(fromAsync, (_thisArg, args) => {
		const source = args[0];
		if (source != null && typeof source.length === "number") return BigInt(source.length);
		return 0n;
	}));
}
//#endregion
exports.DEFAULT_FUNCTION_REPLACEMENTS = DEFAULT_FUNCTION_REPLACEMENTS;
exports.THIS_DEPENDENT_FUNCTION_REPLACEMENTS = THIS_DEPENDENT_FUNCTION_REPLACEMENTS;
exports.checkTicksAndThrow = checkTicksAndThrow;
exports.typedArrayProtos = typedArrayProtos;
