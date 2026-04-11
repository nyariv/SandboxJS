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
		return ctx[this.prop];
	}
};
function hasOwnProperty(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}
//#endregion
export { Prop, hasOwnProperty };

//# sourceMappingURL=Prop.js.map