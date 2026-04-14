import { addOps, arrayChange, Change, checkHaltExpectedTicks, SpreadArray } from '../executorUtils';
import { checkTicksAndThrow, typedArrayProtos as _typedArrayProtos } from '../functionReplacements';
import type { Lisp } from '../../parser';
import {
  DelayedSynchronousResult,
  LispType,
  SandboxAccessError,
  SandboxCapabilityError,
  sanitizeProp,
} from '../../utils';

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
    checkTicksAndThrow(context.ctx, BigInt(result.length));
    done(undefined, result);
    return;
  }

  if (typeof obj === 'function') {
    // Direct function call (not a method): obj is the function itself
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

  // Method call: obj is a Prop. `a` is already the replacement (from Prop.get()).
  // The original function is still accessible via obj.context[obj.prop] for subscription checks.
  const originalFn: unknown = obj.context[obj.prop];

  if (originalFn === JSON.stringify && context.getSubscriptions.size) {
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
    checkTicksAndThrow(context.ctx, ticks);
  }

  if (
    obj.context instanceof Array &&
    arrayChange.has(originalFn as any) &&
    (context.changeSubscriptions.get(obj.context) ||
      context.changeSubscriptionsGlobal.get(obj.context))
  ) {
    let change: Change = undefined!;
    let changed = false;
    if (obj.prop === 'push') {
      change = { type: 'push', added: vals };
      changed = !!vals.length;
    } else if (obj.prop === 'pop') {
      change = { type: 'pop', removed: obj.context.slice(-1) };
      changed = !!change.removed.length;
    } else if (obj.prop === 'shift') {
      change = { type: 'shift', removed: obj.context.slice(0, 1) };
      changed = !!change.removed.length;
    } else if (obj.prop === 'unshift') {
      change = { type: 'unshift', added: vals };
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

  // Trigger get-subscriptions, then call via `a` (which may be a tick-checking replacement)
  obj.get(context);
  const evl = context.evals.get(originalFn as Function);
  let ret = evl ? evl(...vals) : (a as Function).call(obj.context, ...vals);
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
