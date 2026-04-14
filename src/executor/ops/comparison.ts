import { addOps, checkHaltExpectedTicks } from '../executorUtils';
import { LispType } from '../../utils';

addOps<number, number>(LispType.LargerThan, ({ done, a, b }) => done(undefined, a > b));

addOps<number, number>(LispType.SmallerThan, ({ done, a, b }) => done(undefined, a < b));

addOps<number, number>(LispType.LargerEqualThan, ({ done, a, b }) => done(undefined, a >= b));

addOps<number, number>(LispType.SmallerEqualThan, ({ done, a, b }) => done(undefined, a <= b));

addOps<number, number>(LispType.Equal, ({ done, a, b }) => done(undefined, a == b));

addOps<number, number>(LispType.StrictEqual, ({ done, a, b }) => done(undefined, a === b));

addOps<number, number>(LispType.NotEqual, ({ done, a, b }) => done(undefined, a != b));

addOps<number, number>(LispType.StrictNotEqual, ({ done, a, b }) => done(undefined, a !== b));

addOps<number, number>(LispType.And, ({ done, a, b }) => done(undefined, a && b));

addOps<number, number>(LispType.Or, ({ done, a, b }) => done(undefined, a || b));

addOps<number, number>(LispType.NullishCoalescing, ({ done, a, b }) => done(undefined, a ?? b));

addOps<number, number>(LispType.BitAnd, ({ done, a, b }) => done(undefined, a & b));

addOps<number, number>(LispType.BitOr, ({ done, a, b }) => done(undefined, a | b));

addOps<number, number>(LispType.Plus, (params) => {
  const { done, a, b } = params;
  const result = (a as any) + (b as any);
  if (typeof result === 'string' && checkHaltExpectedTicks(params, BigInt(result.length))) return;
  done(undefined, result);
});

addOps<number, number>(LispType.Minus, ({ done, a, b }) => done(undefined, a - b));

addOps<number, number>(LispType.Divide, ({ done, a, b }) => done(undefined, a / b));

addOps<number, number>(LispType.Power, ({ done, a, b }) => done(undefined, a ** b));

addOps<number, number>(LispType.BitNegate, ({ done, a, b }) => done(undefined, a ^ b));

addOps<number, number>(LispType.Multiply, ({ done, a, b }) => done(undefined, a * b));

addOps<number, number>(LispType.Modulus, ({ done, a, b }) => done(undefined, a % b));

addOps<number, number>(LispType.BitShiftLeft, ({ done, a, b }) => done(undefined, a << b));

addOps<number, number>(LispType.BitShiftRight, ({ done, a, b }) => done(undefined, a >> b));

addOps<number, number>(LispType.BitUnsignedShiftRight, ({ done, a, b }) =>
  done(undefined, a >>> b),
);

addOps<unknown, { new (): unknown }>(LispType.Instanceof, ({ done, a, b }) =>
  done(undefined, a instanceof b),
);

addOps<string, {}>(LispType.In, ({ done, a, b }) => done(undefined, a in b));
