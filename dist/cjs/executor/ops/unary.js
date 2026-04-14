const require_types = require("../../utils/types.js");
const require_Prop = require("../../utils/Prop.js");
const require_Scope = require("../../utils/Scope.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/unary.ts
require_opsRegistry.addOps(require_types.LispType.Not, ({ done, b }) => done(void 0, !b));
require_opsRegistry.addOps(require_types.LispType.Inverse, ({ done, b }) => done(void 0, ~b));
require_opsRegistry.addOps(require_types.LispType.IncrementBefore, ({ done, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, ++obj.context[obj.prop]);
});
require_opsRegistry.addOps(require_types.LispType.IncrementAfter, ({ done, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop]++);
});
require_opsRegistry.addOps(require_types.LispType.DecrementBefore, ({ done, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, --obj.context[obj.prop]);
});
require_opsRegistry.addOps(require_types.LispType.DecrementAfter, ({ done, obj, context }) => {
	require_executorUtils.assignCheck(obj, context);
	done(void 0, obj.context[obj.prop]--);
});
require_opsRegistry.addOps(require_types.LispType.Positive, ({ done, b }) => done(void 0, +b));
require_opsRegistry.addOps(require_types.LispType.Negative, ({ done, b }) => done(void 0, -b));
require_opsRegistry.addOps(require_types.LispType.Typeof, ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
	exec(ticks, b, scope, context, (e, prop) => {
		done(void 0, typeof require_Scope.sanitizeProp(prop, context));
	}, void 0, internal, generatorYield);
});
require_opsRegistry.addOps(require_types.LispType.Delete, ({ done, context, bobj }) => {
	if (!(bobj instanceof require_Prop.Prop)) {
		done(void 0, true);
		return;
	}
	require_executorUtils.assignCheck(bobj, context, "delete");
	if (bobj.isVariable) {
		done(void 0, false);
		return;
	}
	done(void 0, delete bobj.context?.[bobj.prop]);
});
require_opsRegistry.addOps(require_types.LispType.Void, ({ done }) => {
	done();
});
//#endregion
