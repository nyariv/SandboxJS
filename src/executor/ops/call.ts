import { addOps, arrayChange, Change, checkHaltExpectedTicks, SpreadArray } from '../executorUtils';
import type { Lisp } from '../../parser';
import {
  DelayedSynchronousResult,
  LispType,
  SandboxAccessError,
  SandboxCapabilityError,
  sanitizeProp,
} from '../../utils';

const arrayFuncs = new Map<Function, { o: 'one' | 'n' | 'nlogn' | 'arrs' }>();
const arr: [] = [];
const arrProto = Array.prototype as any;
// O(1)
arrayFuncs.set(arr.push, { o: 'one' });
arrayFuncs.set(arr.pop, { o: 'one' });
arrayFuncs.set(arrProto.at, { o: 'one' });
// O(n)
arrayFuncs.set(arr.fill, { o: 'n' });
arrayFuncs.set(arr.includes, { o: 'n' });
arrayFuncs.set(arr.indexOf, { o: 'n' });
arrayFuncs.set(arr.lastIndexOf, { o: 'n' });
arrayFuncs.set(arr.find, { o: 'n' });
arrayFuncs.set(arr.findIndex, { o: 'n' });
arrayFuncs.set(arrProto.findLast, { o: 'n' });
arrayFuncs.set(arrProto.findLastIndex, { o: 'n' });
arrayFuncs.set(arr.forEach, { o: 'n' });
arrayFuncs.set(arr.map, { o: 'n' });
arrayFuncs.set(arr.filter, { o: 'n' });
arrayFuncs.set(arr.reduce, { o: 'n' });
arrayFuncs.set(arr.reduceRight, { o: 'n' });
arrayFuncs.set(arr.every, { o: 'n' });
arrayFuncs.set(arr.some, { o: 'n' });
arrayFuncs.set(arr.join, { o: 'n' });
arrayFuncs.set(arr.reverse, { o: 'n' });
arrayFuncs.set(arr.shift, { o: 'n' });
arrayFuncs.set(arr.unshift, { o: 'n' });
arrayFuncs.set(arr.splice, { o: 'n' });
arrayFuncs.set(arr.slice, { o: 'n' });
arrayFuncs.set(arr.copyWithin, { o: 'n' });
arrayFuncs.set(arr.flat, { o: 'arrs' });
arrayFuncs.set(arr.flatMap, { o: 'arrs' });
arrayFuncs.set(arr.entries, { o: 'n' });
arrayFuncs.set(arr.keys, { o: 'n' });
arrayFuncs.set(arr.values, { o: 'n' });
arrayFuncs.set(arrProto.toReversed, { o: 'n' });
arrayFuncs.set(arrProto.toSpliced, { o: 'n' });
arrayFuncs.set(arrProto.with, { o: 'n' });
// O(n log n)
arrayFuncs.set(arr.sort, { o: 'nlogn' });
arrayFuncs.set(arrProto.toSorted, { o: 'nlogn' });
// O(n) across arrays
arrayFuncs.set(arr.concat, { o: 'arrs' });
arrayFuncs.set(arr.toString, { o: 'n' });
arrayFuncs.set(arr.toLocaleString, { o: 'n' });

const stringFuncs = new Map<Function, { o: 'one' | 'n' }>();
const str = '';
const strProto = String.prototype as any;
// O(1)
stringFuncs.set(str.charAt, { o: 'one' });
stringFuncs.set(str.charCodeAt, { o: 'one' });
stringFuncs.set(str.codePointAt, { o: 'one' });
stringFuncs.set(strProto.at, { o: 'one' });
// O(n)
stringFuncs.set(str.indexOf, { o: 'n' });
stringFuncs.set(str.lastIndexOf, { o: 'n' });
stringFuncs.set(str.includes, { o: 'n' });
stringFuncs.set(str.startsWith, { o: 'n' });
stringFuncs.set(str.endsWith, { o: 'n' });
stringFuncs.set(str.slice, { o: 'n' });
stringFuncs.set(str.substring, { o: 'n' });
stringFuncs.set(str.padStart, { o: 'n' });
stringFuncs.set(str.padEnd, { o: 'n' });
stringFuncs.set(str.repeat, { o: 'n' });
stringFuncs.set(str.split, { o: 'n' });
stringFuncs.set(str.replace, { o: 'n' });
stringFuncs.set(strProto.replaceAll, { o: 'n' });
stringFuncs.set(str.match, { o: 'n' });
stringFuncs.set(str.matchAll, { o: 'n' });
stringFuncs.set(str.search, { o: 'n' });
stringFuncs.set(str.trim, { o: 'n' });
stringFuncs.set(str.trimStart, { o: 'n' });
stringFuncs.set(str.trimEnd, { o: 'n' });
stringFuncs.set(str.toLowerCase, { o: 'n' });
stringFuncs.set(str.toUpperCase, { o: 'n' });
stringFuncs.set(str.toLocaleLowerCase, { o: 'n' });
stringFuncs.set(str.toLocaleUpperCase, { o: 'n' });
stringFuncs.set(str.normalize, { o: 'n' });
stringFuncs.set(str.concat, { o: 'n' });
stringFuncs.set(str.toString, { o: 'n' });
stringFuncs.set(str.valueOf, { o: 'n' });

