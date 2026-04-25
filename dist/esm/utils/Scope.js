import { SandboxError } from "./errors.js";
import { VarType, reservedWords } from "./types.js";
import { Prop, hasOwnProperty, resolveSandboxProp } from "./Prop.js";
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
		if (scope && isThis) return new Prop({ this: scope.functionThis }, key, false, false, true);
		if (!scope) return new Prop(void 0, key);
		if (internal && scope.internalVars[key]) return new Prop(scope.internalVars, key, false, false, true, true);
		return new Prop(scope.allVars, key, hasOwnProperty(scope.const, key), hasOwnProperty(scope.globals, key), true);
	}
	set(key, val, internal) {
		if (key === "this") throw new SyntaxError("\"this\" cannot be assigned");
		if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
		const prop = this.get(key, internal);
		if (prop.context === void 0) throw new ReferenceError(`Variable '${key}' was not declared.`);
		if (prop.context === null) throw new TypeError(`Cannot set properties of null, (setting '${key}')`);
		if (prop.isConst) throw new TypeError(`Assignment to constant variable`);
		if (prop.isGlobal) throw new SandboxError(`Cannot override global variable '${key}'`);
		prop.context[prop.prop] = val;
		return prop;
	}
	getWhereValScope(key, isThis, internal) {
		let scope = this;
		if (isThis) {
			do {
				if (scope.functionThis !== void 0) return scope;
				scope = scope.parent;
			} while (scope !== null);
			return null;
		}
		do {
			if (internal && key in scope.internalVars && !(key in {} && !hasOwnProperty(scope.internalVars, key))) return scope;
			if (key in scope.allVars && !(key in {} && !hasOwnProperty(scope.allVars, key))) return scope;
			scope = scope.parent;
		} while (scope !== null);
		return null;
	}
	getWhereVarScope(key, localScope, internal) {
		let scope = this;
		do {
			if (internal && key in scope.internalVars && !(key in {} && !hasOwnProperty(scope.internalVars, key))) return scope;
			if (key in scope.allVars && !(key in {} && !hasOwnProperty(scope.allVars, key))) return scope;
			if (scope.parent === null || localScope || scope.functionThis !== void 0) return scope;
			scope = scope.parent;
		} while (scope !== null);
		return scope;
	}
	declare(key, type, value, isGlobal, internal) {
		if (key === "this") throw new SyntaxError("\"this\" cannot be declared");
		if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
		const existingScope = this.getWhereVarScope(key, type !== VarType.var, internal);
		if (type === VarType.var) {
			if (existingScope.var[key]) {
				existingScope.allVars[key] = value;
				if (!isGlobal) delete existingScope.globals[key];
				else existingScope.globals[key] = true;
				return new Prop(existingScope.allVars, key, false, existingScope.globals[key], true);
			} else if (key in existingScope.allVars) throw new SyntaxError(`Identifier '${key}' has already been declared`);
		}
		if (key in existingScope.allVars || key in existingScope.internalVars) throw new SyntaxError(`Identifier '${key}' has already been declared`);
		if (isGlobal) existingScope.globals[key] = true;
		existingScope[type][key] = true;
		if (type === VarType.internal) existingScope.internalVars[key] = value;
		else existingScope.allVars[key] = value;
		return new Prop(type === VarType.internal ? this.internalVars : this.allVars, key, type === VarType.const, isGlobal, true, type === VarType.internal);
	}
};
var LocalScope = class {};
var optional = {};
var DelayedSynchronousResult = class {
	constructor(cb) {
		this.result = cb();
	}
};
function delaySynchronousResult(cb) {
	return new DelayedSynchronousResult(cb);
}
function sanitizeProp(value, context, cache = /* @__PURE__ */ new WeakSet()) {
	if (value === null || typeof value !== "object" && typeof value !== "function") return value;
	value = resolveSandboxProp(value, context) || value;
	if (value instanceof Prop) value = value.get(context);
	if (value === optional) return;
	return value;
}
function sanitizeScope(scope, context, cache = /* @__PURE__ */ new WeakSet()) {
	if (cache.has(scope)) return;
	cache.add(scope);
	for (const key in scope) {
		const val = scope[key];
		if (val !== null && typeof val === "object") sanitizeScope(val, context, cache);
		scope[key] = sanitizeProp(val, context);
	}
}
function sanitizeScopes(scopes, context, cache = /* @__PURE__ */ new WeakSet()) {
	for (const scope of scopes) sanitizeScope(scope, context, cache);
}
//#endregion
export { DelayedSynchronousResult, LocalScope, Scope, delaySynchronousResult, optional, sanitizeProp, sanitizeScope, sanitizeScopes };

//# sourceMappingURL=Scope.js.map