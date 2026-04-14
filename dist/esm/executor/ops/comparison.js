import { LispType } from "../../utils/types.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { checkHaltExpectedTicks } from "../executorUtils.js";
//#region src/executor/ops/comparison.ts
addOps(LispType.LargerThan, ({ done, a, b }) => done(void 0, a > b));
addOps(LispType.SmallerThan, ({ done, a, b }) => done(void 0, a < b));
addOps(LispType.LargerEqualThan, ({ done, a, b }) => done(void 0, a >= b));
addOps(LispType.SmallerEqualThan, ({ done, a, b }) => done(void 0, a <= b));
addOps(LispType.Equal, ({ done, a, b }) => done(void 0, a == b));
addOps(LispType.StrictEqual, ({ done, a, b }) => done(void 0, a === b));
addOps(LispType.NotEqual, ({ done, a, b }) => done(void 0, a != b));
addOps(LispType.StrictNotEqual, ({ done, a, b }) => done(void 0, a !== b));
addOps(LispType.And, ({ done, a, b }) => done(void 0, a && b));
addOps(LispType.Or, ({ done, a, b }) => done(void 0, a || b));
addOps(LispType.NullishCoalescing, ({ done, a, b }) => done(void 0, a ?? b));
addOps(LispType.BitAnd, ({ done, a, b }) => done(void 0, a & b));
addOps(LispType.BitOr, ({ done, a, b }) => done(void 0, a | b));
addOps(LispType.Plus, (params) => {
	const { done, a, b } = params;
	const result = a + b;
	if (typeof result === "string" && checkHaltExpectedTicks(params, BigInt(result.length))) return;
	done(void 0, result);
});
addOps(LispType.Minus, ({ done, a, b }) => done(void 0, a - b));
addOps(LispType.Divide, ({ done, a, b }) => done(void 0, a / b));
addOps(LispType.Power, ({ done, a, b }) => done(void 0, a ** b));
addOps(LispType.BitNegate, ({ done, a, b }) => done(void 0, a ^ b));
addOps(LispType.Multiply, ({ done, a, b }) => done(void 0, a * b));
addOps(LispType.Modulus, ({ done, a, b }) => done(void 0, a % b));
addOps(LispType.BitShiftLeft, ({ done, a, b }) => done(void 0, a << b));
addOps(LispType.BitShiftRight, ({ done, a, b }) => done(void 0, a >> b));
addOps(LispType.BitUnsignedShiftRight, ({ done, a, b }) => done(void 0, a >>> b));
addOps(LispType.Instanceof, ({ done, a, b }) => done(void 0, a instanceof b));
addOps(LispType.In, ({ done, a, b }) => done(void 0, a in b));
//#endregion

//# sourceMappingURL=comparison.js.map