const mapFuncs = new Map<Function, { o: 'one' | 'n' }>();
const map = new Map<never, never>();
// O(1)
mapFuncs.set(map.get, { o: 'one' });
mapFuncs.set(map.set, { o: 'one' });
mapFuncs.set(map.has, { o: 'one' });
mapFuncs.set(map.delete, { o: 'one' });
// O(n)
mapFuncs.set(map.keys, { o: 'n' });
mapFuncs.set(map.values, { o: 'n' });
mapFuncs.set(map.entries, { o: 'n' });
mapFuncs.set(map.forEach, { o: 'n' });
mapFuncs.set(map.clear, { o: 'n' });

const setFuncs = new Map<Function, { o: 'one' | 'n' }>();
const set = new Set<never>();
// O(1)
setFuncs.set(set.add, { o: 'one' });
setFuncs.set(set.has, { o: 'one' });
setFuncs.set(set.delete, { o: 'one' });
// O(n)
setFuncs.set(set.values, { o: 'n' });
setFuncs.set(set.keys, { o: 'n' });
setFuncs.set(set.entries, { o: 'n' });
setFuncs.set(set.forEach, { o: 'n' });
setFuncs.set(set.clear, { o: 'n' });

// TypedArrays share methods via the shared %TypedArray% prototype (n = .length).
// Collect all unique TypedArray protos — some environments (e.g., JSDOM) patch Uint8Array
// with extra methods on an intermediate prototype, creating more than one shared proto.
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
const _typedArrayProtos = new Set(
  _typedArrayCtors.map((T) => Object.getPrototypeOf(T.prototype) as any),
);
const typedArrayFuncs = new Map<Function, { o: 'one' | 'n' | 'nlogn' }>();
for (const proto of _typedArrayProtos) {
  // O(1)
  if (proto.at) typedArrayFuncs.set(proto.at, { o: 'one' });
  if (proto.set) typedArrayFuncs.set(proto.set, { o: 'one' });
  // O(n)
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
    if (proto[m]) typedArrayFuncs.set(proto[m], { o: 'n' });
  }
  // O(n log n)
  if (proto.sort) typedArrayFuncs.set(proto.sort, { o: 'nlogn' });
  if (proto.toSorted) typedArrayFuncs.set(proto.toSorted, { o: 'nlogn' });
}

const mathFuncs = new Map<Function, { o: 'n' }>();
// O(n) variadic — n = number of arguments
mathFuncs.set(Math.max, { o: 'n' });
mathFuncs.set(Math.min, { o: 'n' });
mathFuncs.set(Math.hypot, { o: 'n' });

const jsonFuncs = new Map<Function, { o: 'n' }>();
// O(n) on string/value size
jsonFuncs.set(JSON.parse, { o: 'n' });
jsonFuncs.set(JSON.stringify, { o: 'n' });

const regexpFuncs = new Map<Function, { o: 'n' }>();
const _re = /x/;
// O(n) on the input string length
regexpFuncs.set(_re.exec, { o: 'n' });
regexpFuncs.set(_re.test, { o: 'n' });
regexpFuncs.set((_re as any)[Symbol.match], { o: 'n' });
regexpFuncs.set((_re as any)[Symbol.matchAll], { o: 'n' });
regexpFuncs.set((_re as any)[Symbol.replace], { o: 'n' });
regexpFuncs.set((_re as any)[Symbol.search], { o: 'n' });
regexpFuncs.set((_re as any)[Symbol.split], { o: 'n' });
const promiseFuncs = new Map<Function, { o: 'n' }>();
// O(n) on the iterable length
promiseFuncs.set(Promise.all, { o: 'n' });
promiseFuncs.set(Promise.allSettled, { o: 'n' });
promiseFuncs.set(Promise.race, { o: 'n' });
if (typeof (Promise as any).any === 'function') {
  promiseFuncs.set((Promise as any).any, { o: 'n' });
}

