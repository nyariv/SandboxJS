const require_errors = require("../../utils/errors.js");
const require_types = require("../../utils/types.js");
const require_Prop = require("../../utils/Prop.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/prop.ts
require_opsRegistry.addOps(require_types.LispType.Prop, ({ done, a, b, obj, context, scope, internal }) => {
	if (a === null) throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
	if (!require_executorUtils.isPropertyKey(b)) b = `${b}`;
	if (a === void 0 && obj === void 0 && typeof b === "string") {
		const prop = scope.get(b, internal);
		if (prop.context === context.ctx.sandboxGlobal) {
			if (context.ctx.options.audit) context.ctx.auditReport?.globalsAccess.add(b);
		}
		done(void 0, require_executorUtils.getGlobalProp(prop.context ? prop.context[prop.prop] : void 0, context, prop) || prop);
		return;
	} else if (a === void 0) throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
	if (!require_executorUtils.hasPossibleProperties(a)) {
		done(void 0, new require_Prop.Prop(void 0, b));
		return;
	}
	const prototypeAccess = typeof a === "function" || !require_Prop.hasOwnProperty(a, b);
	if (context.ctx.options.audit && prototypeAccess) {
		let prot = Object.getPrototypeOf(a);
		do
			if (require_Prop.hasOwnProperty(prot, b)) {
				if (context.ctx.auditReport && !context.ctx.auditReport.prototypeAccess[prot.constructor.name]) context.ctx.auditReport.prototypeAccess[prot.constructor.name] = /* @__PURE__ */ new Set();
				context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
			}
		while (prot = Object.getPrototypeOf(prot));
	}
	if (prototypeAccess) {
		if (typeof a === "function") {
			if (require_Prop.hasOwnProperty(a, b)) {
				const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
				const replace = context.ctx.options.prototypeReplacements.get(a);
				if (replace) {
					done(void 0, new require_Prop.Prop(replace(a, true), b));
					return;
				}
				if (!(whitelist && (!whitelist.size || whitelist.has(b))) && !context.ctx.sandboxedFunctions.has(a)) throw new require_errors.SandboxAccessError(`Static method or property access not permitted: ${a.name}.${b.toString()}`);
			}
		}
		let prot = a;
		while (prot = Object.getPrototypeOf(prot)) if (require_Prop.hasOwnProperty(prot, b) || b === "__proto__") {
			const whitelist = context.ctx.prototypeWhitelist.get(prot);
			const replace = context.ctx.options.prototypeReplacements.get(prot.constructor);
			if (replace) {
				done(void 0, new require_Prop.Prop(replace(a, false), b));
				return;
			}
			if (whitelist && (!whitelist.size || whitelist.has(b)) || context.ctx.sandboxedFunctions.has(prot.constructor)) break;
			if (b === "__proto__") throw new require_errors.SandboxAccessError(`Access to prototype of global object is not permitted`);
			throw new require_errors.SandboxAccessError(`Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`);
		}
	}
	const val = a[b];
	if (typeof a === "function") {
		if (b === "prototype" && !context.ctx.sandboxedFunctions.has(a)) throw new require_errors.SandboxAccessError(`Access to prototype of global object is not permitted`);
	}
	if (b === "__proto__" && !context.ctx.sandboxedFunctions.has(val?.constructor)) throw new require_errors.SandboxAccessError(`Access to prototype of global object is not permitted`);
	const p = require_executorUtils.getGlobalProp(val, context, new require_Prop.Prop(a, b, false, false));
	if (p) {
		done(void 0, p);
		return;
	}
	const g = obj instanceof require_Prop.Prop && obj.isGlobal || typeof a === "function" && !context.ctx.sandboxedFunctions.has(a) || context.ctx.globalsWhitelist.has(a) || a === context.ctx.sandboxGlobal && typeof b === "string" && b in context.ctx.globalScope.globals;
	done(void 0, new require_Prop.Prop(a, b, false, g, false));
});
require_opsRegistry.addOps(require_types.LispType.StringIndex, ({ done, b, context }) => done(void 0, context.constants.strings[parseInt(b)]));
//#endregion
