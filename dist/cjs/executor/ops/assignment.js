const require_types = require("../../utils/types.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/assignment.ts
require_opsRegistry.addOps(require_types.LispType.Assign, (params) => {
	const { done, b, obj, context, scope, bobj, internal } = params;
	require_executorUtils.assignCheck(obj, context);
	obj.isGlobal = bobj?.isGlobal || false;
	if (obj.isVariable) {
		const s = scope.getWhereValScope(obj.prop, obj.prop === "this", internal);
		if (s === null) throw new ReferenceError(`Cannot assign to undeclared variable '${obj.prop.toString()}'`);
		s.set(obj.prop, b, internal);
		if (obj.isGlobal) s.globals[obj.prop.toString()] = true;
		else delete s.globals[obj.prop.toString()];
		done(void 0, b);
		return;
	}
	if (obj.prop === "length" && Array.isArray(obj.context) && typeof b === "number") {
		const delta = BigInt(Math.abs(b - obj.context.length));
		if (delta > 0n && require_executorUtils.checkHaltExpectedTicks(params, delta)) return;
	}
	done(void 0, obj.context[obj.prop] = b);
});
require_opsRegistry.addOps(require_types.LispType.AddEquals, (params) => {
	const { done, b, obj, context } = params;
	require_executorUtils.assignCheck(obj, context);
	const result = obj.context[obj.prop] + b;
	if (typeof result === "string" && require_executorUtils.checkHaltExpectedTicks(params, BigInt(result.length))) return;
	done(void 0, obj.context[obj.prop] = result);
});
require_opsRegistry.addOps(require_types.LispType.SubractEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] -= b);
});
require_opsRegistry.addOps(require_types.LispType.DivideEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] /= b);
});
require_opsRegistry.addOps(require_types.LispType.MultiplyEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] *= b);
});
require_opsRegistry.addOps(require_types.LispType.PowerEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] **= b);
});
require_opsRegistry.addOps(require_types.LispType.ModulusEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] %= b);
});
require_opsRegistry.addOps(require_types.LispType.BitNegateEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ^= b);
});
require_opsRegistry.addOps(require_types.LispType.BitAndEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] &= b);
});
require_opsRegistry.addOps(require_types.LispType.BitOrEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] |= b);
});
require_opsRegistry.addOps(require_types.LispType.ShiftLeftEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] <<= b);
});
require_opsRegistry.addOps(require_types.LispType.ShiftRightEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] >>= b);
});
require_opsRegistry.addOps(require_types.LispType.UnsignedShiftRightEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] >>>= b);
});
require_opsRegistry.addOps(require_types.LispType.AndEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] &&= b);
});
require_opsRegistry.addOps(require_types.LispType.OrEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ||= b);
});
require_opsRegistry.addOps(require_types.LispType.NullishCoalescingEquals, ({ done, b, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ??= b);
});
//#endregion
