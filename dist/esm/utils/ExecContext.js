import { AsyncFunction, AsyncGeneratorFunction, GeneratorFunction, LispType, NON_BLOCKING_THRESHOLD } from "./types.js";
import { Scope } from "./Scope.js";
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
function isLisp(item) {
	return Array.isArray(item) && typeof item[0] === "number" && item[0] !== LispType.None && item[0] !== LispType.True;
}
//#endregion
export { ExecContext, createContext, createExecContext, getSandboxSymbolCtor, isLisp, sandboxedGlobal };

//# sourceMappingURL=ExecContext.js.map