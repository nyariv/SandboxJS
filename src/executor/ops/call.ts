import { addOps, arrayChange, Change, sanitizeProp, SpreadArray } from '../executorUtils';
import type { Lisp } from '../../parser';
import {
  DelayedSynchronousResult,
  LispType,
  SandboxAccessError,
  SandboxCapabilityError,
} from '../../utils';

addOps<unknown, Lisp[], any>(LispType.Call, ({ done, a, b, obj, context }) => {
  if (context.ctx.options.forbidFunctionCalls)
    throw new SandboxCapabilityError('Function invocations are not allowed');
  if (typeof a !== 'function') {
    throw new TypeError(
      `${typeof obj?.prop === 'symbol' ? 'Symbol' : obj?.prop} is not a function`,
    );
  }
  const vals = b
    .map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    })
    .flat()
    .map((item) => sanitizeProp(item, context));

  if (typeof obj === 'function') {
    const evl = context.evals.get(obj);
    let ret = evl ? evl(obj, ...vals) : obj(...vals);
    ret = sanitizeProp(ret, context);
    if (ret instanceof DelayedSynchronousResult) {
      Promise.resolve(ret.result).then(
        (res) => done(undefined, res),
        (err) => done(err),
      );
    } else {
      done(undefined, ret);
    }
    return;
  }
  if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
    const cache = new Set<any>();
    const recurse = (x: unknown) => {
      if (!x || !(typeof x === 'object') || cache.has(x)) return;
      cache.add(x);
      for (const y of Object.keys(x) as (keyof typeof x)[]) {
        context.getSubscriptions.forEach((cb) => cb(x, y));
        recurse(x[y]);
      }
    };
    recurse(vals[0]);
  }

  if (
    obj.context instanceof Array &&
    arrayChange.has(obj.context[obj.prop]) &&
    (context.changeSubscriptions.get(obj.context) ||
      context.changeSubscriptionsGlobal.get(obj.context))
  ) {
    let change: Change;
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
      context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb(change));
      context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb(change));
    }
  }
  obj.get(context);
  const evl = context.evals.get(obj.context[obj.prop] as any);
  let ret = evl ? evl(...vals) : (obj.context[obj.prop](...vals) as unknown);
  ret = sanitizeProp(ret, context);
  if (ret instanceof DelayedSynchronousResult) {
    Promise.resolve(ret.result).then(
      (res) => done(undefined, res),
      (err) => done(err),
    );
  } else {
    done(undefined, ret);
  }
});

addOps<new (...args: unknown[]) => unknown, unknown[]>(LispType.New, ({ done, a, b, context }) => {
  if (!context.ctx.globalsWhitelist.has(a) && !context.ctx.sandboxedFunctions.has(a)) {
    throw new SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
  }
  b = b.map((item) => sanitizeProp(item, context));
  const ret = sanitizeProp(new a(...b), context);
  done(undefined, ret);
});
