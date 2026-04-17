import {
  addOps,
  checkHaltExpectedTicks,
  SpreadArray,
  SpreadObject,
  KeyVal,
  ArrayHole,
} from '../executorUtils';
import type { Lisp, LispItem } from '../../parser';
import { LispType, sanitizeProp } from '../../utils';

addOps<unknown, KeyVal[]>(LispType.CreateObject, (params) => {
  const { done, b } = params;
  let res = {} as any;
  for (const item of b) {
    if (item.key instanceof SpreadObject) {
      const keys = Object.keys(item.key.item);
      if (checkHaltExpectedTicks(params, BigInt(keys.length))) return;
      res = { ...res, ...item.key.item };
    } else {
      res[item.key] = item.val;
    }
  }
  done(undefined, res);
});

addOps<PropertyKey, LispItem>(LispType.KeyVal, ({ done, a, b }) =>
  done(undefined, new KeyVal(a, b)),
);

addOps<unknown, Lisp[]>(LispType.CreateArray, (params) => {
  const { done, b, context } = params;
  const items: unknown[] = [];
  for (const item of b) {
    if (item instanceof SpreadArray) {
      const expanded = Array.isArray(item.item) ? item.item : [...(item.item as Iterable<unknown>)];
      if (checkHaltExpectedTicks(params, BigInt(expanded.length))) return;
      for (const v of expanded) items.push(sanitizeProp(v, context));
    } else if (item instanceof ArrayHole) {
      items.length++;
    } else {
      items.push(sanitizeProp(item, context));
    }
  }
  done(undefined, items);
});

addOps(LispType.Hole, ({ done }) => done(undefined, new ArrayHole()));

addOps<unknown, unknown>(LispType.Group, ({ done, b }) => done(undefined, b));

addOps<unknown, string>(LispType.GlobalSymbol, ({ done, b }) => {
  switch (b) {
    case 'true':
      return done(undefined, true);
    case 'false':
      return done(undefined, false);
    case 'null':
      return done(undefined, null);
    case 'undefined':
      return done(undefined, undefined);
    case 'NaN':
      return done(undefined, NaN);
    case 'Infinity':
      return done(undefined, Infinity);
  }
  done(new Error('Unknown symbol: ' + b));
});

addOps<unknown, unknown[]>(LispType.SpreadArray, ({ done, b }) => {
  done(undefined, new SpreadArray(b));
});

addOps<unknown, Record<string, unknown>>(LispType.SpreadObject, ({ done, b }) => {
  done(undefined, new SpreadObject(b));
});