const objectFuncs = new Map<Function, { o: 'one' | 'n' }>();
// O(1) instance methods
objectFuncs.set(Object.prototype.hasOwnProperty, { o: 'one' });
objectFuncs.set(Object.prototype.propertyIsEnumerable, { o: 'one' });
objectFuncs.set(Object.prototype.isPrototypeOf, { o: 'one' });
// O(1) static methods (target object is args[0])
objectFuncs.set(Object.create, { o: 'one' });
objectFuncs.set(Object.getPrototypeOf, { o: 'one' });
objectFuncs.set(Object.setPrototypeOf, { o: 'one' });
objectFuncs.set(Object.is, { o: 'one' });
objectFuncs.set(Object.defineProperty, { o: 'one' });
objectFuncs.set(Object.getOwnPropertyDescriptor, { o: 'one' });
objectFuncs.set(Object.isExtensible, { o: 'one' });
objectFuncs.set(Object.preventExtensions, { o: 'one' });
// O(n) static methods (n = number of own keys of args[0])
objectFuncs.set(Object.keys, { o: 'n' });
objectFuncs.set(Object.values, { o: 'n' });
objectFuncs.set(Object.entries, { o: 'n' });
objectFuncs.set(Object.assign, { o: 'n' });
objectFuncs.set(Object.fromEntries, { o: 'n' });
objectFuncs.set(Object.getOwnPropertyNames, { o: 'n' });
objectFuncs.set(Object.getOwnPropertySymbols, { o: 'n' });
objectFuncs.set(Object.getOwnPropertyDescriptors, { o: 'n' });
objectFuncs.set(Object.freeze, { o: 'n' });
objectFuncs.set(Object.seal, { o: 'n' });
objectFuncs.set(Object.isFrozen, { o: 'n' });
objectFuncs.set(Object.isSealed, { o: 'n' });

function getTicks(obj: unknown, prop: PropertyKey, args: unknown[]) {
  if (!(obj as any)?.[prop]) return 0n;
  if (obj instanceof Map) {
    const func = (obj as any)[prop as any] as Function;
    const info = mapFuncs.get(func);
    if (!info) return BigInt(obj.size);
    if (info.o === 'one') return 1n;
    return BigInt(obj.size);
  }
  if (obj instanceof Set) {
    const func = (obj as any)[prop as any] as Function;
    const info = setFuncs.get(func);
    if (!info) return BigInt(obj.size);
    if (info.o === 'one') return 1n;
    return BigInt(obj.size);
  }
  if (obj instanceof RegExp) {
    const func = (obj as any)[prop as any] as Function;
    const info = regexpFuncs.get(func);
    if (!info) return 0n;
    const input = args[0];
    if (typeof input === 'string') return BigInt(input.length);
    return 1n;
  }
  if (obj === Math) {
    const info = mathFuncs.get((obj as any)[prop as any] as Function);
    if (!info) return 0n;
    return BigInt(args.length);
  }
  if (obj === JSON) {
    const info = jsonFuncs.get((obj as any)[prop as any] as Function);
    if (!info) return 0n;
    const target = args[0];
    if (typeof target === 'string') return BigInt(target.length);
    if (target !== null && typeof target === 'object')
      return BigInt(Object.keys(target as object).length);
    return 1n;
  }
  if (obj === Promise) {
    const info = promiseFuncs.get((obj as any)[prop as any] as Function);
    if (!info) return 0n;
    const iterable = args[0];
    if (Array.isArray(iterable)) return BigInt(iterable.length);
    return 0n;
  }
  if (
    ArrayBuffer.isView(obj) &&
    !(obj instanceof DataView) &&
    _typedArrayProtos.has(Object.getPrototypeOf(Object.getPrototypeOf(obj)))
  ) {
    const ta = obj as unknown as { length: number };
    const func = (obj as any)[prop as any] as Function;
    const info = typedArrayFuncs.get(func);
    if (!info) return BigInt(ta.length);
    if (info.o === 'one') return 1n;
    if (info.o === 'nlogn') return BigInt(ta.length) * BigInt(Math.round(Math.log2(ta.length)));
    return BigInt(ta.length);
  }
  if (
    obj === Object ||
    (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) ||
    (typeof obj === 'function' && obj === Object)
  ) {
    const func =
      obj === Object
        ? ((obj as any)[prop as any] as Function)
        : ((Object.prototype as any)[prop as any] as Function);
    const info = objectFuncs.get(func);
    if (!info) return 0n;
    if (info.o === 'one') return 1n;
    // For static Object methods, n = keys of args[0]; for instance methods, n = keys of obj
    const target = obj === Object ? args[0] : obj;
    if (target !== null && typeof target === 'object')
      return BigInt(Object.keys(target as object).length);
    return 1n;
  }
  if (typeof obj === 'string') {
    const func = (obj as any)[prop as any] as Function;
    const info = stringFuncs.get(func) ?? stringFuncs.get(strProto[prop as any]);
    if (!info) return BigInt(obj.length);
    if (info.o === 'one') return 1n;
    return BigInt(obj.length);
  }
  if (obj === Array) {
    if (![Array.from, (Array as any).fromAsync].includes((obj as any)[prop as any])) return 0n;
    const source = args[0];
    if (source != null && typeof (source as any).length === 'number')
      return BigInt((source as any).length);
    return 0n;
  }
  if (!Array.isArray(obj)) return 0n;
  const func = obj[prop as any] as Function;
  const info = arrayFuncs.get(func);
  let ticks = BigInt(obj.length);
  switch (info?.o) {
    case 'one': {
      ticks = 1n;
      break;
    }
    case 'nlogn': {
      ticks = ticks * BigInt(Math.round(Math.log2(obj.length)));
      break;
    }
    case 'arrs': {
      ticks = 0n;
      const maxDepth = func === arr.flat ? (typeof args[0] === 'number' ? args[0] : 1) : 1;
      const recurse = (arr: Array<unknown>, depth = 0, cache = new WeakSet<Array<unknown>>()) => {
        ticks += BigInt(arr.length);
        if (cache.has(arr)) return;
        cache.add(arr);
        if (depth >= maxDepth) return;
        for (let a of arr) {
          if (Array.isArray(a)) {
            recurse(a, depth + 1, cache);
          }
        }
      };
      recurse(obj);
      break;
    }
  }
  return ticks;
}

