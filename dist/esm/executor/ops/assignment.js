import { LispType } from "../../utils/types.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { assignCheck } from "../executorUtils.js";
//#region src/executor/ops/assignment.ts
addOps(LispType.Assign, ({ done, b, obj, context, scope, bobj, internal }) => {
	assignCheck(obj, context);
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
	done(void 0, obj.context[obj.prop] = b);
});
addOps(LispType.AddEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] += b);
});
addOps(LispType.SubractEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] -= b);
});
addOps(LispType.DivideEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] /= b);
});
addOps(LispType.MultiplyEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] *= b);
});
addOps(LispType.PowerEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] **= b);
});
addOps(LispType.ModulusEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] %= b);
});
addOps(LispType.BitNegateEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ^= b);
});
addOps(LispType.BitAndEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] &= b);
});
addOps(LispType.BitOrEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] |= b);
});
addOps(LispType.ShiftLeftEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] <<= b);
});
addOps(LispType.ShiftRightEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] >>= b);
});
addOps(LispType.UnsignedShiftRightEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] >>>= b);
});
addOps(LispType.AndEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] &&= b);
});
addOps(LispType.OrEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ||= b);
});
addOps(LispType.NullishCoalescingEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ??= b);
});
//#endregion

//# sourceMappingURL=assignment.js.map