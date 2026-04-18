import type { IContext, IExecContext } from './types';
import { SandboxExecutionQuotaExceededError } from './errors';

/**
 * Checks if adding `expectTicks` would exceed the tick limit, and throws SandboxExecutionQuotaExceededError
 * (which bypasses user try/catch) if so. Otherwise increments the tick counter.
 */
export function checkTicksAndThrow(ctx: IExecContext, expectTicks: bigint): void {
  const { ticks } = ctx.ctx;
  if (ticks.tickLimit !== undefined && ticks.tickLimit <= ticks.ticks + expectTicks) {
    throw new SandboxExecutionQuotaExceededError('Execution quota exceeded');
  }
  ticks.ticks += expectTicks;
}

// ---------------------------------------------------------------------------
// TypedArray shared prototype detection (mirrors call.ts)
// ---------------------------------------------------------------------------

const _typedArrayCtors = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
];
export const typedArrayProtos = new Set(
  _typedArrayCtors.map((T) => Object.getPrototypeOf(T.prototype) as any),
);

function isTypedArray(obj: unknown): obj is { length: number } {
  return (
    ArrayBuffer.isView(obj) &&
    !(obj instanceof DataView) &&
    typedArrayProtos.has(Object.getPrototypeOf(Object.getPrototypeOf(obj)))
  );
}

// ---------------------------------------------------------------------------
// Helpers to build replacements
// ---------------------------------------------------------------------------

type Factory = (ctx: IExecContext) => Function;

function makeReplacement(
  original: Function,
  getTicks: (thisArg: unknown, args: unknown[]) => bigint,
): Factory {
  return (ctx: IExecContext) =>
    function (this: unknown, ...args: unknown[]) {
      checkTicksAndThrow(ctx, getTicks(this, args));
      return (original as any).apply(this, args);
    };
}

// ---------------------------------------------------------------------------
// Array replacements
// ---------------------------------------------------------------------------

const arr: any[] = [];
const arrProto = Array.prototype as any;

function arrayTicks(
  complexity: 'one' | 'n' | 'nlogn' | 'arrs',
  original: Function,
): (thisArg: unknown, args: unknown[]) => bigint {
  return (thisArg, args) => {
    if (!Array.isArray(thisArg)) return 0n;
    const n = BigInt(thisArg.length);
    switch (complexity) {
      case 'one':
        return 1n;
      case 'n':
        return n;
      case 'nlogn':
        return thisArg.length <= 1 ? 1n : n * BigInt(Math.round(Math.log2(thisArg.length)));
      case 'arrs': {
        let ticks = 0n;
        const maxDepth = original === arr.flat ? (typeof args[0] === 'number' ? args[0] : 1) : 1;
        const recurse = (a: unknown[], depth = 0) => {
          ticks += BigInt(a.length);
          if (depth >= maxDepth) return;
          for (const item of a) {
            if (Array.isArray(item)) recurse(item, depth + 1);
          }
        };
        recurse(thisArg);
        return ticks;
      }
    }
  };
}

const arrayReplacementDefs: [Function, 'one' | 'n' | 'nlogn' | 'arrs'][] = [
  // O(1)
  [arr.push, 'one'],
  [arr.pop, 'one'],
  [arrProto.at, 'one'],
  // O(n)
  [arr.fill, 'n'],
  [arr.includes, 'n'],
  [arr.indexOf, 'n'],
  [arr.lastIndexOf, 'n'],
  [arr.find, 'n'],
  [arr.findIndex, 'n'],
  [arrProto.findLast, 'n'],
  [arrProto.findLastIndex, 'n'],
  [arr.forEach, 'n'],
  [arr.map, 'n'],
  [arr.filter, 'n'],
  [arr.reduce, 'n'],
  [arr.reduceRight, 'n'],
  [arr.every, 'n'],
  [arr.some, 'n'],
  [arr.join, 'n'],
  [arr.reverse, 'n'],
  [arr.shift, 'n'],
  [arr.unshift, 'n'],
  [arr.splice, 'n'],
  [arr.slice, 'n'],
  [arr.copyWithin, 'n'],
  [arr.entries, 'n'],
  [arr.keys, 'n'],
  [arr.values, 'n'],
  [arrProto.toReversed, 'n'],
  [arrProto.toSpliced, 'n'],
  [arrProto.with, 'n'],
  [arr.toString, 'n'],
  [arr.toLocaleString, 'n'],
  // O(n log n)
  [arr.sort, 'nlogn'],
  [arrProto.toSorted, 'nlogn'],
  // O(n) across arrays
  [arr.flat, 'arrs'],
  [arr.flatMap, 'arrs'],
  [arr.concat, 'arrs'],
];

// ---------------------------------------------------------------------------
// String replacements
// ---------------------------------------------------------------------------

const str = '';
const strProto = String.prototype as any;

function stringTicks(complexity: 'one' | 'n'): (thisArg: unknown, _args: unknown[]) => bigint {
  return (thisArg) => {
    if (typeof thisArg !== 'string') return 0n;
    return complexity === 'one' ? 1n : BigInt(thisArg.length);
  };
}

