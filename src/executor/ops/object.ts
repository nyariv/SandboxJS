import { addOps, sanitizeProp, SpreadArray, SpreadObject, KeyVal } from '../executorUtils';
import type { Lisp, LispItem } from '../../parser';
import { LispType } from '../../utils';

addOps<unknown, KeyVal[]>(LispType.CreateObject, ({ done, b }) => {
  let res = {} as any;
  for (const item of b) {
    if (item.key instanceof SpreadObject) {
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

addOps<unknown, Lisp[]>(LispType.CreateArray, ({ done, b, context }) => {
  const items = b
    .map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    })
    .flat()
    .map((item) => sanitizeProp(item, context));
  done(undefined, items);
});

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
