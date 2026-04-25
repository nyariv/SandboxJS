const require_types = require("./types.js");
const require_functionReplacements = require("./functionReplacements.js");
const require_Prop = require("./Prop.js");
const require_Scope = require("./Scope.js");
//#region src/utils/ExecContext.ts
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
function createContext(sandbox, options) {
	const sandboxSymbols = createSandboxSymbolContext(options.symbolWhitelist);
	const sandboxGlobal = new (sandboxedGlobal(options.globals))();
	const context = {
		sandbox,
		globalsWhitelist: new Set(Object.values(options.globals)),
		prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
		sandboxSymbols,
		options,
		globalScope: new require_Scope.Scope(null, sandboxGlobal, sandboxGlobal),
		sandboxGlobal,
		ticks: {
			ticks: 0n,
			tickLimit: options.executionQuota,
			nextYield: options.nonBlocking ? require_types.NON_BLOCKING_THRESHOLD : void 0
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
		evals.set(require_types.AsyncFunction, asyncFunc);
		evals.set(require_types.GeneratorFunction, genFunc);
		evals.set(require_types.AsyncGeneratorFunction, asyncGenFunc);
		evals.set(Symbol, sandboxSymbol);
		evals.set(eval, evalContext.sandboxedEval(func, execContext));
		evals.set(setTimeout, evalContext.sandboxedSetTimeout(func, execContext));
		evals.set(setInterval, evalContext.sandboxedSetInterval(func, execContext));
		evals.set(clearTimeout, evalContext.sandboxedClearTimeout(execContext));
		evals.set(clearInterval, evalContext.sandboxedClearInterval(execContext));
		for (const [original, factory] of require_functionReplacements.DEFAULT_FUNCTION_REPLACEMENTS) evals.set(original, factory(execContext));
		for (const [original, factory] of sandbox.context.options.functionReplacements) evals.set(original, factory(execContext, evals.get(original)));
		const ptwl = sandbox.context.prototypeWhitelist;
		for (const [key, value] of evals) {
			if (!ptwl.has(key.prototype)) ptwl.set(key.prototype, /* @__PURE__ */ new Set());
			if (!ptwl.has(value.prototype)) ptwl.set(value.prototype, ptwl.get(key.prototype) || /* @__PURE__ */ new Set());
			if (sandbox.context.globalsWhitelist.has(key)) sandbox.context.globalsWhitelist.add(value);
			if (require_Prop.hasOwnProperty(sandbox.context.sandboxGlobal, key.name)) sandbox.context.sandboxGlobal[key.name] = value;
		}
		if (sandbox.context.sandboxGlobal.globalThis) sandbox.context.sandboxGlobal.globalThis = sandbox.context.sandboxGlobal;
	}
	return execContext;
}
function isLisp(item) {
	return Array.isArray(item) && typeof item[0] === "number" && item[0] !== require_types.LispType.None && item[0] !== require_types.LispType.True;
}
//#endregion
exports.ExecContext = ExecContext;
exports.createContext = createContext;
exports.createExecContext = createExecContext;
exports.getSandboxSymbolCtor = getSandboxSymbolCtor;
exports.isLisp = isLisp;
exports.sandboxedGlobal = sandboxedGlobal;
