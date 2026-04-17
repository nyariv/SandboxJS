import { SandboxCapabilityError } from "../../utils/errors.js";
import { CodeString } from "../../utils/CodeString.js";
import { LispType, VarType } from "../../utils/types.js";
import { Scope } from "../../utils/Scope.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { createAsyncGeneratorFunction, createFunction, createFunctionAsync, createGeneratorFunction } from "../executorUtils.js";
//#region src/executor/ops/functions.ts
addOps(LispType.ArrowFunction, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
	else throw new SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const argNames = a.slice(1);
	if (a[0]) done(void 0, createFunctionAsync(argNames, b, ticks, context, scope, void 0, internal));
	else done(void 0, createFunction(argNames, b, ticks, context, scope, void 0, internal));
});
addOps(LispType.Function, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants, false, {
		generatorDepth: a[1] === LispType.True ? 1 : 0,
		asyncDepth: a[0] === LispType.True ? 1 : 0,
		lispDepth: 0
	});
	else throw new SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const isAsync = a[0];
	const isGenerator = a[1];
	const name = a[2];
	const argNames = a.slice(3);
	let func;
	if (isAsync === LispType.True && isGenerator === LispType.True) func = createAsyncGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isGenerator === LispType.True) func = createGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isAsync === LispType.True) func = createFunctionAsync(argNames, b, ticks, context, scope, name, internal);
	else func = createFunction(argNames, b, ticks, context, scope, name, internal);
	if (name) scope.declare(name, VarType.var, func, false, internal);
	done(void 0, func);
});
addOps(LispType.InlineFunction, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants, false, {
		generatorDepth: a[1] === LispType.True ? 1 : 0,
		asyncDepth: a[0] === LispType.True ? 1 : 0,
		lispDepth: 0
	});
	else throw new SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const isAsync = a[0];
	const isGenerator = a[1];
	const name = a[2];
	const argNames = a.slice(3);
	if (name) scope = new Scope(scope, {});
	let func;
	if (isAsync === LispType.True && isGenerator === LispType.True) func = createAsyncGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isGenerator === LispType.True) func = createGeneratorFunction(argNames, b, ticks, context, scope, name, internal);
	else if (isAsync === LispType.True) func = createFunctionAsync(argNames, b, ticks, context, scope, name, internal);
	else func = createFunction(argNames, b, ticks, context, scope, name, internal);
	if (name) scope.declare(name, VarType.let, func, false, internal);
	done(void 0, func);
});
//#endregion

//# sourceMappingURL=functions.js.map