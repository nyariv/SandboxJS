//#region src/utils.ts
var AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
var GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor;
var AsyncGeneratorFunction = Object.getPrototypeOf(async function* () {}).constructor;
function createSandboxSymbolContext(symbolWhitelist) {
	return {
		registry: /* @__PURE__ */ new Map(),
		reverseRegistry: /* @__PURE__ */ new Map(),
		whitelist: { ...symbolWhitelist }
	};
}
var RESERVED_SYMBOL_PROPERTIES = new Set([
	"length",
	"name",
	"prototype",
	"for",
	"keyFor"
]);
function copyWhitelistedSymbols(target, symbolWhitelist) {
	for (const [key, value] of Object.entries(symbolWhitelist)) {
		if (RESERVED_SYMBOL_PROPERTIES.has(key)) continue;
		const descriptor = Object.getOwnPropertyDescriptor(Symbol, key);
		if (descriptor) Object.defineProperty(target, key, descriptor);
	}
}
function getSandboxSymbolCtor(symbols) {
	if (symbols.ctor) return symbols.ctor;
	function SandboxSymbol(description) {
		if (new.target) throw new TypeError("Symbol is not a constructor");
		return Symbol(description === void 0 ? void 0 : String(description));
	}
	copyWhitelistedSymbols(SandboxSymbol, symbols.whitelist);
	Object.defineProperties(SandboxSymbol, {
		prototype: {
			value: Symbol.prototype,
			enumerable: false,
			configurable: false,
			writable: false
		},
		for: {
			value(key) {
				const stringKey = String(key);
				let symbol = symbols.registry.get(stringKey);
				if (!symbol) {
					symbol = Symbol(stringKey);
					symbols.registry.set(stringKey, symbol);
					symbols.reverseRegistry.set(symbol, stringKey);
				}
				return symbol;
			},
			enumerable: false,
			configurable: true,
			writable: true
		},
		keyFor: {
			value(symbol) {
				return typeof symbol === "symbol" ? symbols.reverseRegistry.get(symbol) : void 0;
			},
			enumerable: false,
			configurable: true,
			writable: true
		}
	});
	symbols.ctor = SandboxSymbol;
	return SandboxSymbol;
}
function SandboxGlobal() {}
function sandboxedGlobal(globals) {
	SG.prototype = SandboxGlobal.prototype;
	return SG;
	function SG() {
		for (const i in globals) this[i] = globals[i];
	}
}
var ExecContext = class {
	constructor(ctx, constants, tree, getSubscriptions, setSubscriptions, changeSubscriptions, setSubscriptionsGlobal, changeSubscriptionsGlobal, evals, registerSandboxFunction, allowJit, evalContext) {
		this.ctx = ctx;
		this.constants = constants;
		this.tree = tree;
		this.getSubscriptions = getSubscriptions;
		this.setSubscriptions = setSubscriptions;
		this.changeSubscriptions = changeSubscriptions;
		this.setSubscriptionsGlobal = setSubscriptionsGlobal;
		this.changeSubscriptionsGlobal = changeSubscriptionsGlobal;
		this.evals = evals;
		this.registerSandboxFunction = registerSandboxFunction;
		this.allowJit = allowJit;
		this.evalContext = evalContext;
	}
};
function createContext(sandbox, options) {
	const sandboxSymbols = createSandboxSymbolContext(options.symbolWhitelist);
	const sandboxGlobal = new (sandboxedGlobal(options.globals))();
	const context = {
		sandbox,
		globalsWhitelist: new Set(Object.values(options.globals)),
		prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
		sandboxSymbols,
		options,
		globalScope: new Scope(null, options.globals, sandboxGlobal),
		sandboxGlobal,
		ticks: {
			ticks: 0n,
			tickLimit: options.executionQuota,
			nextYield: options.nonBlocking ? NON_BLOCKING_THRESHOLD : void 0
		},
		sandboxedFunctions: /* @__PURE__ */ new WeakSet()
	};
	context.prototypeWhitelist.set(Object.getPrototypeOf(sandboxGlobal), /* @__PURE__ */ new Set());
	context.prototypeWhitelist.set(Object.getPrototypeOf([][Symbol.iterator]()), /* @__PURE__ */ new Set());
	const genProto = Object.getPrototypeOf((function* () {})());
	context.prototypeWhitelist.set(Object.getPrototypeOf(genProto), /* @__PURE__ */ new Set());
	const asyncGenProto = Object.getPrototypeOf((async function* () {})());
	context.prototypeWhitelist.set(Object.getPrototypeOf(asyncGenProto), /* @__PURE__ */ new Set());
	return context;
}
function createExecContext(sandbox, executionTree, evalContext) {
	const evals = /* @__PURE__ */ new Map();
	const execContext = new ExecContext(sandbox.context, executionTree.constants, executionTree.tree, /* @__PURE__ */ new Set(), /* @__PURE__ */ new WeakMap(), /* @__PURE__ */ new WeakMap(), sandbox.setSubscriptions, sandbox.changeSubscriptions, evals, (fn) => sandbox.sandboxFunctions.set(fn, execContext), !!evalContext, evalContext);
	if (evalContext) {
		const func = evalContext.sandboxFunction(execContext);
		const asyncFunc = evalContext.sandboxAsyncFunction(execContext);
		const genFunc = evalContext.sandboxGeneratorFunction(execContext);
		const asyncGenFunc = evalContext.sandboxAsyncGeneratorFunction(execContext);
		const sandboxSymbol = evalContext.sandboxedSymbol(execContext);
		evals.set(Function, func);
		evals.set(AsyncFunction, asyncFunc);
		evals.set(GeneratorFunction, genFunc);
		evals.set(AsyncGeneratorFunction, asyncGenFunc);
		evals.set(Symbol, sandboxSymbol);
		evals.set(eval, evalContext.sandboxedEval(func, execContext));
		evals.set(setTimeout, evalContext.sandboxedSetTimeout(func, execContext));
		evals.set(setInterval, evalContext.sandboxedSetInterval(func, execContext));
		evals.set(clearTimeout, evalContext.sandboxedClearTimeout(execContext));
		evals.set(clearInterval, evalContext.sandboxedClearInterval(execContext));
		for (const [key, value] of evals) {
			execContext.registerSandboxFunction(value);
			sandbox.context.prototypeWhitelist.set(value.prototype, /* @__PURE__ */ new Set());
			sandbox.context.prototypeWhitelist.set(key.prototype, /* @__PURE__ */ new Set());
			if (sandbox.context.globalsWhitelist.has(key)) sandbox.context.globalsWhitelist.add(value);
		}
	}
	return execContext;
}
var CodeString = class CodeString {
	constructor(str) {
		this.ref = { str: "" };
		if (str instanceof CodeString) {
			this.ref = str.ref;
			this.start = str.start;
			this.end = str.end;
		} else {
			this.ref.str = str;
			this.start = 0;
			this.end = str.length;
		}
	}
	substring(start, end) {
		if (!this.length) return this;
		start = this.start + start;
		if (start < 0) start = 0;
		if (start > this.end) start = this.end;
		end = end === void 0 ? this.end : this.start + end;
		if (end < 0) end = 0;
		if (end > this.end) end = this.end;
		const code = new CodeString(this);
		code.start = start;
		code.end = end;
		return code;
	}
	get length() {
		const len = this.end - this.start;
		return len < 0 ? 0 : len;
	}
	char(i) {
		if (this.start === this.end) return void 0;
		return this.ref.str[this.start + i];
	}
	toString() {
		return this.ref.str.substring(this.start, this.end);
	}
	trimStart() {
		const found = /^\s+/.exec(this.toString());
		const code = new CodeString(this);
		if (found) code.start += found[0].length;
		return code;
	}
	slice(start, end) {
		if (start < 0) start = this.end - this.start + start;
		if (start < 0) start = 0;
		if (end === void 0) end = this.end - this.start;
		if (end < 0) end = this.end - this.start + end;
		if (end < 0) end = 0;
		return this.substring(start, end);
	}
	trim() {
		const code = this.trimStart();
		const found = /\s+$/.exec(code.toString());
		if (found) code.end -= found[0].length;
		return code;
	}
	valueOf() {
		return this.toString();
	}
};
function keysOnly(obj) {
	const ret = Object.assign({}, obj);
	for (const key in ret) ret[key] = true;
	return ret;
}
var NON_BLOCKING_THRESHOLD = 5000n;
var reservedWords = new Set([
	"await",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"finally",
	"for",
	"function",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"let",
	"new",
	"null",
	"return",
	"super",
	"switch",
	"this",
	"throw",
	"true",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with"
]);
var VarType = /* @__PURE__ */ function(VarType) {
	VarType["let"] = "let";
	VarType["const"] = "const";
	VarType["var"] = "var";
	VarType["internal"] = "internal";
	return VarType;
}({});
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
		return new Prop(scope.allVars, key, key in scope.const, key in scope.globals, true);
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
		if (isThis) if (this.functionThis !== void 0) return this;
		else return this.parent?.getWhereValScope(key, isThis, internal) || null;
		if (internal && key in this.internalVars && !(key in {} && !hasOwnProperty(this.internalVars, key))) return this;
		if (key in this.allVars && !(key in {} && !hasOwnProperty(this.allVars, key))) return this;
		return this.parent?.getWhereValScope(key, isThis, internal) || null;
	}
	getWhereVarScope(key, localScope, internal) {
		if (key in this.internalVars && !(key in {} && !hasOwnProperty(this.internalVars, key))) return this;
		if (key in this.allVars && !(key in {} && !hasOwnProperty(this.allVars, key))) return this;
		if (this.parent === null || localScope || this.functionThis !== void 0) return this;
		return this.parent.getWhereVarScope(key, localScope, internal);
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
var FunctionScope = class {};
var LocalScope = class {};
var SandboxError = class extends Error {};
var SandboxExecutionQuotaExceededError = class extends SandboxError {};
var SandboxExecutionTreeError = class extends SandboxError {};
var SandboxCapabilityError = class extends SandboxError {};
var SandboxAccessError = class extends SandboxError {};
var DelayedSynchronousResult = class {
	constructor(cb) {
		this.result = cb();
	}
};
function delaySynchronousResult(cb) {
	return new DelayedSynchronousResult(cb);
}
function isLisp(item) {
	return Array.isArray(item) && typeof item[0] === "number" && item[0] !== LispType.None && item[0] !== LispType.True;
}
var LispType = /* @__PURE__ */ function(LispType) {
	LispType[LispType["None"] = 0] = "None";
	LispType[LispType["Prop"] = 1] = "Prop";
	LispType[LispType["StringIndex"] = 2] = "StringIndex";
	LispType[LispType["Let"] = 3] = "Let";
	LispType[LispType["Const"] = 4] = "Const";
	LispType[LispType["Call"] = 5] = "Call";
	LispType[LispType["KeyVal"] = 6] = "KeyVal";
	LispType[LispType["Number"] = 7] = "Number";
	LispType[LispType["Return"] = 8] = "Return";
	LispType[LispType["Assign"] = 9] = "Assign";
	LispType[LispType["InlineFunction"] = 10] = "InlineFunction";
	LispType[LispType["ArrowFunction"] = 11] = "ArrowFunction";
	LispType[LispType["CreateArray"] = 12] = "CreateArray";
	LispType[LispType["If"] = 13] = "If";
	LispType[LispType["IfCase"] = 14] = "IfCase";
	LispType[LispType["InlineIf"] = 15] = "InlineIf";
	LispType[LispType["InlineIfCase"] = 16] = "InlineIfCase";
	LispType[LispType["SpreadObject"] = 17] = "SpreadObject";
	LispType[LispType["SpreadArray"] = 18] = "SpreadArray";
	LispType[LispType["ArrayProp"] = 19] = "ArrayProp";
	LispType[LispType["PropOptional"] = 20] = "PropOptional";
	LispType[LispType["CallOptional"] = 21] = "CallOptional";
	LispType[LispType["CreateObject"] = 22] = "CreateObject";
	LispType[LispType["Group"] = 23] = "Group";
	LispType[LispType["Not"] = 24] = "Not";
	LispType[LispType["IncrementBefore"] = 25] = "IncrementBefore";
	LispType[LispType["IncrementAfter"] = 26] = "IncrementAfter";
	LispType[LispType["DecrementBefore"] = 27] = "DecrementBefore";
	LispType[LispType["DecrementAfter"] = 28] = "DecrementAfter";
	LispType[LispType["And"] = 29] = "And";
	LispType[LispType["Or"] = 30] = "Or";
	LispType[LispType["StrictNotEqual"] = 31] = "StrictNotEqual";
	LispType[LispType["StrictEqual"] = 32] = "StrictEqual";
	LispType[LispType["Plus"] = 33] = "Plus";
	LispType[LispType["Var"] = 34] = "Var";
	LispType[LispType["GlobalSymbol"] = 35] = "GlobalSymbol";
	LispType[LispType["Literal"] = 36] = "Literal";
	LispType[LispType["Function"] = 37] = "Function";
	LispType[LispType["Loop"] = 38] = "Loop";
	LispType[LispType["Try"] = 39] = "Try";
	LispType[LispType["Switch"] = 40] = "Switch";
	LispType[LispType["SwitchCase"] = 41] = "SwitchCase";
	LispType[LispType["InternalBlock"] = 42] = "InternalBlock";
	LispType[LispType["Expression"] = 43] = "Expression";
	LispType[LispType["Await"] = 44] = "Await";
	LispType[LispType["New"] = 45] = "New";
	LispType[LispType["Throw"] = 46] = "Throw";
	LispType[LispType["Minus"] = 47] = "Minus";
	LispType[LispType["Divide"] = 48] = "Divide";
	LispType[LispType["Power"] = 49] = "Power";
	LispType[LispType["Multiply"] = 50] = "Multiply";
	LispType[LispType["Modulus"] = 51] = "Modulus";
	LispType[LispType["Equal"] = 52] = "Equal";
	LispType[LispType["NotEqual"] = 53] = "NotEqual";
	LispType[LispType["SmallerEqualThan"] = 54] = "SmallerEqualThan";
	LispType[LispType["LargerEqualThan"] = 55] = "LargerEqualThan";
	LispType[LispType["SmallerThan"] = 56] = "SmallerThan";
	LispType[LispType["LargerThan"] = 57] = "LargerThan";
	LispType[LispType["Negative"] = 58] = "Negative";
	LispType[LispType["Positive"] = 59] = "Positive";
	LispType[LispType["Typeof"] = 60] = "Typeof";
	LispType[LispType["Delete"] = 61] = "Delete";
	LispType[LispType["Instanceof"] = 62] = "Instanceof";
	LispType[LispType["In"] = 63] = "In";
	LispType[LispType["Inverse"] = 64] = "Inverse";
	LispType[LispType["SubractEquals"] = 65] = "SubractEquals";
	LispType[LispType["AddEquals"] = 66] = "AddEquals";
	LispType[LispType["DivideEquals"] = 67] = "DivideEquals";
	LispType[LispType["PowerEquals"] = 68] = "PowerEquals";
	LispType[LispType["MultiplyEquals"] = 69] = "MultiplyEquals";
	LispType[LispType["ModulusEquals"] = 70] = "ModulusEquals";
	LispType[LispType["BitNegateEquals"] = 71] = "BitNegateEquals";
	LispType[LispType["BitAndEquals"] = 72] = "BitAndEquals";
	LispType[LispType["BitOrEquals"] = 73] = "BitOrEquals";
	LispType[LispType["UnsignedShiftRightEquals"] = 74] = "UnsignedShiftRightEquals";
	LispType[LispType["ShiftRightEquals"] = 75] = "ShiftRightEquals";
	LispType[LispType["ShiftLeftEquals"] = 76] = "ShiftLeftEquals";
	LispType[LispType["BitAnd"] = 77] = "BitAnd";
	LispType[LispType["BitOr"] = 78] = "BitOr";
	LispType[LispType["BitNegate"] = 79] = "BitNegate";
	LispType[LispType["BitShiftLeft"] = 80] = "BitShiftLeft";
	LispType[LispType["BitShiftRight"] = 81] = "BitShiftRight";
	LispType[LispType["BitUnsignedShiftRight"] = 82] = "BitUnsignedShiftRight";
	LispType[LispType["BigInt"] = 83] = "BigInt";
	LispType[LispType["LiteralIndex"] = 84] = "LiteralIndex";
	LispType[LispType["RegexIndex"] = 85] = "RegexIndex";
	LispType[LispType["LoopAction"] = 86] = "LoopAction";
	LispType[LispType["Void"] = 87] = "Void";
	LispType[LispType["True"] = 88] = "True";
	LispType[LispType["NullishCoalescing"] = 89] = "NullishCoalescing";
	LispType[LispType["AndEquals"] = 90] = "AndEquals";
	LispType[LispType["OrEquals"] = 91] = "OrEquals";
	LispType[LispType["NullishCoalescingEquals"] = 92] = "NullishCoalescingEquals";
	LispType[LispType["Block"] = 93] = "Block";
	LispType[LispType["Labeled"] = 94] = "Labeled";
	LispType[LispType["Internal"] = 95] = "Internal";
	LispType[LispType["Yield"] = 96] = "Yield";
	LispType[LispType["YieldDelegate"] = 97] = "YieldDelegate";
	LispType[LispType["LispEnumSize"] = 98] = "LispEnumSize";
	return LispType;
}({});
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
export { AsyncFunction, AsyncGeneratorFunction, CodeString, DelayedSynchronousResult, ExecContext, FunctionScope, GeneratorFunction, LispType, LocalScope, NON_BLOCKING_THRESHOLD, Prop, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError, Scope, VarType, createContext, createExecContext, delaySynchronousResult, getSandboxSymbolCtor, hasOwnProperty, isLisp, reservedWords, sandboxedGlobal };

//# sourceMappingURL=utils.js.map