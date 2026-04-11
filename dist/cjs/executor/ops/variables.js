const require_types = require("../../utils/types.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
require("../executorUtils.js");
//#region src/executor/ops/variables.ts
require_opsRegistry.addOps(require_types.LispType.Return, ({ done, b }) => done(void 0, b));
require_opsRegistry.addOps(require_types.LispType.Var, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, require_types.VarType.var, b, bobj?.isGlobal || false, internal));
});
require_opsRegistry.addOps(require_types.LispType.Let, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, require_types.VarType.let, b, bobj?.isGlobal || false, internal));
});
require_opsRegistry.addOps(require_types.LispType.Const, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, require_types.VarType.const, b, bobj?.isGlobal || false, internal));
});
//#endregion