const stringReplacementDefs: [Function, 'one' | 'n'][] = [
  // O(1)
  [str.charAt, 'one'],
  [str.charCodeAt, 'one'],
  [str.codePointAt, 'one'],
  [strProto.at, 'one'],
  // O(n)
  [str.indexOf, 'n'],
  [str.lastIndexOf, 'n'],
  [str.includes, 'n'],
  [str.startsWith, 'n'],
  [str.endsWith, 'n'],
  [str.slice, 'n'],
  [str.substring, 'n'],
  [str.padStart, 'n'],
  [str.padEnd, 'n'],
  [str.repeat, 'n'],
  [str.split, 'n'],
  [str.replace, 'n'],
  [strProto.replaceAll, 'n'],
  [str.match, 'n'],
  [str.matchAll, 'n'],
  [str.search, 'n'],
  [str.trim, 'n'],
  [str.trimStart, 'n'],
  [str.trimEnd, 'n'],
  [str.toLowerCase, 'n'],
  [str.toUpperCase, 'n'],
  [str.toLocaleLowerCase, 'n'],
  [str.toLocaleUpperCase, 'n'],
  [str.normalize, 'n'],
  [str.concat, 'n'],
  [str.toString, 'n'],
  [str.valueOf, 'n'],
];

// ---------------------------------------------------------------------------
// Map replacements
// ---------------------------------------------------------------------------

const _map = new Map<never, never>();

const mapReplacementDefs: [Function, 'one' | 'n'][] = [
  [_map.get, 'one'],
  [_map.set, 'one'],
  [_map.has, 'one'],
  [_map.delete, 'one'],
  [_map.keys, 'n'],
  [_map.values, 'n'],
  [_map.entries, 'n'],
  [_map.forEach, 'n'],
  [_map.clear, 'n'],
];

function mapTicks(complexity: 'one' | 'n'): (thisArg: unknown, _args: unknown[]) => bigint {
  return (thisArg) => {
    if (!(thisArg instanceof Map)) return 0n;
    return complexity === 'one' ? 1n : BigInt(thisArg.size);
  };
}

// ---------------------------------------------------------------------------
// Set replacements
// ---------------------------------------------------------------------------

const _set = new Set<never>();

const setReplacementDefs: [Function, 'one' | 'n'][] = [
  [_set.add, 'one'],
  [_set.has, 'one'],
  [_set.delete, 'one'],
  [_set.values, 'n'],
  [_set.keys, 'n'],
  [_set.entries, 'n'],
  [_set.forEach, 'n'],
  [_set.clear, 'n'],
];

function setTicks(complexity: 'one' | 'n'): (thisArg: unknown, _args: unknown[]) => bigint {
  return (thisArg) => {
    if (!(thisArg instanceof Set)) return 0n;
    return complexity === 'one' ? 1n : BigInt(thisArg.size);
  };
}

// ---------------------------------------------------------------------------
// TypedArray replacements
// ---------------------------------------------------------------------------

const typedArrayReplacementDefs: [Function, 'one' | 'n' | 'nlogn'][] = [];
for (const proto of typedArrayProtos) {
  if (proto.at) typedArrayReplacementDefs.push([proto.at, 'one']);
  if (proto.set) typedArrayReplacementDefs.push([proto.set, 'one']);
  const nMethods = [
    'fill',
    'find',
    'findIndex',
    'findLast',
    'findLastIndex',
    'includes',
    'indexOf',
    'lastIndexOf',
    'forEach',
    'map',
    'filter',
    'reduce',
    'reduceRight',
    'every',
    'some',
    'join',
    'reverse',
    'slice',
    'subarray',
    'copyWithin',
    'entries',
    'keys',
    'values',
    'toReversed',
    'with',
    'toString',
    'toLocaleString',
  ] as const;
  for (const m of nMethods) {
    if (proto[m]) typedArrayReplacementDefs.push([proto[m], 'n']);
  }
  if (proto.sort) typedArrayReplacementDefs.push([proto.sort, 'nlogn']);
  if (proto.toSorted) typedArrayReplacementDefs.push([proto.toSorted, 'nlogn']);
}

function typedArrayTicks(
  complexity: 'one' | 'n' | 'nlogn',
): (thisArg: unknown, _args: unknown[]) => bigint {
  return (thisArg) => {
    if (!isTypedArray(thisArg)) return 0n;
    const n = BigInt(thisArg.length);
    switch (complexity) {
      case 'one':
        return 1n;
      case 'n':
        return n;
      case 'nlogn':
        return (thisArg as any).length <= 1
          ? 1n
          : n * BigInt(Math.round(Math.log2((thisArg as any).length)));
    }
  };
}

// ---------------------------------------------------------------------------
// Math replacements
// ---------------------------------------------------------------------------

const mathReplacementDefs: [Function][] = [[Math.max], [Math.min], [Math.hypot]];

// ---------------------------------------------------------------------------
// JSON replacements
// ---------------------------------------------------------------------------

// (JSON.stringify with subscription traversal is handled separately in LispType.Call)

// ---------------------------------------------------------------------------
// RegExp replacements
// ---------------------------------------------------------------------------

const _re = /x/;

