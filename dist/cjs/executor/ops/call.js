const require_errors = require("../../utils/errors.js");
const require_types = require("../../utils/types.js");
const require_Scope = require("../../utils/Scope.js");
const require_functionReplacements = require("../../utils/functionReplacements.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/call.ts
require_opsRegistry.addOps(require_types.LispType.Call, (params) => {
	const { done, a, b, obj, context } = params;
	if (context.ctx.options.forbidFunctionCalls) throw new require_errors.SandboxCapabilityError("Function invocations are not allowed");
	if (typeof a !== "function") throw new TypeError(`${typeof obj?.prop === "symbol" ? "Symbol" : obj?.prop} is not a function`);
	const vals = new Array(b.length);
	let valsLen = 0;
	for (let i = 0; i < b.length; i++) {
		const item = b[i];
		if (item instanceof require_executorUtils.SpreadArray) {
			const expanded = Array.isArray(item.item) ? item.item : [...item.item];
			if (require_executorUtils.checkHaltExpectedTicks(params, BigInt(expanded.length))) return;
			for (let j = 0; j < expanded.length; j++) vals[valsLen++] = require_Scope.sanitizeProp(expanded[j], context);
		} else vals[valsLen++] = require_Scope.sanitizeProp(item, context);
	}
	vals.length = valsLen;
	if (a === String) {
		const result = String(vals[0]);
		require_functionReplacements.checkTicksAndThrow(context.ctx, BigInt(result.length));
		done(void 0, result);
		return;
	}
	if (typeof obj === "function") {
		const evl = context.evals.get(obj);
		let ret = evl ? evl(obj, ...vals) : obj(...vals);
		ret = require_Scope.sanitizeProp(ret, context);
		if (ret !== null && typeof ret === "object" && ret instanceof require_Scope.DelayedSynchronousResult) Promise.resolve(ret.result).then((res) => done(void 0, res), (err) => done(err));
		else done(void 0, ret);
		return;
	}
	const originalFn = obj.context[obj.prop];
	if (originalFn === JSON.stringify && context.getSubscriptions.size) {
		const cache = /* @__PURE__ */ new WeakSet();
		let ticks = 0n;
		const recurse = (x) => {
			if (!x || !(typeof x === "object") || cache.has(x)) return;
			cache.add(x);
			const keys = Object.keys(x);
			ticks += BigInt(keys.length);
			for (const y of keys) {
				context.getSubscriptions.forEach((cb) => cb(x, y));
				recurse(x[y]);
			}
		};
		recurse(vals[0]);
		require_functionReplacements.checkTicksAndThrow(context.ctx, ticks);
	}
	if (obj.context instanceof Array && require_executorUtils.arrayChange.has(originalFn) && (context.changeSubscriptions.get(obj.context) || context.changeSubscriptionsGlobal.get(obj.context))) {
		let change = void 0;
		let changed = false;
		if (obj.prop === "push") {
			change = {
				type: "push",
				added: vals
			};
			changed = !!vals.length;
		} else if (obj.prop === "pop") {
			change = {
				type: "pop",
				removed: obj.context.slice(-1)
			};
			changed = !!change.removed.length;
		} else if (obj.prop === "shift") {
			change = {
				type: "shift",
				removed: obj.context.slice(0, 1)
			};
			changed = !!change.removed.length;
		} else if (obj.prop === "unshift") {
			change = {
				type: "unshift",
				added: vals
			};
			changed = !!vals.length;
		} else if (obj.prop === "splice") {
			change = {
				type: "splice",
				startIndex: vals[0],
				deleteCount: vals[1] === void 0 ? obj.context.length : vals[1],
				added: vals.slice(2),
				removed: obj.context.slice(vals[0], vals[1] === void 0 ? void 0 : vals[0] + vals[1])
			};
			changed = !!change.added.length || !!change.removed.length;
		} else if (obj.prop === "reverse" || obj.prop === "sort") {
			change = { type: obj.prop };
			changed = !!obj.context.length;
		} else if (obj.prop === "copyWithin") {
			const len = vals[2] === void 0 ? obj.context.length - vals[1] : Math.min(obj.context.length, vals[2] - vals[1]);
			change = {
				type: "copyWithin",
				startIndex: vals[0],
				endIndex: vals[0] + len,
				added: obj.context.slice(vals[1], vals[1] + len),
				removed: obj.context.slice(vals[0], vals[0] + len)
			};
			changed = !!change.added.length || !!change.removed.length;
		}
		if (changed) {
			const subs = context.changeSubscriptions.get(obj.context);
			if (subs !== void 0) for (const cb of subs) cb(change);
			const subsG = context.changeSubscriptionsGlobal.get(obj.context);
			if (subsG !== void 0) for (const cb of subsG) cb(change);
		}
	}
	obj.get(context);
	const evl = context.evals.get(originalFn);
	let ret = evl ? evl(...vals) : a.call(obj.context, ...vals);
	ret = require_Scope.sanitizeProp(ret, context);
	if (ret !== null && typeof ret === "object" && ret instanceof require_Scope.DelayedSynchronousResult) Promise.resolve(ret.result).then((res) => done(void 0, res), (err) => done(err));
	else done(void 0, ret);
});
require_opsRegistry.addOps(require_types.LispType.New, (params) => {
	const { done, a, b, context } = params;
	if (!context.ctx.globalsWhitelist.has(a) && !context.ctx.sandboxedFunctions.has(a)) throw new require_errors.SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
	const vals = b.map((item) => require_Scope.sanitizeProp(item, context));
	const replacement = context.ctx.functionReplacements.get(a);
	if (replacement) {
		done(void 0, new replacement(...vals));
		return;
	}
	const expectedTicks = getNewTicks(a, vals);
	if (expectedTicks > 0n && require_executorUtils.checkHaltExpectedTicks(params, expectedTicks)) return;
	done(void 0, new a(...vals));
});
function getNewTicks(ctor, args) {
	if (ctor === Array) {
		const n = args[0];
		if (typeof n === "number" && args.length === 1) return BigInt(n);
		return BigInt(args.length);
	}
	if (require_functionReplacements.typedArrayProtos.has(Object.getPrototypeOf(ctor.prototype))) {
		const n = args[0];
		if (typeof n === "number") return BigInt(n);
		if (Array.isArray(n) || ArrayBuffer.isView(n)) return BigInt(n.length);
		return 0n;
	}
	if (ctor === Map || ctor === Set) {
		const iterable = args[0];
		if (Array.isArray(iterable)) return BigInt(iterable.length);
		return 0n;
	}
	if (ctor === String || ctor === RegExp) {
		const s = args[0];
		if (typeof s === "string") return BigInt(s.length);
		return 0n;
	}
	return 0n;
}
//#endregion
