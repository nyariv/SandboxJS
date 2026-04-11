import { LispType, VarType } from "../../utils/types.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import "../executorUtils.js";
//#region src/executor/ops/variables.ts
addOps(LispType.Return, ({ done, b }) => done(void 0, b));
addOps(LispType.Var, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, VarType.var, b, bobj?.isGlobal || false, internal));
});
addOps(LispType.Let, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, VarType.let, b, bobj?.isGlobal || false, internal));
});
addOps(LispType.Const, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, VarType.const, b, bobj?.isGlobal || false, internal));
});
//#endregion

//# sourceMappingURL=variables.js.map