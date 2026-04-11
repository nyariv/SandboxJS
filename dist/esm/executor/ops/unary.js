import { LispType } from "../../utils/types.js";
import { Prop } from "../../utils/Prop.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { assignCheck, sanitizeProp } from "../executorUtils.js";
//#region src/executor/ops/unary.ts
addOps(LispType.Not, ({ done, b }) => done(void 0, !b));
addOps(LispType.Inverse, ({ done, b }) => done(void 0, ~b));
addOps(LispType.IncrementBefore, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, ++obj.context[obj.prop]);
});
addOps(LispType.IncrementAfter, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop]++);
});
addOps(LispType.DecrementBefore, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, --obj.context[obj.prop]);
});
addOps(LispType.DecrementAfter, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop]--);
});
addOps(LispType.Positive, ({ done, b }) => done(void 0, +b));
addOps(LispType.Negative, ({ done, b }) => done(void 0, -b));
addOps(LispType.Typeof, ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
	exec(ticks, b, scope, context, (e, prop) => {
		done(void 0, typeof sanitizeProp(prop, context));
	}, void 0, internal, generatorYield);
});
addOps(LispType.Delete, ({ done, context, bobj }) => {
	if (!(bobj instanceof Prop)) {
		done(void 0, true);
		return;
	}
	assignCheck(bobj, context, "delete");
	if (bobj.isVariable) {
		done(void 0, false);
		return;
	}
	done(void 0, delete bobj.context?.[bobj.prop]);
});
addOps(LispType.Void, ({ done }) => {
	done();
});
//#endregion

//# sourceMappingURL=unary.js.map