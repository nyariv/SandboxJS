const require_errors = require("../../utils/errors.js");
const require_types = require("../../utils/types.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/misc.ts
require_opsRegistry.addOps(require_types.LispType.Internal, ({ done, a, b, scope, bobj, internal }) => {
	if (!internal) throw new require_errors.SandboxCapabilityError("Internal variables are not accessible");
	done(void 0, scope.declare(a, require_types.VarType.internal, b, bobj?.isGlobal || false, internal));
});
require_opsRegistry.addOps(require_types.LispType.LoopAction, ({ done, a, b, context, statementLabels }) => {
	const label = require_executorUtils.normalizeStatementLabel(b);
	const target = require_executorUtils.findControlFlowTarget(statementLabels, a, label);
	if (target === null) throw new TypeError("Illegal continue statement");
	if (!target) throw new TypeError(label ? `Undefined label '${label}'` : "Illegal " + a + " statement");
	done(void 0, new require_executorUtils.ExecReturn(context.ctx.auditReport, void 0, false, {
		type: a,
		label
	}));
});
require_opsRegistry.addOps(require_types.LispType.Throw, ({ done, b }) => {
	done(b);
});
require_opsRegistry.addOps(require_types.LispType.None, ({ done }) => done());
//#endregion
