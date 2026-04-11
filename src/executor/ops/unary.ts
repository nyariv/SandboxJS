import { addOps, assignCheck, sanitizeProp } from '../executorUtils';
import type { LispItem } from '../../parser';
import { LispType, Prop } from '../../utils';

addOps<unknown, unknown>(LispType.Not, ({ done, b }) => done(undefined, !b));

addOps<unknown, number>(LispType.Inverse, ({ done, b }) => done(undefined, ~b));

addOps<unknown, unknown, Prop<any>>(LispType.IncrementBefore, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, ++obj.context[obj.prop]);
});

addOps<unknown, unknown, Prop<any>>(LispType.IncrementAfter, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]++);
});

addOps<unknown, unknown, Prop<any>>(LispType.DecrementBefore, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, --obj.context[obj.prop]);
});

addOps<unknown, unknown, Prop<any>>(LispType.DecrementAfter, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]--);
});

addOps<number, number>(LispType.Positive, ({ done, b }) => done(undefined, +b));

addOps<number, number>(LispType.Negative, ({ done, b }) => done(undefined, -b));

addOps<unknown, LispItem>(
  LispType.Typeof,
  ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
    exec(
      ticks,
      b,
      scope,
      context,
      (e, prop) => {
        done(undefined, typeof sanitizeProp(prop, context));
      },
      undefined,
      internal,
      generatorYield,
    );
  },
);

addOps<unknown, unknown>(LispType.Delete, ({ done, context, bobj }) => {
  if (!(bobj instanceof Prop)) {
    done(undefined, true);
    return;
  }
  assignCheck(bobj, context, 'delete');
  if (bobj.isVariable) {
    done(undefined, false);
    return;
  }
  done(undefined, delete (bobj.context as any)?.[bobj.prop]);
});

addOps(LispType.Void, ({ done }) => {
  done();
});
