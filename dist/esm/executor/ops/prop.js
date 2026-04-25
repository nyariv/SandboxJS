import { SandboxAccessError } from "../../utils/errors.js";
import { LispType } from "../../utils/types.js";
import { Prop, hasOwnProperty, resolveSandboxProp } from "../../utils/Prop.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { hasPossibleProperties, isPropertyKey } from "../executorUtils.js";
//#region src/executor/ops/prop.ts
addOps(LispType.Prop, ({ done, a, b, obj, context, scope, internal }) => {
	if (a === null) throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
	if (!isPropertyKey(b)) b = `${b}`;
	if (a === void 0 && obj === void 0 && typeof b === "string") {
		const prop = scope.get(b, internal);
		if (prop.context === void 0) throw new ReferenceError(`${b} is not defined`);
		if (prop.context === context.ctx.sandboxGlobal) {
			if (context.ctx.options.audit) context.ctx.auditReport?.globalsAccess.add(b);
		}
		const val = prop.context[prop.prop];
		done(void 0, resolveSandboxProp(val, context, prop) || prop);
		return;
	} else if (a === void 0) throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
	if (!hasPossibleProperties(a)) {
		done(void 0, new Prop(void 0, b));
		return;
	}
	const prototypeAccess = typeof a === "function" || !hasOwnProperty(a, b);
	if (context.ctx.options.audit && prototypeAccess) {
		let prot = Object.getPrototypeOf(a);
		do
			if (hasOwnProperty(prot, b)) {
				if (context.ctx.auditReport && !context.ctx.auditReport.prototypeAccess[prot.constructor.name]) context.ctx.auditReport.prototypeAccess[prot.constructor.name] = /* @__PURE__ */ new Set();
				context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
			}
		while (prot = Object.getPrototypeOf(prot));
	}
	if (prototypeAccess) {
		if (typeof a === "function") {
			if (hasOwnProperty(a, b)) {
				const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
				if (!(whitelist && (!whitelist.size || whitelist.has(b))) && !context.ctx.sandboxedFunctions.has(a)) throw new SandboxAccessError(`Static method or property access not permitted: ${a.name}.${b.toString()}`);
			}
		}
		let prot = a;
		while (prot = Object.getPrototypeOf(prot)) if (hasOwnProperty(prot, b) || b === "__proto__") {
			const whitelist = context.ctx.prototypeWhitelist.get(prot);
			if (whitelist && (!whitelist.size || whitelist.has(b)) || context.ctx.sandboxedFunctions.has(prot.constructor)) break;
			if (b === "__proto__") throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
			throw new SandboxAccessError(`Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`);
		}
	}
	const val = a[b];
	if (typeof a === "function") {
		if (b === "prototype" && !context.ctx.sandboxedFunctions.has(a)) throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
	}
	if (b === "__proto__" && !context.ctx.sandboxedFunctions.has(val?.constructor)) throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
	const p = resolveSandboxProp(val, context, new Prop(a, b, false, false));
	if (p) {
		done(void 0, p);
		return;
	}
	const isSandboxGlobal = a === context.ctx.sandboxGlobal;
	const g = !isSandboxGlobal && obj instanceof Prop && obj.isGlobal || typeof a === "function" && !context.ctx.sandboxedFunctions.has(a) || context.ctx.globalsWhitelist.has(a) || isSandboxGlobal && typeof b === "string" && hasOwnProperty(context.ctx.globalScope.globals, b);
	done(void 0, new Prop(a, b, false, g, false));
});
addOps(LispType.StringIndex, ({ done, b, context }) => done(void 0, context.constants.strings[parseInt(b)]));
//#endregion

//# sourceMappingURL=prop.js.map