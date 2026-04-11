import { DelayedSynchronousResult, SandboxAccessError, SandboxCapabilityError } from "../../utils/errors.js";
import { LispType } from "../../utils/types.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { SpreadArray, arrayChange, sanitizeProp } from "../executorUtils.js";
//#region src/executor/ops/call.ts
addOps(LispType.Call, ({ done, a, b, obj, context }) => {
	if (context.ctx.options.forbidFunctionCalls) throw new SandboxCapabilityError("Function invocations are not allowed");
	if (typeof a !== "function") throw new TypeError(`${typeof obj?.prop === "symbol" ? "Symbol" : obj?.prop} is not a function`);
	const vals = b.map((item) => {
		if (item instanceof SpreadArray) return [...item.item];
		else return [item];
	}).flat().map((item) => sanitizeProp(item, context));
	if (typeof obj === "function") {
		const evl = context.evals.get(obj);
		let ret = evl ? evl(obj, ...vals) : obj(...vals);
		ret = sanitizeProp(ret, context);
		if (ret instanceof DelayedSynchronousResult) Promise.resolve(ret.result).then((res) => done(void 0, res), (err) => done(err));
		else done(void 0, ret);
		return;
	}
	if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
		const cache = /* @__PURE__ */ new Set();
		const recurse = (x) => {
			if (!x || !(typeof x === "object") || cache.has(x)) return;
			cache.add(x);
			for (const y of Object.keys(x)) {
				context.getSubscriptions.forEach((cb) => cb(x, y));
				recurse(x[y]);
			}
		};
		recurse(vals[0]);
	}
	if (obj.context instanceof Array && arrayChange.has(obj.context[obj.prop]) && (context.changeSubscriptions.get(obj.context) || context.changeSubscriptionsGlobal.get(obj.context))) {
		let change;
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
			context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb(change));
			context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb(change));
		}
	}
	obj.get(context);
	const evl = context.evals.get(obj.context[obj.prop]);
	let ret = evl ? evl(...vals) : obj.context[obj.prop](...vals);
	ret = sanitizeProp(ret, context);
	if (ret instanceof DelayedSynchronousResult) Promise.resolve(ret.result).then((res) => done(void 0, res), (err) => done(err));
	else done(void 0, ret);
});
addOps(LispType.New, ({ done, a, b, context }) => {
	if (!context.ctx.globalsWhitelist.has(a) && !context.ctx.sandboxedFunctions.has(a)) throw new SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
	b = b.map((item) => sanitizeProp(item, context));
	done(void 0, sanitizeProp(new a(...b), context));
});
//#endregion

//# sourceMappingURL=call.js.map