addOps<unknown, Lisp[], any>(LispType.Call, (params) => {
  const { done, a, b, obj, context } = params;
  if (context.ctx.options.forbidFunctionCalls)
    throw new SandboxCapabilityError('Function invocations are not allowed');
  if (typeof a !== 'function') {
    throw new TypeError(
      `${typeof obj?.prop === 'symbol' ? 'Symbol' : obj?.prop} is not a function`,
    );
  }
  const vals = new Array<unknown>(b.length);
  let valsLen = 0;
  for (let i = 0; i < b.length; i++) {
    const item = b[i];
    if (item instanceof SpreadArray) {
      const expanded = Array.isArray(item.item) ? item.item : [...(item.item as Iterable<unknown>)];
      if (checkHaltExpectedTicks(params, BigInt(expanded.length))) return;
      for (let j = 0; j < expanded.length; j++)
        vals[valsLen++] = sanitizeProp(expanded[j], context);
    } else {
      vals[valsLen++] = sanitizeProp(item, context);
    }
  }
  vals.length = valsLen;

  if (a === String) {
    const result = String(vals[0]);
    if (checkHaltExpectedTicks(params, BigInt(result.length))) return;
    done(undefined, result);
    return;
  }

  if (typeof obj === 'function') {
    const evl = context.evals.get(obj);
    let ret = evl ? evl(obj, ...vals) : obj(...vals);
    ret = sanitizeProp(ret, context);
    if (ret !== null && typeof ret === 'object' && ret instanceof DelayedSynchronousResult) {
      Promise.resolve(ret.result).then(
        (res) => done(undefined, res),
        (err) => done(err),
      );
    } else {
      done(undefined, ret);
    }
    return;
  }
  const expectedTicks = getTicks(obj.context, obj.prop, vals);
  if (checkHaltExpectedTicks(params, expectedTicks)) {
    return;
  }
  if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
    const cache = new WeakSet<any>();
    let ticks = 0n;
    const recurse = (x: unknown) => {
      if (!x || !(typeof x === 'object') || cache.has(x)) return;
      cache.add(x);
      const keys = Object.keys(x) as (keyof typeof x)[];
      ticks += BigInt(keys.length);
      for (const y of keys) {
        context.getSubscriptions.forEach((cb) => cb(x, y));
        recurse(x[y]);
      }
    };
    recurse(vals[0]);
    if (checkHaltExpectedTicks(params, ticks)) return;
  }

  if (
    obj.context instanceof Array &&
    arrayChange.has(obj.context[obj.prop]) &&
    (context.changeSubscriptions.get(obj.context) ||
      context.changeSubscriptionsGlobal.get(obj.context))
  ) {
    let change: Change = undefined!;
    let changed = false;
    if (obj.prop === 'push') {
      change = {
        type: 'push',
        added: vals,
      };
      changed = !!vals.length;
    } else if (obj.prop === 'pop') {
      change = {
        type: 'pop',
        removed: obj.context.slice(-1),
      };
      changed = !!change.removed.length;
    } else if (obj.prop === 'shift') {
      change = {
        type: 'shift',
        removed: obj.context.slice(0, 1),
      };
      changed = !!change.removed.length;
    } else if (obj.prop === 'unshift') {
      change = {
        type: 'unshift',
        added: vals,
      };
      changed = !!vals.length;
    } else if (obj.prop === 'splice') {
      change = {
        type: 'splice',
        startIndex: vals[0] as number,
        deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
        added: vals.slice(2),
        removed: obj.context.slice(
          vals[0],
          vals[1] === undefined ? undefined : (vals[0] as number) + (vals[1] as number),
        ),
      };
      changed = !!change.added.length || !!change.removed.length;
    } else if (obj.prop === 'reverse' || obj.prop === 'sort') {
      change = { type: obj.prop };
      changed = !!obj.context.length;
    } else if (obj.prop === 'copyWithin') {
      const len =
        vals[2] === undefined
          ? obj.context.length - (vals[1] as number)
          : Math.min(obj.context.length, (vals[2] as number) - (vals[1] as number));
      change = {
        type: 'copyWithin',
        startIndex: vals[0] as number,
        endIndex: (vals[0] as number) + len,
        added: obj.context.slice(vals[1] as number, (vals[1] as number) + len),
        removed: obj.context.slice(vals[0] as number, (vals[0] as number) + len),
      };
      changed = !!change.added.length || !!change.removed.length;
    }
    if (changed) {
      const subs = context.changeSubscriptions.get(obj.context);
      if (subs !== undefined) for (const cb of subs) cb(change);
      const subsG = context.changeSubscriptionsGlobal.get(obj.context);
      if (subsG !== undefined) for (const cb of subsG) cb(change);
    }
  }
  obj.get(context);
  const fn: any = obj.context[obj.prop];
  const evl = context.evals.get(fn);
  let ret = evl ? evl(...vals) : (obj.context[obj.prop](...vals) as unknown);
  ret = sanitizeProp(ret, context);
  if (ret !== null && typeof ret === 'object' && ret instanceof DelayedSynchronousResult) {
    Promise.resolve(ret.result).then(
      (res) => done(undefined, res),
      (err) => done(err),
    );
  } else {
    done(undefined, ret);
  }
});

