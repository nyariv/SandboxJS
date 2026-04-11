import { SandboxCapabilityError } from "../../utils/errors.js";
import { LispType, VarType } from "../../utils/types.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { ExecReturn, findControlFlowTarget, normalizeStatementLabel } from "../executorUtils.js";
//#region src/executor/ops/misc.ts
addOps(LispType.Internal, ({ done, a, b, scope, bobj, internal }) => {
	if (!internal) throw new SandboxCapabilityError("Internal variables are not accessible");
	done(void 0, scope.declare(a, VarType.internal, b, bobj?.isGlobal || false, internal));
});
addOps(LispType.LoopAction, ({ done, a, b, context, statementLabels }) => {
	const label = normalizeStatementLabel(b);
	const target = findControlFlowTarget(statementLabels, a, label);
	if (target === null) throw new TypeError("Illegal continue statement");
	if (!target) throw new TypeError(label ? `Undefined label '${label}'` : "Illegal " + a + " statement");
	done(void 0, new ExecReturn(context.ctx.auditReport, void 0, false, {
		type: a,
		label
	}));
});
addOps(LispType.Throw, ({ done, b }) => {
	done(b);
});
addOps(LispType.None, ({ done }) => done());
//#endregion

//# sourceMappingURL=misc.js.map