import { addOps, assignCheck } from '../executorUtils';
import { LispType, Prop } from '../../utils';

addOps<unknown, unknown, Prop<any>, Prop<any>>(
  LispType.Assign,
  ({ done, b, obj, context, scope, bobj, internal }) => {
    assignCheck(obj, context);
    obj.isGlobal = bobj?.isGlobal || false;
    if (obj.isVariable) {
      const s = scope.getWhereValScope(obj.prop as string, obj.prop === 'this', internal);
      if (s === null) {
        throw new ReferenceError(`Cannot assign to undeclared variable '${obj.prop.toString()}'`);
      }
      s.set(obj.prop as string, b, internal);
      if (obj.isGlobal) {
        s.globals[obj.prop.toString()] = true;
      } else {
        delete s.globals[obj.prop.toString()];
      }
      done(undefined, b);
      return;
    }
    done(undefined, (obj.context[obj.prop] = b));
  },
);

addOps<unknown, unknown, Prop<any>>(LispType.AddEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] += b));
});

addOps<unknown, number, Prop<any>>(LispType.SubractEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] -= b));
});

addOps<unknown, number, Prop<any>>(LispType.DivideEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] /= b));
});

addOps<unknown, number, Prop<any>>(LispType.MultiplyEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] *= b));
});

addOps<unknown, number, Prop<any>>(LispType.PowerEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] **= b));
});

addOps<unknown, number, Prop<any>>(LispType.ModulusEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] %= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitNegateEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] ^= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitAndEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] &= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitOrEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] |= b));
});

addOps<unknown, number, Prop<any>>(LispType.ShiftLeftEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] <<= b));
});

addOps<unknown, number, Prop<any>>(LispType.ShiftRightEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] >>= b));
});

addOps<unknown, number, Prop<any>>(
  LispType.UnsignedShiftRightEquals,
  ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>>= b));
  },
);

addOps<unknown, unknown, Prop<any>>(LispType.AndEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] &&= b));
});

addOps<unknown, unknown, Prop<any>>(LispType.OrEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] ||= b));
});

addOps<unknown, unknown, Prop<any>>(
  LispType.NullishCoalescingEquals,
  ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] ??= b));
  },
);
