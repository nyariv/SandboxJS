import { THIS_DEPENDENT_FUNCTION_REPLACEMENTS } from "./functionReplacements.js";
//#region src/utils/Prop.ts
var boundFunctionCache = /* @__PURE__ */ new WeakMap();
var replacementReceiver = /* @__PURE__ */ new WeakMap();
var Prop = class {
	constructor(context, prop, isConst = false, isGlobal = false, isVariable = false, isInternal = false) {
		this.context = context;
		this.prop = prop;
		this.isConst = isConst;
		this.isGlobal = isGlobal;
		this.isVariable = isVariable;
		this.isInternal = isInternal;
	}
	get(context) {
		const ctx = this.context;
		if (ctx === void 0) throw new ReferenceError(`${this.prop.toString()} is not defined`);
		if (ctx === null) throw new TypeError(`Cannot read properties of null, (reading '${this.prop.toString()}')`);
		context.getSubscriptions.forEach((cb) => cb(ctx, this.prop.toString()));
		const val = ctx[this.prop];
		return getReplacementValue(val, context, ctx);
	}
};
function hasOwnProperty(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}
function getReplacementReceiver(fn) {
	return replacementReceiver.get(fn);
}
function resolveSandboxProp(val, context, prop) {
	if (!val) return;
	if (val instanceof Prop) {
		if (!prop) prop = val;
		val = val.get(context);
	}
	const p = prop?.prop || "prop";
	if (val === globalThis) return new Prop({ [p]: context.ctx.sandboxGlobal }, p, prop?.isConst || false, false, prop?.isVariable || false);
	if (prop && !prop.isVariable) return;
	const replacement = getReplacementValue(val, context, prop?.context);
	if (replacement !== val) return new Prop({ [p]: replacement }, p, prop?.isConst || false, prop?.isGlobal || false, prop?.isVariable || false);
}
function getReplacementValue(val, context, bindContext) {
	if (typeof val !== "function") return val;
	const replacement = context.evals.get(val);
	if (replacement === void 0) return val;
	if (!shouldBindReplacement(val, bindContext, context)) return replacement;
	return bindReplacement(replacement, bindContext, val, context);
}
function shouldBindReplacement(original, bindContext, context) {
	return THIS_DEPENDENT_FUNCTION_REPLACEMENTS.has(original) && bindContext !== null && (typeof bindContext === "object" || typeof bindContext === "function") && bindContext !== context.ctx.sandboxGlobal && !context.ctx.globalsWhitelist.has(bindContext);
}
function bindReplacement(replacement, bindContext, original, context) {
	let cache = boundFunctionCache.get(replacement);
	if (!cache) {
		cache = /* @__PURE__ */ new WeakMap();
		boundFunctionCache.set(replacement, cache);
	}
	let bound = cache.get(bindContext);
	if (bound) return bound;
	bound = function(...args) {
		return replacement.apply(this, args);
	};
	redefineFunctionMetadata(bound, original);
	context.ctx.sandboxedFunctions.add(bound);
	replacementReceiver.set(bound, bindContext);
	cache.set(bindContext, bound);
	return bound;
}
function redefineFunctionMetadata(target, source, overrides = {}) {
	for (const key of ["name", "length"]) {
		const descriptor = Object.getOwnPropertyDescriptor(source, key);
		if (descriptor?.configurable) Object.defineProperty(target, key, {
			...descriptor,
			value: overrides[key] ?? source[key]
		});
	}
}
//#endregion
export { Prop, getReplacementReceiver, hasOwnProperty, resolveSandboxProp };

//# sourceMappingURL=Prop.js.map