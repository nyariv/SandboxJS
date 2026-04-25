import { SandboxExecutionQuotaExceededError } from "./utils/errors.js";
import { createContext } from "./utils/ExecContext.js";
import "./utils/index.js";
import { executeTree, executeTreeAsync } from "./executor/executorUtils.js";
import "./executor/index.js";
//#region src/SandboxExec.ts
function subscribeSet(obj, name, callback, context) {
	const names = context.setSubscriptions.get(obj) || /* @__PURE__ */ new Map();
	context.setSubscriptions.set(obj, names);
	const callbacks = names.get(name) || /* @__PURE__ */ new Set();
	names.set(name, callbacks);
	callbacks.add(callback);
	let changeCbs;
	const val = obj[name];
	if (val instanceof Object) {
		changeCbs = context.changeSubscriptions.get(val) || /* @__PURE__ */ new Set();
		changeCbs.add(callback);
		context.changeSubscriptions.set(val, changeCbs);
	}
	return { unsubscribe: () => {
		callbacks.delete(callback);
		changeCbs?.delete(callback);
	} };
}
var SandboxExec = class SandboxExec {
	constructor(options, evalContext) {
		this.evalContext = evalContext;
		this.setSubscriptions = /* @__PURE__ */ new WeakMap();
		this.changeSubscriptions = /* @__PURE__ */ new WeakMap();
		this.sandboxFunctions = /* @__PURE__ */ new WeakMap();
		this.haltSubscriptions = /* @__PURE__ */ new Set();
		this.resumeSubscriptions = /* @__PURE__ */ new Set();
		this.halted = false;
		this.timeoutHandleCounter = 0;
		this.setTimeoutHandles = /* @__PURE__ */ new Map();
		this.setIntervalHandles = /* @__PURE__ */ new Map();
		const opt = Object.assign({
			audit: false,
			forbidFunctionCalls: false,
			forbidFunctionCreation: false,
			globals: SandboxExec.SAFE_GLOBALS,
			symbolWhitelist: SandboxExec.SAFE_SYMBOLS,
			prototypeWhitelist: SandboxExec.SAFE_PROTOTYPES,
			maxParserRecursionDepth: 256,
			nonBlocking: false,
			functionReplacements: /* @__PURE__ */ new Map()
		}, options || {});
		this.context = createContext(this, opt);
	}
	static get SAFE_GLOBALS() {
		return {
			globalThis,
			Function,
			eval,
			console: {
				debug: console.debug,
				error: console.error,
				info: console.info,
				log: console.log,
				table: console.table,
				warn: console.warn
			},
			isFinite,
			isNaN,
			parseFloat,
			parseInt,
			decodeURI,
			decodeURIComponent,
			encodeURI,
			encodeURIComponent,
			escape,
			unescape,
			Boolean,
			Number,
			BigInt,
			String,
			Object,
			Array,
			Symbol,
			Error,
			EvalError,
			RangeError,
			ReferenceError,
			SyntaxError,
			TypeError,
			URIError,
			Int8Array,
			Uint8Array,
			Uint8ClampedArray,
			Int16Array,
			Uint16Array,
			Int32Array,
			Uint32Array,
			Float32Array,
			Float64Array,
			Map,
			Set,
			WeakMap,
			WeakSet,
			Promise,
			Intl,
			JSON,
			Math,
			Date,
			RegExp
		};
	}
	static get SAFE_SYMBOLS() {
		const safeSymbols = {};
		for (const key of [
			"asyncIterator",
			"iterator",
			"match",
			"matchAll",
			"replace",
			"search",
			"split"
		]) {
			const value = Symbol[key];
			if (typeof value === "symbol") safeSymbols[key] = value;
		}
		return safeSymbols;
	}
	static get SAFE_PROTOTYPES() {
		const protos = [
			Function,
			Boolean,
			Number,
			BigInt,
			String,
			Date,
			Error,
			Array,
			Int8Array,
			Uint8Array,
			Uint8ClampedArray,
			Int16Array,
			Uint16Array,
			Int32Array,
			Uint32Array,
			Float32Array,
			Float64Array,
			Map,
			Set,
			WeakMap,
			WeakSet,
			Promise,
			Symbol,
			Date,
			RegExp
		];
		const map = /* @__PURE__ */ new Map();
		protos.forEach((proto) => {
			map.set(proto, /* @__PURE__ */ new Set());
		});
		map.set(Object, new Set([
			"constructor",
			"name",
			"entries",
			"fromEntries",
			"getOwnPropertyNames",
			"is",
			"keys",
			"hasOwnProperty",
			"isPrototypeOf",
			"propertyIsEnumerable",
			"toLocaleString",
			"toString",
			"valueOf",
			"values"
		]));
		return map;
	}
	subscribeGet(callback, context) {
		context.getSubscriptions.add(callback);
		return { unsubscribe: () => context.getSubscriptions.delete(callback) };
	}
	subscribeSet(obj, name, callback, context) {
		return subscribeSet(obj, name, callback, context);
	}
	subscribeSetGlobal(obj, name, callback) {
		return subscribeSet(obj, name, callback, this);
	}
	subscribeHalt(cb) {
		this.haltSubscriptions.add(cb);
		return { unsubscribe: () => {
			this.haltSubscriptions.delete(cb);
		} };
	}
	subscribeResume(cb) {
		this.resumeSubscriptions.add(cb);
		return { unsubscribe: () => {
			this.resumeSubscriptions.delete(cb);
		} };
	}
	haltExecution(haltContext = { type: "manual" }) {
		if (this.halted) return;
		this.halted = true;
		for (const cb of this.haltSubscriptions) cb(haltContext);
	}
	resumeExecution() {
		if (!this.halted) return;
		if (this.context.ticks.tickLimit !== void 0 && this.context.ticks.ticks >= this.context.ticks.tickLimit) throw new SandboxExecutionQuotaExceededError("Cannot resume execution: tick limit exceeded");
		this.halted = false;
		for (const cb of this.resumeSubscriptions) cb();
	}
	getContext(fn) {
		return this.sandboxFunctions.get(fn);
	}
	executeTree(context, scopes = []) {
		return executeTree(context.ctx.ticks, context, context.tree, scopes, void 0, false);
	}
	executeTreeAsync(context, scopes = []) {
		return executeTreeAsync(context.ctx.ticks, context, context.tree, scopes, void 0, false);
	}
};
//#endregion
export { SandboxExec, SandboxExec as default };

//# sourceMappingURL=SandboxExec.js.map