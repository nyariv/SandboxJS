const require_errors = require("./errors.js");
const require_types = require("./types.js");
const require_Prop = require("./Prop.js");
//#region src/utils/Scope.ts
function keysOnly(obj) {
	const ret = Object.assign({}, obj);
	for (const key in ret) ret[key] = true;
	return ret;
}
var Scope = class {
	constructor(parent, vars = {}, functionThis) {
		this.const = {};
		this.let = {};
		this.var = {};
		this.internal = {};
		this.internalVars = {};
		const isFuncScope = functionThis !== void 0 || parent === null;
		this.parent = parent;
		this.allVars = vars;
		this.let = isFuncScope ? this.let : keysOnly(vars);
		this.var = isFuncScope ? keysOnly(vars) : this.var;
		this.globals = parent === null ? keysOnly(vars) : {};
		this.functionThis = functionThis;
	}
	get(key, internal) {
		const isThis = key === "this";
		const scope = this.getWhereValScope(key, isThis, internal);
		if (scope && isThis) return new require_Prop.Prop({ this: scope.functionThis }, key, false, false, true);
		if (!scope) return new require_Prop.Prop(void 0, key);
		if (internal && scope.internalVars[key]) return new require_Prop.Prop(scope.internalVars, key, false, false, true, true);
		return new require_Prop.Prop(scope.allVars, key, key in scope.const, key in scope.globals, true);
	}
	set(key, val, internal) {
		if (key === "this") throw new SyntaxError("\"this\" cannot be assigned");
		if (require_types.reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
		const prop = this.get(key, internal);
		if (prop.context === void 0) throw new ReferenceError(`Variable '${key}' was not declared.`);
		if (prop.context === null) throw new TypeError(`Cannot set properties of null, (setting '${key}')`);
		if (prop.isConst) throw new TypeError(`Assignment to constant variable`);
		if (prop.isGlobal) throw new require_errors.SandboxError(`Cannot override global variable '${key}'`);
		prop.context[prop.prop] = val;
		return prop;
	}
	getWhereValScope(key, isThis, internal) {
		if (isThis) if (this.functionThis !== void 0) return this;
		else return this.parent?.getWhereValScope(key, isThis, internal) || null;
		if (internal && key in this.internalVars && !(key in {} && !require_Prop.hasOwnProperty(this.internalVars, key))) return this;
		if (key in this.allVars && !(key in {} && !require_Prop.hasOwnProperty(this.allVars, key))) return this;
		return this.parent?.getWhereValScope(key, isThis, internal) || null;
	}
	getWhereVarScope(key, localScope, internal) {
		if (key in this.internalVars && !(key in {} && !require_Prop.hasOwnProperty(this.internalVars, key))) return this;
		if (key in this.allVars && !(key in {} && !require_Prop.hasOwnProperty(this.allVars, key))) return this;
		if (this.parent === null || localScope || this.functionThis !== void 0) return this;
		return this.parent.getWhereVarScope(key, localScope, internal);
	}
	declare(key, type, value, isGlobal, internal) {
		if (key === "this") throw new SyntaxError("\"this\" cannot be declared");
		if (require_types.reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
		const existingScope = this.getWhereVarScope(key, type !== require_types.VarType.var, internal);
		if (type === require_types.VarType.var) {
			if (existingScope.var[key]) {
				existingScope.allVars[key] = value;
				if (!isGlobal) delete existingScope.globals[key];
				else existingScope.globals[key] = true;
				return new require_Prop.Prop(existingScope.allVars, key, false, existingScope.globals[key], true);
			} else if (key in existingScope.allVars) throw new SyntaxError(`Identifier '${key}' has already been declared`);
		}
		if (key in existingScope.allVars || key in existingScope.internalVars) throw new SyntaxError(`Identifier '${key}' has already been declared`);
		if (isGlobal) existingScope.globals[key] = true;
		existingScope[type][key] = true;
		if (type === require_types.VarType.internal) existingScope.internalVars[key] = value;
		else existingScope.allVars[key] = value;
		return new require_Prop.Prop(type === require_types.VarType.internal ? this.internalVars : this.allVars, key, type === require_types.VarType.const, isGlobal, true, type === require_types.VarType.internal);
	}
};
var LocalScope = class {};
//#endregion
exports.LocalScope = LocalScope;
exports.Scope = Scope;
