//#region src/utils/Prop.ts
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
		if (typeof val === "function") {
			const replacement = context.ctx.functionReplacements.get(val);
			if (replacement !== void 0) return replacement;
		}
		return val;
	}
};
function hasOwnProperty(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}
function getGlobalProp(val, context, prop) {
	if (!val) return;
	const isFunc = typeof val === "function";
	if (val instanceof Prop) {
		if (!prop) prop = val;
		val = val.get(context);
	}
	const p = prop?.prop || "prop";
	if (val === globalThis) return new Prop({ [p]: context.ctx.sandboxGlobal }, p, prop?.isConst || false, false, prop?.isVariable || false);
	const evl = isFunc && context.evals.get(val);
	if (evl) return new Prop({ [p]: evl }, p, prop?.isConst || false, true, prop?.isVariable || false);
}
//#endregion
export { Prop, getGlobalProp, hasOwnProperty };

//# sourceMappingURL=Prop.js.map