const regexpReplacementDefs: Function[] = [
  _re.exec,
  _re.test,
  (_re as any)[Symbol.match],
  (_re as any)[Symbol.matchAll],
  (_re as any)[Symbol.replace],
  (_re as any)[Symbol.search],
  (_re as any)[Symbol.split],
];

// ---------------------------------------------------------------------------
// Promise replacements
// ---------------------------------------------------------------------------

const promiseReplacementDefs: Function[] = [
  Promise.all,
  Promise.allSettled,
  Promise.race,
  ...(typeof (Promise as any).any === 'function' ? [(Promise as any).any] : []),
];

// ---------------------------------------------------------------------------
// Object replacements
// ---------------------------------------------------------------------------

const objectReplacementDefs: [Function, 'one' | 'n'][] = [
  [Object.prototype.hasOwnProperty, 'one'],
  [Object.prototype.propertyIsEnumerable, 'one'],
  [Object.prototype.isPrototypeOf, 'one'],
  [Object.create, 'one'],
  [Object.getPrototypeOf, 'one'],
  [Object.setPrototypeOf, 'one'],
  [Object.is, 'one'],
  [Object.defineProperty, 'one'],
  [Object.getOwnPropertyDescriptor, 'one'],
  [Object.isExtensible, 'one'],
  [Object.preventExtensions, 'one'],
  [Object.keys, 'n'],
  [Object.values, 'n'],
  [Object.entries, 'n'],
  [Object.assign, 'n'],
  [Object.fromEntries, 'n'],
  [Object.getOwnPropertyNames, 'n'],
  [Object.getOwnPropertySymbols, 'n'],
  [Object.getOwnPropertyDescriptors, 'n'],
  [Object.freeze, 'n'],
  [Object.seal, 'n'],
  [Object.isFrozen, 'n'],
  [Object.isSealed, 'n'],
];

function objectTicks(
  complexity: 'one' | 'n',
  isStatic: boolean,
): (thisArg: unknown, args: unknown[]) => bigint {
  return (thisArg, args) => {
    if (complexity === 'one') return 1n;
    const target = isStatic ? args[0] : thisArg;
    if (target !== null && typeof target === 'object')
      return BigInt(Object.keys(target as object).length);
    return 1n;
  };
}

// Static Object methods whose tick count is based on args[0] key count
const staticObjectMethods = new Set<Function>([
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
  Object.isSealed,
]);

// ---------------------------------------------------------------------------
// Array.from / Array.fromAsync
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Build the default replacements map
// ---------------------------------------------------------------------------

export const DEFAULT_FUNCTION_REPLACEMENTS = new Map<Function, Factory>();

// Array
for (const [original, complexity] of arrayReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, arrayTicks(complexity, original)),
  );
}

// String
for (const [original, complexity] of stringReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, stringTicks(complexity)));
}

// Map
for (const [original, complexity] of mapReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, mapTicks(complexity)));
}

// Set
for (const [original, complexity] of setReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(original, makeReplacement(original, setTicks(complexity)));
}

// TypedArray
for (const [original, complexity] of typedArrayReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, typedArrayTicks(complexity)),
  );
}

// Math — O(n) on arg count
for (const [original] of mathReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, (_thisArg, args) => BigInt(args.length)),
  );
}

// JSON — O(n) on string/object size
for (const original of [JSON.parse, JSON.stringify]) {
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, (_thisArg, args) => {
      const target = args[0];
      if (typeof target === 'string') return BigInt(target.length);
      if (target !== null && typeof target === 'object')
        return BigInt(Object.keys(target as object).length);
      return 1n;
    }),
  );
}

// RegExp — O(n) on input string length
for (const original of regexpReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, (_thisArg, args) => {
      const input = args[0];
      return typeof input === 'string' ? BigInt(input.length) : 1n;
    }),
  );
}

// Promise.all/allSettled/race/any — O(n) on iterable length
for (const original of promiseReplacementDefs) {
  if (!original) continue;
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, (_thisArg, args) => {
      const iterable = args[0];
      return Array.isArray(iterable) ? BigInt(iterable.length) : 0n;
    }),
  );
}

// Object static & instance methods
for (const [original, complexity] of objectReplacementDefs) {
  if (!original) continue;
  const isStatic = staticObjectMethods.has(original);
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    original,
    makeReplacement(original, objectTicks(complexity, isStatic)),
  );
}

// Array.from — O(n) on source length
if (Array.from) {
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    Array.from,
    makeReplacement(Array.from, (_thisArg, args) => {
      const source = args[0];
      if (source != null && typeof (source as any).length === 'number')
        return BigInt((source as any).length);
      return 0n;
    }),
  );
}

// Array.fromAsync — O(n) on source length (if available)
if (typeof (Array as any).fromAsync === 'function') {
  const fromAsync = (Array as any).fromAsync as Function;
  DEFAULT_FUNCTION_REPLACEMENTS.set(
    fromAsync,
    makeReplacement(fromAsync, (_thisArg, args) => {
      const source = args[0];
      if (source != null && typeof (source as any).length === 'number')
        return BigInt((source as any).length);
      return 0n;
    }),
  );
}