addOps<new (...args: unknown[]) => void, unknown[]>(LispType.New, (params) => {
  const { done, a, b, context } = params;
  if (!context.ctx.globalsWhitelist.has(a) && !context.ctx.sandboxedFunctions.has(a)) {
    throw new SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
  }
  const vals = b.map((item) => sanitizeProp(item, context));
  const expectedTicks = getNewTicks(a, vals);
  if (expectedTicks > 0n && checkHaltExpectedTicks(params, expectedTicks)) return;
  const ret = new a(...vals);
  done(undefined, ret);
});

function getNewTicks(ctor: Function, args: unknown[]): bigint {
  // new Array(n) or new TypedArray(n) — allocates n elements
  if (ctor === Array) {
    const n = args[0];
    if (typeof n === 'number' && args.length === 1) return BigInt(n);
    return BigInt(args.length);
  }
  if (_typedArrayProtos.has(Object.getPrototypeOf(ctor.prototype))) {
    const n = args[0];
    if (typeof n === 'number') return BigInt(n);
    if (Array.isArray(n) || ArrayBuffer.isView(n)) return BigInt((n as ArrayLike<unknown>).length);
    return 0n;
  }
  // new Map(iterable) or new Set(iterable) — O(n) of iterable length
  if (ctor === Map || ctor === Set) {
    const iterable = args[0];
    if (Array.isArray(iterable)) return BigInt(iterable.length);
    return 0n;
  }
  // new String(s) or new RegExp(pattern) — O(n) of string length
  if (ctor === String || ctor === RegExp) {
    const s = args[0];
    if (typeof s === 'string') return BigInt(s.length);
    return 0n;
  }
  return 0n;
}
