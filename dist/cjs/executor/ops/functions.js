const require_errors = require("../../utils/errors.js");
const require_CodeString = require("../../utils/CodeString.js");
const require_types = require("../../utils/types.js");
const require_Scope = require("../../utils/Scope.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/functions.ts
require_opsRegistry.addOps(require_types.LispType.ArrowFunction, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof require_CodeString.CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new require_CodeString.CodeString(obj[2]), context.constants);
	else throw new require_errors.SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const argNames = a.slice(1);
	if (a[0]) done(void 0, require_executorUtils.createFunctionAsync(argNames, b, ticks, context, scope, void 0, internal));
	else done(void 0, require_executorUtils.createFunction(argNames, b, ticks, context, scope, void 0, internal));
});
require_opsRegistry.addOps(require_types.LispType.Function, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof require_CodeString.CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new require_CodeString.CodeString(obj[2]), context.constants, false, {
		generatorDepth: a[1] === require_types.LispType.True ? 1 : 0,
		asyncDepth: a[0] === require_types.LispType.True ? 1 : 0,
		lispDepth: 0
	});
	else throw new require_errors.SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const isAsync = a[0];
	const isGenerator = a[1];
	const name = a[2];
	const argNames = a.slice(3);
	let func;
	if (isAsync === require_types.LispType.True && isGenerator === require_types.LispType.True) func = require_executorUtils.createAsyncGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isGenerator === require_types.LispType.True) func = require_executorUtils.createGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isAsync === require_types.LispType.True) func = require_executorUtils.createFunctionAsync(argNames, b, ticks, context, scope, name, internal);
	else func = require_executorUtils.createFunction(argNames, b, ticks, context, scope, name, internal);
	if (name) scope.declare(name, require_types.VarType.var, func, false, internal);
	done(void 0, func);
});
require_opsRegistry.addOps(require_types.LispType.InlineFunction, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof require_CodeString.CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new require_CodeString.CodeString(obj[2]), context.constants, false, {
		generatorDepth: a[1] === require_types.LispType.True ? 1 : 0,
		asyncDepth: a[0] === require_types.LispType.True ? 1 : 0,
		lispDepth: 0
	});
	else throw new require_errors.SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const isAsync = a[0];
	const isGenerator = a[1];
	const name = a[2];
	const argNames = a.slice(3);
	if (name) scope = new require_Scope.Scope(scope, {});
	let func;
	if (isAsync === require_types.LispType.True && isGenerator === require_types.LispType.True) func = require_executorUtils.createAsyncGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isGenerator === require_types.LispType.True) func = require_executorUtils.createGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isAsync === require_types.LispType.True) func = require_executorUtils.createFunctionAsync(argNames, b, ticks, context, scope, name, internal);
	else func = require_executorUtils.createFunction(argNames, b, ticks, context, scope, name, internal);
	if (name) scope.declare(name, require_types.VarType.let, func, false, internal);
	done(void 0, func);
});
//#endregion
