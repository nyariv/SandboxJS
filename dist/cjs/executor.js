Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_utils = require("./utils.js");
//#region src/executor.ts
var ExecReturn = class {
	constructor(auditReport, result, returned, controlFlow) {
		this.auditReport = auditReport;
		this.result = result;
		this.returned = returned;
		this.controlFlow = controlFlow;
	}
	get breakLoop() {
		return this.controlFlow?.type === "break";
	}
	get continueLoop() {
		return this.controlFlow?.type === "continue";
	}
};
var optional = {};
var emptyControlFlowTargets = [];
function normalizeStatementLabel(label) {
	return label === void 0 || label === require_utils.LispType.None ? void 0 : label;
}
function normalizeStatementLabels(label) {
	if (label === void 0 || label === require_utils.LispType.None) return [];
	if (Array.isArray(label) && !require_utils.isLisp(label)) return label.filter((item) => typeof item === "string");
	return [label];
}
function createLoopTarget(label, acceptsUnlabeled = true) {
	return {
		label,
		acceptsBreak: true,
		acceptsContinue: true,
		acceptsUnlabeledBreak: acceptsUnlabeled,
		acceptsUnlabeledContinue: acceptsUnlabeled
	};
}
function createSwitchTarget(label) {
	return {
		label,
		acceptsBreak: true,
		acceptsContinue: false,
		acceptsUnlabeledBreak: true,
		acceptsUnlabeledContinue: false
	};
}
function createLabeledStatementTarget(label) {
	if (!label) return void 0;
	return {
		label,
		acceptsBreak: true,
		acceptsContinue: false,
		acceptsUnlabeledBreak: false,
		acceptsUnlabeledContinue: false
	};
}
function addControlFlowTarget(controlFlowTargets, target) {
	if (!target) return controlFlowTargets;
	return [...controlFlowTargets || emptyControlFlowTargets, target];
}
function addControlFlowTargets(controlFlowTargets, targets) {
	return targets.reduce((currentTargets, target) => addControlFlowTarget(currentTargets, target), controlFlowTargets);
}
function matchesControlFlowTarget(signal, target) {
	if (signal.type === "continue") {
		if (!target.acceptsContinue) return false;
		return signal.label ? target.label === signal.label : target.acceptsUnlabeledContinue;
	}
	if (!target.acceptsBreak) return false;
	return signal.label ? target.label === signal.label : target.acceptsUnlabeledBreak;
}
function findControlFlowTarget(controlFlowTargets, type, label) {
	if (!controlFlowTargets) return void 0;
	for (let i = controlFlowTargets.length - 1; i >= 0; i--) {
		const target = controlFlowTargets[i];
		if (label) {
			if (target.label !== label) continue;
			if (type === "continue" ? target.acceptsContinue : target.acceptsBreak) return target;
			return null;
		}
		if (type === "continue" ? target.acceptsUnlabeledContinue : target.acceptsUnlabeledBreak) return target;
	}
}
function generateArgs(argNames, args) {
	const vars = {};
	argNames.forEach((arg, i) => {
		if (arg.startsWith("...")) vars[arg.substring(3)] = args.slice(i);
		else vars[arg] = args[i];
	});
	return vars;
}
function createFunction(argNames, parsed, ticks, context, scope, name, internal = false) {
	if (context.ctx.options.forbidFunctionCreation) throw new require_utils.SandboxCapabilityError("Function creation is forbidden");
	let func;
	if (name === void 0) func = (...args) => {
		const vars = generateArgs(argNames, args);
		return executeTree(ticks, context, parsed, scope === void 0 ? [] : [new require_utils.Scope(scope, vars)], void 0, internal).result;
	};
	else func = function sandboxedObject(...args) {
		const vars = generateArgs(argNames, args);
		return executeTree(ticks, context, parsed, scope === void 0 ? [] : [new require_utils.Scope(scope, vars, this)], void 0, internal).result;
	};
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
function createFunctionAsync(argNames, parsed, ticks, context, scope, name, internal = false) {
	if (context.ctx.options.forbidFunctionCreation) throw new require_utils.SandboxCapabilityError("Function creation is forbidden");
	if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) throw new require_utils.SandboxCapabilityError("Async/await not permitted");
	let func;
	if (name === void 0) func = async (...args) => {
		const vars = generateArgs(argNames, args);
		return (await executeTreeAsync(ticks, context, parsed, scope === void 0 ? [] : [new require_utils.Scope(scope, vars)], void 0, internal)).result;
	};
	else func = async function sandboxedObject(...args) {
		const vars = generateArgs(argNames, args);
		return (await executeTreeAsync(ticks, context, parsed, scope === void 0 ? [] : [new require_utils.Scope(scope, vars, this)], void 0, internal)).result;
	};
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
var YieldValue = class {
	constructor(value, delegate) {
		this.value = value;
		this.delegate = delegate;
	}
};
var syncYieldPauseSentinel = Symbol("syncYieldPause");
function asIterableIterator(value) {
	const iterator = value?.[Symbol.iterator]?.() ?? value;
	if (!iterator || typeof iterator.next !== "function") throw new TypeError("yield* target is not iterable");
	if (typeof iterator[Symbol.iterator] === "function") return iterator;
	return {
		next: iterator.next.bind(iterator),
		throw: iterator.throw?.bind(iterator),
		return: iterator.return?.bind(iterator),
		[Symbol.iterator]() {
			return this;
		}
	};
}
function asAsyncIterableIterator(value) {
	const asyncIterator = value?.[Symbol.asyncIterator]?.();
	if (asyncIterator) return {
		next: asyncIterator.next.bind(asyncIterator),
		throw: asyncIterator.throw?.bind(asyncIterator),
		return: asyncIterator.return?.bind(asyncIterator),
		[Symbol.asyncIterator]() {
			return this;
		}
	};
	const iterator = asIterableIterator(value);
	return {
		async next(nextValue) {
			return iterator.next(nextValue);
		},
		async throw(err) {
			if (typeof iterator.throw === "function") return iterator.throw(err);
			throw err;
		},
		async return(valueToReturn) {
			if (typeof iterator.return === "function") return iterator.return(valueToReturn);
			return {
				value: valueToReturn,
				done: true
			};
		},
		[Symbol.asyncIterator]() {
			return this;
		}
	};
}
function* executeGenBody(ticks, tree, scope, context, statementLabels, internal) {
	if (!require_utils.isLisp(tree) && Array.isArray(tree)) {
		const stmts = tree;
		if (stmts.length === 0 || stmts[0] === require_utils.LispType.None) return new ExecReturn(context.ctx.auditReport, void 0, false);
		for (const stmt of stmts) {
			const res = yield* executeGenBody(ticks, stmt, scope, context, statementLabels, internal);
			if (res instanceof ExecReturn && (res.returned || res.controlFlow)) return res;
			if (require_utils.isLisp(stmt) && stmt[0] === require_utils.LispType.Return) return new ExecReturn(context.ctx.auditReport, res.result, true);
		}
		return new ExecReturn(context.ctx.auditReport, void 0, false);
	}
	const [op, a, b] = tree;
	switch (op) {
		case require_utils.LispType.Yield: {
			const injected = yield sanitizeProp((yield* executeGenBody(ticks, a, scope, context, statementLabels, internal)).result, context);
			return new ExecReturn(context.ctx.auditReport, injected, false);
		}
		case require_utils.LispType.YieldDelegate: {
			const result = yield* asIterableIterator(sanitizeProp((yield* executeGenBody(ticks, a, scope, context, statementLabels, internal)).result, context));
			return new ExecReturn(context.ctx.auditReport, result, false);
		}
		case require_utils.LispType.If: {
			const condResult = yield* executeGenBody(ticks, a, scope, context, statementLabels, internal);
			const ifCase = syncDone((d) => execSync(ticks, b, scope, context, d, statementLabels, internal, void 0)).result;
			const branch = sanitizeProp(condResult.result, context) ? ifCase.t : ifCase.f;
			if (branch) return yield* executeGenBody(ticks, branch, scope, context, statementLabels, internal);
			return new ExecReturn(context.ctx.auditReport, void 0, false);
		}
		case require_utils.LispType.Loop: {
			const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep, isForAwait, label] = a;
			if (isForAwait === require_utils.LispType.True) throw new SyntaxError("for-await-of loops are only allowed inside async functions");
			const loopStatementTargets = [...normalizeStatementLabels(label).map((loopLabel) => createLoopTarget(loopLabel, false)), createLoopTarget()];
			const loopTargets = addControlFlowTargets(statementLabels, loopStatementTargets);
			const loopScope = new require_utils.Scope(scope, {});
			const internalVars = { $$obj: void 0 };
			const interalScope = new require_utils.Scope(loopScope, internalVars);
			syncDone((d) => execSync(ticks, startStep, loopScope, context, d, void 0, internal, void 0));
			internalVars["$$obj"] = syncDone((d) => execSync(ticks, getIterator, loopScope, context, d, void 0, internal, void 0)).result;
			syncDone((d) => execSync(ticks, startInternal, interalScope, context, d, void 0, internal, void 0));
			let loop = true;
			if (checkFirst) loop = syncDone((d) => execSync(ticks, condition, interalScope, context, d, void 0, internal, void 0)).result;
			while (loop) {
				const iterScope = new require_utils.Scope(interalScope, {});
				syncDone((d) => execSync(ticks, beforeStep, iterScope, context, d, void 0, internal, void 0));
				const res = yield* executeGenBody(ticks, b, iterScope, context, loopTargets, internal);
				if (res.returned) return res;
				if (res.controlFlow) {
					if (!loopStatementTargets.some((t) => matchesControlFlowTarget(res.controlFlow, t))) return res;
					if (res.breakLoop) break;
				}
				syncDone((d) => execSync(ticks, step, interalScope, context, d, void 0, internal, void 0));
				loop = syncDone((d) => execSync(ticks, condition, interalScope, context, d, void 0, internal, void 0)).result;
			}
			return new ExecReturn(context.ctx.auditReport, void 0, false);
		}
		case require_utils.LispType.Try: {
			const [exception, catchBody, finallyBody] = b;
			let result;
			let finalOverride;
			try {
				result = yield* executeGenBody(ticks, a, scope, context, statementLabels, internal);
			} catch (e) {
				if (exception && catchBody?.length > 0) result = yield* executeGenBody(ticks, catchBody, new require_utils.Scope(scope, { [exception]: e }), context, statementLabels, internal);
				else throw e;
			} finally {
				if (finallyBody?.length > 0) {
					const fr = yield* executeGenBody(ticks, finallyBody, scope, context, statementLabels, internal);
					if (fr.returned || fr.controlFlow) finalOverride = fr;
				}
			}
			if (finalOverride) return finalOverride;
			return result;
		}
		case require_utils.LispType.Labeled: {
			const target = createLabeledStatementTarget(normalizeStatementLabel(a));
			const res = yield* executeGenBody(ticks, b, scope, context, addControlFlowTargets(statementLabels, target ? [target] : []), internal);
			if (res.controlFlow && target && matchesControlFlowTarget(res.controlFlow, target)) return new ExecReturn(context.ctx.auditReport, res.result, false);
			return res;
		}
		default: {
			let completedYields = 0;
			const yieldResults = [];
			while (true) {
				let currentYieldIdx = 0;
				let capturedValue = void 0;
				let capturedDelegate = false;
				let yielded = false;
				const captureYieldFn = (yv, continueDone) => {
					if (currentYieldIdx < completedYields) {
						continueDone(void 0, yieldResults[currentYieldIdx]);
						currentYieldIdx++;
						return;
					}
					capturedValue = yv.value;
					capturedDelegate = yv.delegate;
					yielded = true;
					currentYieldIdx++;
					throw syncYieldPauseSentinel;
				};
				try {
					const result = syncDone((d) => execSync(ticks, tree, scope, context, d, statementLabels, internal, captureYieldFn)).result;
					if (result instanceof ExecReturn) return result;
					return new ExecReturn(context.ctx.auditReport, result, false);
				} catch (e) {
					if (!yielded || e !== syncYieldPauseSentinel) throw e;
					const resumedValue = capturedDelegate ? yield* asIterableIterator(capturedValue) : yield capturedValue;
					yieldResults.push(resumedValue);
					completedYields++;
				}
			}
		}
	}
}
function createGeneratorFunction(argNames, parsed, ticks, context, scope, name, internal = false) {
	if (context.ctx.options.forbidFunctionCreation) throw new require_utils.SandboxCapabilityError("Function creation is forbidden");
	const makeGen = (thisArg, args) => {
		const vars = generateArgs(argNames, args);
		const executionGen = executeGenBody(ticks, parsed, scope === void 0 ? new require_utils.Scope(null, vars, thisArg) : new require_utils.Scope(scope, vars, thisArg), context, void 0, internal);
		let isDone = false;
		function drive(action) {
			if (isDone) return {
				value: void 0,
				done: true
			};
			try {
				const r = action();
				if (r.done) {
					isDone = true;
					return {
						value: r.value instanceof ExecReturn ? r.value.result : r.value,
						done: true
					};
				}
				return {
					value: r.value,
					done: false
				};
			} catch (e) {
				isDone = true;
				throw e;
			}
		}
		return {
			next(value) {
				return drive(() => executionGen.next(value));
			},
			return(value) {
				return drive(() => executionGen.return(value));
			},
			throw(err) {
				return drive(() => executionGen.throw(err));
			},
			[Symbol.iterator]() {
				return this;
			}
		};
	};
	const func = function sandboxedObject(...args) {
		return makeGen(this, args);
	};
	Object.setPrototypeOf(func, require_utils.GeneratorFunction.prototype);
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
function createAsyncGeneratorFunction(argNames, parsed, ticks, context, scope, name, internal = false) {
	if (context.ctx.options.forbidFunctionCreation) throw new require_utils.SandboxCapabilityError("Function creation is forbidden");
	if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) throw new require_utils.SandboxCapabilityError("Async/await not permitted");
	const makeGen = (thisArg, args) => {
		const vars = generateArgs(argNames, args);
		const genScope = scope === void 0 ? [new require_utils.Scope(null, vars, thisArg)] : [new require_utils.Scope(scope, vars, thisArg)];
		return (async function* sandboxedAsyncGenerator() {
			const yieldQueue = [];
			let resolveYield = null;
			const yieldFn = (yv, continueDone) => {
				yieldQueue.push({
					yieldValue: yv,
					continueDone
				});
				if (resolveYield) {
					resolveYield();
					resolveYield = null;
				}
			};
			const bodyPromise = executeTreeAsync(ticks, context, parsed, genScope, void 0, internal, yieldFn);
			let bodyDone = false;
			let bodyResult;
			let bodyError;
			bodyPromise.then((r) => {
				bodyDone = true;
				bodyResult = r;
				resolveYield?.();
			}, (e) => {
				bodyDone = true;
				bodyError = e;
				resolveYield?.();
			});
			while (true) {
				if (yieldQueue.length === 0 && !bodyDone) await new Promise((res) => {
					resolveYield = res;
				});
				while (yieldQueue.length > 0) {
					const { yieldValue, continueDone } = yieldQueue.shift();
					try {
						const resumedValue = yieldValue.delegate ? yield* asAsyncIterableIterator(yieldValue.value) : yield yieldValue.value;
						continueDone?.(void 0, resumedValue);
					} catch (err) {
						continueDone?.(err);
					}
				}
				if (bodyDone) break;
			}
			if (bodyError !== void 0) throw bodyError;
			return bodyResult?.result;
		})();
	};
	const func = function sandboxedObject(...args) {
		return makeGen(this, args);
	};
	Object.setPrototypeOf(func, require_utils.AsyncGeneratorFunction.prototype);
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
function assignCheck(obj, context, op = "assign") {
	if (obj.context === void 0) throw new ReferenceError(`Cannot ${op} value to undefined.`);
	if (obj.isConst) throw new TypeError(`Assignment to constant variable.`);
	if (obj.isGlobal) throw new require_utils.SandboxAccessError(`Cannot ${op} property '${obj.prop.toString()}' of a global object`);
	if (obj.context === null) throw new TypeError("Cannot set properties of null");
	if (typeof obj.context[obj.prop] === "function" && !require_utils.hasOwnProperty(obj.context, obj.prop)) throw new require_utils.SandboxAccessError(`Override prototype property '${obj.prop.toString()}' not allowed`);
	if (op === "delete") {
		if (require_utils.hasOwnProperty(obj.context, obj.prop)) {
			context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({
				type: "delete",
				prop: obj.prop.toString()
			}));
			context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({
				type: "delete",
				prop: obj.prop.toString()
			}));
		}
	} else if (require_utils.hasOwnProperty(obj.context, obj.prop)) {
		context.setSubscriptions.get(obj.context)?.get(obj.prop.toString())?.forEach((cb) => cb({ type: "replace" }));
		context.setSubscriptionsGlobal.get(obj.context)?.get(obj.prop.toString())?.forEach((cb) => cb({ type: "replace" }));
	} else {
		context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({
			type: "create",
			prop: obj.prop.toString()
		}));
		context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({
			type: "create",
			prop: obj.prop.toString()
		}));
	}
}
var arrayChange = new Set([
	[].push,
	[].pop,
	[].shift,
	[].unshift,
	[].splice,
	[].reverse,
	[].sort,
	[].copyWithin
]);
var KeyVal = class {
	constructor(key, val) {
		this.key = key;
		this.val = val;
	}
};
var SpreadObject = class {
	constructor(item) {
		this.item = item;
	}
};
var SpreadArray = class {
	constructor(item) {
		this.item = item;
	}
};
var If = class {
	constructor(t, f, label) {
		this.t = t;
		this.f = f;
		this.label = label;
	}
};
var literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
var ops = /* @__PURE__ */ new Map();
function addOps(type, cb) {
	ops.set(type, cb);
}
var prorptyKeyTypes = [
	"string",
	"number",
	"symbol"
];
function isPropertyKey(val) {
	return prorptyKeyTypes.includes(typeof val);
}
function hasPossibleProperties(val) {
	return val !== null && val !== void 0;
}
addOps(require_utils.LispType.Prop, ({ done, a, b, obj, context, scope, internal }) => {
	if (a === null) throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
	if (!isPropertyKey(b)) b = `${b}`;
	if (a === void 0 && obj === void 0 && typeof b === "string") {
		const prop = scope.get(b, internal);
		if (prop.context === context.ctx.sandboxGlobal) {
			if (context.ctx.options.audit) context.ctx.auditReport?.globalsAccess.add(b);
		}
		done(void 0, getGlobalProp(prop.context ? prop.context[prop.prop] : void 0, context, prop) || prop);
		return;
	} else if (a === void 0) throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
	if (!hasPossibleProperties(a)) {
		done(void 0, new require_utils.Prop(void 0, b));
		return;
	}
	const prototypeAccess = typeof a === "function" || !require_utils.hasOwnProperty(a, b);
	if (context.ctx.options.audit && prototypeAccess) {
		let prot = Object.getPrototypeOf(a);
		do
			if (require_utils.hasOwnProperty(prot, b)) {
				if (context.ctx.auditReport && !context.ctx.auditReport.prototypeAccess[prot.constructor.name]) context.ctx.auditReport.prototypeAccess[prot.constructor.name] = /* @__PURE__ */ new Set();
				context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
			}
		while (prot = Object.getPrototypeOf(prot));
	}
	if (prototypeAccess) {
		if (typeof a === "function") {
			if (require_utils.hasOwnProperty(a, b)) {
				const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
				const replace = context.ctx.options.prototypeReplacements.get(a);
				if (replace) {
					done(void 0, new require_utils.Prop(replace(a, true), b));
					return;
				}
				if (!(whitelist && (!whitelist.size || whitelist.has(b))) && !context.ctx.sandboxedFunctions.has(a)) throw new require_utils.SandboxAccessError(`Static method or property access not permitted: ${a.name}.${b.toString()}`);
			}
		}
		let prot = a;
		while (prot = Object.getPrototypeOf(prot)) if (require_utils.hasOwnProperty(prot, b) || b === "__proto__") {
			const whitelist = context.ctx.prototypeWhitelist.get(prot);
			const replace = context.ctx.options.prototypeReplacements.get(prot.constructor);
			if (replace) {
				done(void 0, new require_utils.Prop(replace(a, false), b));
				return;
			}
			if (whitelist && (!whitelist.size || whitelist.has(b)) || context.ctx.sandboxedFunctions.has(prot.constructor)) break;
			if (b === "__proto__") throw new require_utils.SandboxAccessError(`Access to prototype of global object is not permitted`);
			throw new require_utils.SandboxAccessError(`Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`);
		}
	}
	const val = a[b];
	if (typeof a === "function") {
		if (b === "prototype" && !context.ctx.sandboxedFunctions.has(a)) throw new require_utils.SandboxAccessError(`Access to prototype of global object is not permitted`);
	}
	if (b === "__proto__" && !context.ctx.sandboxedFunctions.has(val?.constructor)) throw new require_utils.SandboxAccessError(`Access to prototype of global object is not permitted`);
	const p = getGlobalProp(val, context, new require_utils.Prop(a, b, false, false));
	if (p) {
		done(void 0, p);
		return;
	}
	const g = obj instanceof require_utils.Prop && obj.isGlobal || typeof a === "function" && !context.ctx.sandboxedFunctions.has(a) || context.ctx.globalsWhitelist.has(a);
	done(void 0, new require_utils.Prop(a, b, false, g, false));
});
function getGlobalProp(val, context, prop) {
	if (!val) return;
	const isFunc = typeof val === "function";
	if (val instanceof require_utils.Prop) {
		if (!prop) prop = val;
		val = val.get(context);
	}
	const p = prop?.prop || "prop";
	if (val === globalThis) return new require_utils.Prop({ [p]: context.ctx.sandboxGlobal }, p, prop?.isConst || false, false, prop?.isVariable || false);
	const evl = isFunc && context.evals.get(val);
	if (evl) return new require_utils.Prop({ [p]: evl }, p, prop?.isConst || false, true, prop?.isVariable || false);
}
addOps(require_utils.LispType.Call, ({ done, a, b, obj, context }) => {
	if (context.ctx.options.forbidFunctionCalls) throw new require_utils.SandboxCapabilityError("Function invocations are not allowed");
	if (typeof a !== "function") throw new TypeError(`${typeof obj?.prop === "symbol" ? "Symbol" : obj?.prop} is not a function`);
	const vals = b.map((item) => {
		if (item instanceof SpreadArray) return [...item.item];
		else return [item];
	}).flat().map((item) => sanitizeProp(item, context));
	if (typeof obj === "function") {
		const evl = context.evals.get(obj);
		let ret = evl ? evl(obj, ...vals) : obj(...vals);
		ret = sanitizeProp(ret, context);
		if (ret instanceof require_utils.DelayedSynchronousResult) Promise.resolve(ret.result).then((res) => done(void 0, res), (err) => done(err));
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
	if (ret instanceof require_utils.DelayedSynchronousResult) Promise.resolve(ret.result).then((res) => done(void 0, res), (err) => done(err));
	else done(void 0, ret);
});
addOps(require_utils.LispType.CreateObject, ({ done, b }) => {
	let res = {};
	for (const item of b) if (item.key instanceof SpreadObject) res = {
		...res,
		...item.key.item
	};
	else res[item.key] = item.val;
	done(void 0, res);
});
addOps(require_utils.LispType.KeyVal, ({ done, a, b }) => done(void 0, new KeyVal(a, b)));
addOps(require_utils.LispType.CreateArray, ({ done, b, context }) => {
	done(void 0, b.map((item) => {
		if (item instanceof SpreadArray) return [...item.item];
		else return [item];
	}).flat().map((item) => sanitizeProp(item, context)));
});
addOps(require_utils.LispType.Group, ({ done, b }) => done(void 0, b));
addOps(require_utils.LispType.GlobalSymbol, ({ done, b }) => {
	switch (b) {
		case "true": return done(void 0, true);
		case "false": return done(void 0, false);
		case "null": return done(void 0, null);
		case "undefined": return done(void 0, void 0);
		case "NaN": return done(void 0, NaN);
		case "Infinity": return done(void 0, Infinity);
	}
	done(/* @__PURE__ */ new Error("Unknown symbol: " + b));
});
addOps(require_utils.LispType.Number, ({ done, b }) => done(void 0, Number(b.replace(/_/g, ""))));
addOps(require_utils.LispType.BigInt, ({ done, b }) => done(void 0, BigInt(b.replace(/_/g, ""))));
addOps(require_utils.LispType.StringIndex, ({ done, b, context }) => done(void 0, context.constants.strings[parseInt(b)]));
addOps(require_utils.LispType.RegexIndex, ({ done, b, context }) => {
	const reg = context.constants.regexes[parseInt(b)];
	if (!context.ctx.globalsWhitelist.has(RegExp)) throw new require_utils.SandboxCapabilityError("Regex not permitted");
	else done(void 0, new RegExp(reg.regex, reg.flags));
});
addOps(require_utils.LispType.LiteralIndex, ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
	const [, name, js] = context.constants.literals[parseInt(b)];
	const found = [];
	let f;
	const resnums = [];
	while (f = literalRegex.exec(name)) if (!f[2]) {
		found.push(js[parseInt(f[3], 10)]);
		resnums.push(f[3]);
	}
	exec(ticks, found, scope, context, (...args) => {
		const reses = {};
		if (args.length === 1) {
			done(args[0]);
			return;
		}
		const processed = args[1];
		for (const i of Object.keys(processed)) {
			const num = resnums[i];
			reses[num] = processed[i];
		}
		done(void 0, name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
			if ($) return match;
			const res = reses[num];
			return ($$ ? $$ : "") + `${sanitizeProp(res, context)}`;
		}));
	}, void 0, internal, generatorYield);
});
addOps(require_utils.LispType.SpreadArray, ({ done, b }) => {
	done(void 0, new SpreadArray(b));
});
addOps(require_utils.LispType.SpreadObject, ({ done, b }) => {
	done(void 0, new SpreadObject(b));
});
addOps(require_utils.LispType.Not, ({ done, b }) => done(void 0, !b));
addOps(require_utils.LispType.Inverse, ({ done, b }) => done(void 0, ~b));
addOps(require_utils.LispType.IncrementBefore, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, ++obj.context[obj.prop]);
});
addOps(require_utils.LispType.IncrementAfter, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop]++);
});
addOps(require_utils.LispType.DecrementBefore, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, --obj.context[obj.prop]);
});
addOps(require_utils.LispType.DecrementAfter, ({ done, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop]--);
});
addOps(require_utils.LispType.Assign, ({ done, b, obj, context, scope, bobj, internal }) => {
	assignCheck(obj, context);
	obj.isGlobal = bobj?.isGlobal || false;
	if (obj.isVariable) {
		const s = scope.getWhereValScope(obj.prop, obj.prop === "this", internal);
		if (s === null) throw new ReferenceError(`Cannot assign to undeclared variable '${obj.prop.toString()}'`);
		s.set(obj.prop, b, internal);
		if (obj.isGlobal) s.globals[obj.prop.toString()] = true;
		else delete s.globals[obj.prop.toString()];
		done(void 0, b);
		return;
	}
	done(void 0, obj.context[obj.prop] = b);
});
addOps(require_utils.LispType.AddEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] += b);
});
addOps(require_utils.LispType.SubractEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] -= b);
});
addOps(require_utils.LispType.DivideEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] /= b);
});
addOps(require_utils.LispType.MultiplyEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] *= b);
});
addOps(require_utils.LispType.PowerEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] **= b);
});
addOps(require_utils.LispType.ModulusEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] %= b);
});
addOps(require_utils.LispType.BitNegateEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ^= b);
});
addOps(require_utils.LispType.BitAndEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] &= b);
});
addOps(require_utils.LispType.BitOrEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] |= b);
});
addOps(require_utils.LispType.ShiftLeftEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] <<= b);
});
addOps(require_utils.LispType.ShiftRightEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] >>= b);
});
addOps(require_utils.LispType.UnsignedShiftRightEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] >>>= b);
});
addOps(require_utils.LispType.AndEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] &&= b);
});
addOps(require_utils.LispType.OrEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ||= b);
});
addOps(require_utils.LispType.NullishCoalescingEquals, ({ done, b, obj, context }) => {
	assignCheck(obj, context);
	done(void 0, obj.context[obj.prop] ??= b);
});
addOps(require_utils.LispType.LargerThan, ({ done, a, b }) => done(void 0, a > b));
addOps(require_utils.LispType.SmallerThan, ({ done, a, b }) => done(void 0, a < b));
addOps(require_utils.LispType.LargerEqualThan, ({ done, a, b }) => done(void 0, a >= b));
addOps(require_utils.LispType.SmallerEqualThan, ({ done, a, b }) => done(void 0, a <= b));
addOps(require_utils.LispType.Equal, ({ done, a, b }) => done(void 0, a == b));
addOps(require_utils.LispType.StrictEqual, ({ done, a, b }) => done(void 0, a === b));
addOps(require_utils.LispType.NotEqual, ({ done, a, b }) => done(void 0, a != b));
addOps(require_utils.LispType.StrictNotEqual, ({ done, a, b }) => done(void 0, a !== b));
addOps(require_utils.LispType.And, ({ done, a, b }) => done(void 0, a && b));
addOps(require_utils.LispType.Or, ({ done, a, b }) => done(void 0, a || b));
addOps(require_utils.LispType.NullishCoalescing, ({ done, a, b }) => done(void 0, a ?? b));
addOps(require_utils.LispType.BitAnd, ({ done, a, b }) => done(void 0, a & b));
addOps(require_utils.LispType.BitOr, ({ done, a, b }) => done(void 0, a | b));
addOps(require_utils.LispType.Plus, ({ done, a, b }) => done(void 0, a + b));
addOps(require_utils.LispType.Minus, ({ done, a, b }) => done(void 0, a - b));
addOps(require_utils.LispType.Positive, ({ done, b }) => done(void 0, +b));
addOps(require_utils.LispType.Negative, ({ done, b }) => done(void 0, -b));
addOps(require_utils.LispType.Divide, ({ done, a, b }) => done(void 0, a / b));
addOps(require_utils.LispType.Power, ({ done, a, b }) => done(void 0, a ** b));
addOps(require_utils.LispType.BitNegate, ({ done, a, b }) => done(void 0, a ^ b));
addOps(require_utils.LispType.Multiply, ({ done, a, b }) => done(void 0, a * b));
addOps(require_utils.LispType.Modulus, ({ done, a, b }) => done(void 0, a % b));
addOps(require_utils.LispType.BitShiftLeft, ({ done, a, b }) => done(void 0, a << b));
addOps(require_utils.LispType.BitShiftRight, ({ done, a, b }) => done(void 0, a >> b));
addOps(require_utils.LispType.BitUnsignedShiftRight, ({ done, a, b }) => done(void 0, a >>> b));
addOps(require_utils.LispType.Typeof, ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
	exec(ticks, b, scope, context, (e, prop) => {
		done(void 0, typeof sanitizeProp(prop, context));
	}, void 0, internal, generatorYield);
});
addOps(require_utils.LispType.Instanceof, ({ done, a, b }) => done(void 0, a instanceof b));
addOps(require_utils.LispType.In, ({ done, a, b }) => done(void 0, a in b));
addOps(require_utils.LispType.Delete, ({ done, context, bobj }) => {
	if (!(bobj instanceof require_utils.Prop)) {
		done(void 0, true);
		return;
	}
	assignCheck(bobj, context, "delete");
	if (bobj.isVariable) {
		done(void 0, false);
		return;
	}
	done(void 0, delete bobj.context?.[bobj.prop]);
});
addOps(require_utils.LispType.Return, ({ done, b }) => done(void 0, b));
addOps(require_utils.LispType.Var, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, require_utils.VarType.var, b, bobj?.isGlobal || false, internal));
});
addOps(require_utils.LispType.Let, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, require_utils.VarType.let, b, bobj?.isGlobal || false, internal));
});
addOps(require_utils.LispType.Const, ({ done, a, b, scope, bobj, internal }) => {
	done(void 0, scope.declare(a, require_utils.VarType.const, b, bobj?.isGlobal || false, internal));
});
addOps(require_utils.LispType.Internal, ({ done, a, b, scope, bobj, internal }) => {
	if (!internal) throw new require_utils.SandboxCapabilityError("Internal variables are not accessible");
	done(void 0, scope.declare(a, require_utils.VarType.internal, b, bobj?.isGlobal || false, internal));
});
addOps(require_utils.LispType.ArrowFunction, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	a = [...a];
	if (typeof obj[2] === "string" || obj[2] instanceof require_utils.CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new require_utils.CodeString(obj[2]), context.constants);
	else throw new require_utils.SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	if (a.shift()) done(void 0, createFunctionAsync(a, b, ticks, context, scope, void 0, internal));
	else done(void 0, createFunction(a, b, ticks, context, scope, void 0, internal));
});
addOps(require_utils.LispType.Function, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof require_utils.CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new require_utils.CodeString(obj[2]), context.constants, false, {
		generatorDepth: a[1] === require_utils.LispType.True ? 1 : 0,
		asyncDepth: a[0] === require_utils.LispType.True ? 1 : 0,
		lispDepth: 0
	});
	else throw new require_utils.SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const isAsync = a.shift();
	const isGenerator = a.shift();
	const name = a.shift();
	let func;
	if (isAsync === require_utils.LispType.True && isGenerator === require_utils.LispType.True) func = createAsyncGeneratorFunction(a, b, ticks, context, scope, name, internal);
	else if (isGenerator === require_utils.LispType.True) func = createGeneratorFunction(a, b, ticks, context, scope, name, internal);
	else if (isAsync === require_utils.LispType.True) func = createFunctionAsync(a, b, ticks, context, scope, name, internal);
	else func = createFunction(a, b, ticks, context, scope, name, internal);
	if (name) scope.declare(name, require_utils.VarType.var, func, false, internal);
	done(void 0, func);
});
addOps(require_utils.LispType.InlineFunction, ({ done, ticks, a, b, obj, context, scope, internal }) => {
	if (typeof obj[2] === "string" || obj[2] instanceof require_utils.CodeString) if (context.allowJit && context.evalContext) obj[2] = b = context.evalContext.lispifyFunction(new require_utils.CodeString(obj[2]), context.constants, false, {
		generatorDepth: a[1] === require_utils.LispType.True ? 1 : 0,
		asyncDepth: a[0] === require_utils.LispType.True ? 1 : 0,
		lispDepth: 0
	});
	else throw new require_utils.SandboxCapabilityError("Unevaluated code detected, JIT not allowed");
	const isAsync = a.shift();
	const isGenerator = a.shift();
	const name = a.shift();
	if (name) scope = new require_utils.Scope(scope, {});
	let func;
	if (isAsync === require_utils.LispType.True && isGenerator === require_utils.LispType.True) func = createAsyncGeneratorFunction(a, b, ticks, context, scope, name, internal);
	else if (isGenerator === require_utils.LispType.True) func = createGeneratorFunction(a, b, ticks, context, scope, name, internal);
	else if (isAsync === require_utils.LispType.True) func = createFunctionAsync(a, b, ticks, context, scope, name, internal);
	else func = createFunction(a, b, ticks, context, scope, name, internal);
	if (name) scope.declare(name, require_utils.VarType.let, func, false, internal);
	done(void 0, func);
});
addOps(require_utils.LispType.Loop, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep, isForAwait, label] = a;
	const loopStatementTargets = [...normalizeStatementLabels(label).map((loopLabel) => createLoopTarget(loopLabel, false)), createLoopTarget()];
	const loopTargets = addControlFlowTargets(statementLabels, loopStatementTargets);
	if (isForAwait === require_utils.LispType.True && exec !== execAsync) {
		done(/* @__PURE__ */ new SyntaxError("for-await-of loops are only allowed inside async functions"));
		return;
	}
	let loop = true;
	const loopScope = new require_utils.Scope(scope, {});
	const internalVars = { $$obj: void 0 };
	const interalScope = new require_utils.Scope(loopScope, internalVars);
	if (exec === execAsync) (async () => {
		let ad;
		ad = asyncDone((d) => exec(ticks, startStep, loopScope, context, d, void 0, internal, generatorYield));
		internalVars["$$obj"] = (ad = asyncDone((d) => exec(ticks, getIterator, loopScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		if (isForAwait === require_utils.LispType.True) {
			const obj = internalVars["$$obj"];
			internalVars["$$obj"] = obj[Symbol.asyncIterator] ? obj[Symbol.asyncIterator]() : obj[Symbol.iterator] ? obj[Symbol.iterator]() : obj;
		}
		ad = asyncDone((d) => exec(ticks, startInternal, interalScope, context, d, void 0, internal, generatorYield));
		if (isForAwait === require_utils.LispType.True) internalVars["$$next"] = await internalVars["$$next"];
		if (checkFirst) loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		while (loop) {
			const iterScope = new require_utils.Scope(interalScope, {});
			ad = asyncDone((d) => exec(ticks, beforeStep, iterScope, context, d, void 0, internal, generatorYield));
			ad.isInstant === true ? ad.instant : (await ad.p).result;
			const res = await executeTreeAsync(ticks, context, b, [iterScope], loopTargets, internal, generatorYield);
			if (res instanceof ExecReturn && res.returned) {
				done(void 0, res);
				return;
			}
			if (res instanceof ExecReturn && res.controlFlow) {
				if (!loopStatementTargets.some((target) => matchesControlFlowTarget(res.controlFlow, target))) {
					done(void 0, res);
					return;
				}
				if (res.breakLoop) break;
			}
			ad = asyncDone((d) => exec(ticks, step, interalScope, context, d, void 0, internal, generatorYield));
			if (isForAwait === require_utils.LispType.True) internalVars["$$next"] = await internalVars["$$next"];
			loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		}
		done();
	})().catch(done);
	else {
		syncDone((d) => exec(ticks, startStep, loopScope, context, d, void 0, internal, generatorYield));
		internalVars["$$obj"] = syncDone((d) => exec(ticks, getIterator, loopScope, context, d, void 0, internal, generatorYield)).result;
		syncDone((d) => exec(ticks, startInternal, interalScope, context, d, void 0, internal, generatorYield));
		if (checkFirst) loop = syncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield)).result;
		while (loop) {
			const iterScope = new require_utils.Scope(interalScope, {});
			syncDone((d) => exec(ticks, beforeStep, iterScope, context, d, void 0, internal, generatorYield));
			const res = executeTree(ticks, context, b, [iterScope], loopTargets, internal, generatorYield);
			if (res instanceof ExecReturn && res.returned) {
				done(void 0, res);
				return;
			}
			if (res instanceof ExecReturn && res.controlFlow) {
				if (!loopStatementTargets.some((target) => matchesControlFlowTarget(res.controlFlow, target))) {
					done(void 0, res);
					return;
				}
				if (res.breakLoop) break;
			}
			syncDone((d) => exec(ticks, step, interalScope, context, d, void 0, internal, generatorYield));
			loop = syncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield)).result;
		}
		done();
	}
});
addOps(require_utils.LispType.LoopAction, ({ done, a, b, context, statementLabels }) => {
	const label = normalizeStatementLabel(b);
	const target = findControlFlowTarget(statementLabels, a, label);
	if (target === null) throw new TypeError("Illegal continue statement");
	if (!target) throw new TypeError(label ? `Undefined label '${label}'` : "Illegal " + a + " statement");
	done(void 0, new ExecReturn(context.ctx.auditReport, void 0, false, {
		type: a,
		label
	}));
});
addOps(require_utils.LispType.If, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	exec(ticks, sanitizeProp(a, context) ? b.t : b.f, scope, context, done, statementLabels, internal, generatorYield);
});
addOps(require_utils.LispType.InlineIf, ({ exec, done, ticks, a, b, context, scope, internal, generatorYield }) => {
	exec(ticks, sanitizeProp(a, context) ? b.t : b.f, scope, context, done, void 0, internal, generatorYield);
});
addOps(require_utils.LispType.InlineIfCase, ({ done, a, b }) => done(void 0, new If(a, b)));
addOps(require_utils.LispType.IfCase, ({ done, a, b }) => done(void 0, new If(a, b)));
addOps(require_utils.LispType.Labeled, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const target = createLabeledStatementTarget(normalizeStatementLabel(a));
	exec(ticks, b, scope, context, (...args) => {
		if (args.length === 1) {
			done(args[0]);
			return;
		}
		const res = args[1];
		if (res instanceof ExecReturn && res.controlFlow && target) {
			if (matchesControlFlowTarget(res.controlFlow, target)) {
				done();
				return;
			}
		}
		done(void 0, res);
	}, addControlFlowTarget(statementLabels, target), internal, generatorYield);
});
addOps(require_utils.LispType.Switch, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const switchTarget = createSwitchTarget();
	const switchTargets = addControlFlowTarget(statementLabels, switchTarget);
	exec(ticks, a, scope, context, (...args) => {
		if (args.length === 1) {
			done(args[0]);
			return;
		}
		let toTest = args[1];
		toTest = sanitizeProp(toTest, context);
		if (exec === execSync) {
			let res;
			let isTrue = false;
			for (const caseItem of b) if (isTrue || (isTrue = !caseItem[1] || toTest === sanitizeProp(syncDone((d) => exec(ticks, caseItem[1], scope, context, d, void 0, internal, generatorYield)).result, context))) {
				if (!caseItem[2]) continue;
				res = executeTree(ticks, context, caseItem[2], [scope], switchTargets, internal, generatorYield);
				if (res.controlFlow) {
					if (!matchesControlFlowTarget(res.controlFlow, switchTarget)) {
						done(void 0, res);
						return;
					}
					if (res.breakLoop) break;
				}
				if (res.returned) {
					done(void 0, res);
					return;
				}
				if (!caseItem[1]) break;
			}
			done();
		} else (async () => {
			let res;
			let isTrue = false;
			for (const caseItem of b) {
				let ad;
				if (isTrue || (isTrue = !caseItem[1] || toTest === sanitizeProp((ad = asyncDone((d) => exec(ticks, caseItem[1], scope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result, context))) {
					if (!caseItem[2]) continue;
					res = await executeTreeAsync(ticks, context, caseItem[2], [scope], switchTargets, internal, generatorYield);
					if (res.controlFlow) {
						if (!matchesControlFlowTarget(res.controlFlow, switchTarget)) {
							done(void 0, res);
							return;
						}
						if (res.breakLoop) break;
					}
					if (res.returned) {
						done(void 0, res);
						return;
					}
					if (!caseItem[1]) break;
				}
			}
			done();
		})().catch(done);
	}, void 0, internal, generatorYield);
});
addOps(require_utils.LispType.Try, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const [exception, catchBody, finallyBody] = b;
	executeTreeWithDone(exec, (...tryArgs) => {
		const tryHadError = tryArgs.length === 1;
		const tryError = tryHadError ? tryArgs[0] : void 0;
		const tryResult = !tryHadError && tryArgs.length > 1 ? tryArgs[1] : void 0;
		const executeFinallyAndComplete = (hadError, errorOrResult) => {
			if (finallyBody && finallyBody.length > 0) executeTreeWithDone(exec, (...finallyArgs) => {
				const finallyHadError = finallyArgs.length === 1;
				const finallyResult = !finallyHadError && finallyArgs.length > 1 ? finallyArgs[1] : void 0;
				if (finallyHadError) {
					done(finallyArgs[0]);
					return;
				}
				if (finallyResult instanceof ExecReturn && (finallyResult.returned || finallyResult.breakLoop || finallyResult.continueLoop)) {
					done(void 0, finallyResult);
					return;
				}
				if (hadError) done(errorOrResult);
				else if (errorOrResult instanceof ExecReturn) if (errorOrResult.returned || errorOrResult.breakLoop || errorOrResult.continueLoop) done(void 0, errorOrResult);
				else done();
				else done();
			}, ticks, context, finallyBody, [new require_utils.Scope(scope, {})], statementLabels, internal, generatorYield);
			else if (hadError) done(errorOrResult);
			else if (errorOrResult instanceof ExecReturn) if (errorOrResult.returned || errorOrResult.breakLoop || errorOrResult.continueLoop) done(void 0, errorOrResult);
			else done();
			else done();
		};
		if (tryHadError && catchBody && catchBody.length > 0) {
			const sc = {};
			if (exception) sc[exception] = tryError;
			executeTreeWithDone(exec, (...catchArgs) => {
				const catchHadError = catchArgs.length === 1;
				executeFinallyAndComplete(catchHadError, catchHadError ? catchArgs[0] : catchArgs.length > 1 ? catchArgs[1] : void 0);
			}, ticks, context, catchBody, [new require_utils.Scope(scope, sc)], statementLabels, internal, generatorYield);
		} else executeFinallyAndComplete(tryHadError, tryHadError ? tryError : tryResult);
	}, ticks, context, a, [new require_utils.Scope(scope)], statementLabels, internal, generatorYield);
});
addOps(require_utils.LispType.Void, ({ done }) => {
	done();
});
addOps(require_utils.LispType.New, ({ done, a, b, context }) => {
	if (!context.ctx.globalsWhitelist.has(a) && !context.ctx.sandboxedFunctions.has(a)) throw new require_utils.SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
	b = b.map((item) => sanitizeProp(item, context));
	done(void 0, sanitizeProp(new a(...b), context));
});
addOps(require_utils.LispType.Throw, ({ done, b }) => {
	done(b);
});
addOps(require_utils.LispType.Expression, ({ done, a }) => done(void 0, a.pop()));
addOps(require_utils.LispType.None, ({ done }) => done());
function execMany(ticks, exec, tree, done, scope, context, statementLabels, internal, generatorYield) {
	if (exec === execSync) _execManySync(ticks, tree, done, scope, context, statementLabels, internal, generatorYield);
	else _execManyAsync(ticks, tree, done, scope, context, statementLabels, internal, generatorYield).catch(done);
}
function _execManySync(ticks, tree, done, scope, context, statementLabels, internal, generatorYield) {
	const ret = [];
	for (let i = 0; i < tree.length; i++) {
		let res = syncDone((d) => execSync(ticks, tree[i], scope, context, d, statementLabels, internal, generatorYield)).result;
		if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
			done(void 0, res);
			return;
		}
		if (require_utils.isLisp(tree[i]) && tree[i][0] === require_utils.LispType.Return) {
			done(void 0, new ExecReturn(context.ctx.auditReport, res, true));
			return;
		}
		ret.push(res);
	}
	done(void 0, ret);
}
async function _execManyAsync(ticks, tree, done, scope, context, statementLabels, internal, generatorYield) {
	const ret = [];
	for (let i = 0; i < tree.length; i++) {
		let res;
		try {
			let ad;
			res = (ad = asyncDone((d) => execAsync(ticks, tree[i], scope, context, d, statementLabels, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		} catch (e) {
			done(e);
			return;
		}
		if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
			done(void 0, res);
			return;
		}
		if (require_utils.isLisp(tree[i]) && tree[i][0] === require_utils.LispType.Return) {
			done(void 0, new ExecReturn(context.ctx.auditReport, res, true));
			return;
		}
		ret.push(res);
	}
	done(void 0, ret);
}
function asyncDone(callback) {
	let isInstant = false;
	let instant;
	const p = new Promise((resolve, reject) => {
		callback((...args) => {
			if (args.length === 1) reject(args[0]);
			else {
				isInstant = true;
				instant = args[1];
				resolve({ result: args[1] });
			}
		});
	});
	return {
		isInstant,
		instant,
		p
	};
}
function syncDone(callback) {
	let result;
	let err;
	callback((...args) => {
		err = args.length === 1 ? { error: args[0] } : void 0;
		result = args[1];
	});
	if (err) throw err.error;
	return { result };
}
async function execAsync(ticks, tree, scope, context, doneOriginal, statementLabels, internal, generatorYield) {
	let done = doneOriginal;
	const p = new Promise((resolve) => {
		done = (...args) => {
			doneOriginal(...args);
			resolve();
		};
	});
	if (!_execNoneRecurse(ticks, tree, scope, context, done, true, statementLabels, internal, generatorYield) && require_utils.isLisp(tree)) {
		let op = tree[0];
		let obj;
		try {
			let ad;
			obj = (ad = asyncDone((d) => execAsync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		} catch (e) {
			done(e);
			return;
		}
		let a = obj;
		try {
			a = obj instanceof require_utils.Prop ? obj.get(context) : obj;
		} catch (e) {
			done(e);
			return;
		}
		if (op === require_utils.LispType.PropOptional || op === require_utils.LispType.CallOptional) {
			if (a === void 0 || a === null) {
				done(void 0, optional);
				return;
			}
			op = op === require_utils.LispType.PropOptional ? require_utils.LispType.Prop : require_utils.LispType.Call;
		}
		if (a === optional) if (op === require_utils.LispType.Prop || op === require_utils.LispType.Call) {
			done(void 0, a);
			return;
		} else a = void 0;
		if (op === require_utils.LispType.NullishCoalescing && a !== void 0 && a !== null) {
			done(void 0, a);
			return;
		}
		let bobj;
		try {
			let ad;
			bobj = (ad = asyncDone((d) => execAsync(ticks, tree[2], scope, context, d, statementLabels, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		} catch (e) {
			done(e);
			return;
		}
		let b = bobj;
		try {
			b = bobj instanceof require_utils.Prop ? bobj.get(context) : bobj;
		} catch (e) {
			done(e);
			return;
		}
		if (b === optional) b = void 0;
		performOp({
			op,
			exec: execAsync,
			done,
			ticks,
			a,
			b,
			obj,
			context,
			scope,
			bobj,
			statementLabels,
			internal,
			generatorYield,
			tree
		});
	}
	await p;
}
function execSync(ticks, tree, scope, context, done, statementLabels, internal, generatorYield) {
	if (!_execNoneRecurse(ticks, tree, scope, context, done, false, statementLabels, internal, generatorYield) && require_utils.isLisp(tree)) {
		let op = tree[0];
		let obj = syncDone((d) => execSync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield)).result;
		let a = obj instanceof require_utils.Prop ? obj.get(context) : obj;
		if (op === require_utils.LispType.PropOptional || op === require_utils.LispType.CallOptional) {
			if (a === void 0 || a === null) {
				done(void 0, optional);
				return;
			}
			op = op === require_utils.LispType.PropOptional ? require_utils.LispType.Prop : require_utils.LispType.Call;
		}
		if (a === optional) if (op === require_utils.LispType.Prop || op === require_utils.LispType.Call) {
			done(void 0, a);
			return;
		} else a = void 0;
		if (op === require_utils.LispType.NullishCoalescing && a !== void 0 && a !== null) {
			done(void 0, a);
			return;
		}
		let bobj = syncDone((d) => execSync(ticks, tree[2], scope, context, d, statementLabels, internal, generatorYield)).result;
		let b = bobj instanceof require_utils.Prop ? bobj.get(context) : bobj;
		if (b === optional) b = void 0;
		performOp({
			op,
			exec: execSync,
			done,
			ticks,
			a,
			b,
			obj,
			context,
			scope,
			bobj,
			statementLabels,
			internal,
			generatorYield,
			tree
		});
	}
}
function sanitizeArray(val, context, cache = /* @__PURE__ */ new WeakSet()) {
	if (!Array.isArray(val)) return val;
	if (cache.has(val)) return val;
	cache.add(val);
	for (let i = 0; i < val.length; i++) {
		const item = val[i];
		val[i] = sanitizeProp(item, context);
	}
	return val;
}
function sanitizeProp(value, context) {
	if (!(value instanceof Object)) return value;
	value = getGlobalProp(value, context) || value;
	if (value instanceof require_utils.Prop) value = value.get(context);
	if (value === optional) return;
	sanitizeArray(value, context);
	return value;
}
function checkHaltExpectedTicks(params, expectTicks = 0) {
	const sandbox = params.context.ctx.sandbox;
	const { ticks, scope, context } = params;
	if (sandbox.halted) {
		const sub = sandbox.subscribeResume(() => {
			sub.unsubscribe();
			performOp(params, false);
		});
		return true;
	} else if (ticks.tickLimit && ticks.tickLimit <= ticks.ticks + BigInt(expectTicks)) {
		const sub = sandbox.subscribeResume(() => {
			sub.unsubscribe();
			performOp(params, false);
		});
		const error = new require_utils.SandboxExecutionQuotaExceededError("Execution quota exceeded");
		sandbox.haltExecution({
			type: "error",
			error,
			ticks,
			scope,
			context
		});
		return true;
	} else if (ticks.nextYield && ticks.ticks > ticks.nextYield) {
		const sub = sandbox.subscribeResume(() => {
			sub.unsubscribe();
			performOp(params, false);
		});
		ticks.nextYield += require_utils.NON_BLOCKING_THRESHOLD;
		sandbox.haltExecution({ type: "yield" });
		setTimeout(() => sandbox.resumeExecution());
		return true;
	}
	return false;
}
function performOp(params, count = true) {
	const { done, op, ticks, context, scope } = params;
	if (count) ticks.ticks++;
	const sandbox = context.ctx.sandbox;
	if (checkHaltExpectedTicks(params)) return;
	try {
		const o = ops.get(op);
		if (!o) {
			done(new require_utils.SandboxExecutionTreeError("Unknown operator: " + op));
			return;
		}
		o(params);
	} catch (err) {
		if (context.ctx.options.haltOnSandboxError && err instanceof require_utils.SandboxError) {
			const sub = sandbox.subscribeResume(() => {
				sub.unsubscribe();
				done(err);
			});
			sandbox.haltExecution({
				type: "error",
				error: err,
				ticks,
				scope,
				context
			});
		} else done(err);
	}
}
var unexecTypes = new Set([
	require_utils.LispType.ArrowFunction,
	require_utils.LispType.Function,
	require_utils.LispType.InlineFunction,
	require_utils.LispType.Loop,
	require_utils.LispType.Try,
	require_utils.LispType.Switch,
	require_utils.LispType.IfCase,
	require_utils.LispType.InlineIfCase,
	require_utils.LispType.Labeled,
	require_utils.LispType.Typeof
]);
function _execNoneRecurse(ticks, tree, scope, context, done, isAsync, statementLabels, internal, generatorYield) {
	const exec = isAsync ? execAsync : execSync;
	if (tree instanceof require_utils.Prop) done(void 0, tree.get(context));
	else if (tree === optional) done();
	else if (Array.isArray(tree) && !require_utils.isLisp(tree)) if (tree[0] === require_utils.LispType.None) done();
	else execMany(ticks, exec, tree, done, scope, context, statementLabels, internal, generatorYield);
	else if (!require_utils.isLisp(tree)) done(void 0, tree);
	else if (tree[0] === require_utils.LispType.Block) execMany(ticks, exec, tree[1], done, new require_utils.Scope(scope), context, statementLabels, internal, generatorYield);
	else if (tree[0] === require_utils.LispType.InternalBlock) execMany(ticks, exec, tree[1], done, scope, context, statementLabels, true, generatorYield);
	else if (tree[0] === require_utils.LispType.Await) if (!isAsync) done(/* @__PURE__ */ new SyntaxError("Illegal use of 'await', must be inside async function"));
	else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) execAsync(ticks, tree[1], scope, context, async (...args) => {
		if (args.length === 1) done(args[0]);
		else try {
			done(void 0, await sanitizeProp(args[1], context));
		} catch (err) {
			done(err);
		}
	}, statementLabels, internal, generatorYield).catch(done);
	else done(new require_utils.SandboxCapabilityError("Async/await is not permitted"));
	else if (tree[0] === require_utils.LispType.Yield || tree[0] === require_utils.LispType.YieldDelegate) {
		const yieldFn = generatorYield;
		if (!yieldFn) {
			done(/* @__PURE__ */ new SyntaxError("Illegal use of 'yield', must be inside a generator function"));
			return true;
		}
		const isDelegate = tree[0] === require_utils.LispType.YieldDelegate;
		if (isAsync) execAsync(ticks, tree[1], scope, context, async (...args) => {
			if (args.length === 1) {
				done(args[0]);
				return;
			}
			try {
				yieldFn(new YieldValue(await sanitizeProp(args[1], context), isDelegate), done);
			} catch (err) {
				done(err);
			}
		}, statementLabels, internal, generatorYield).catch(done);
		else try {
			const val = syncDone((d) => execSync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield)).result;
			yieldFn(new YieldValue(sanitizeProp(val, context), isDelegate), done);
		} catch (err) {
			if (err === syncYieldPauseSentinel) throw err;
			done(err);
		}
	} else if (unexecTypes.has(tree[0])) performOp({
		op: tree[0],
		exec,
		done,
		ticks,
		a: tree[1],
		b: tree[2],
		obj: tree,
		tree,
		context,
		scope,
		bobj: void 0,
		statementLabels,
		internal,
		generatorYield
	});
	else return false;
	return true;
}
function executeTree(ticks, context, executionTree, scopes = [], statementLabels, internal, generatorYield) {
	return syncDone((done) => executeTreeWithDone(execSync, done, ticks, context, executionTree, scopes, statementLabels, internal, generatorYield)).result;
}
async function executeTreeAsync(ticks, context, executionTree, scopes = [], statementLabels, internal, generatorYield) {
	let ad;
	return (ad = asyncDone((done) => executeTreeWithDone(execAsync, done, ticks, context, executionTree, scopes, statementLabels, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
}
function executeTreeWithDone(exec, done, ticks, context, executionTree, scopes = [], statementLabels, internal, generatorYield) {
	if (!executionTree) {
		done();
		return;
	}
	if (!(executionTree instanceof Array)) throw new SyntaxError("Bad execution tree");
	let scope = context.ctx.globalScope;
	let s;
	while (s = scopes.shift()) {
		if (typeof s !== "object") continue;
		if (s instanceof require_utils.Scope) scope = s;
		else scope = new require_utils.Scope(scope, s, s instanceof require_utils.LocalScope ? void 0 : null);
	}
	if (context.ctx.options.audit && !context.ctx.auditReport) context.ctx.auditReport = {
		globalsAccess: /* @__PURE__ */ new Set(),
		prototypeAccess: {}
	};
	if (exec === execSync) _executeWithDoneSync(done, ticks, context, executionTree, scope, statementLabels, internal, generatorYield);
	else _executeWithDoneAsync(done, ticks, context, executionTree, scope, statementLabels, internal, generatorYield).catch(done);
}
function _executeWithDoneSync(done, ticks, context, executionTree, scope, statementLabels, internal, generatorYield) {
	if (!(executionTree instanceof Array)) throw new SyntaxError("Bad execution tree");
	let i = 0;
	for (i = 0; i < executionTree.length; i++) {
		let res;
		let err;
		const current = executionTree[i];
		try {
			execSync(ticks, current, scope, context, (...args) => {
				if (args.length === 1) err = { error: args[0] };
				else res = args[1];
			}, statementLabels, internal, generatorYield);
		} catch (e) {
			err = { error: e };
		}
		if (err) {
			done(err.error);
			return;
		}
		if (res instanceof ExecReturn) {
			done(void 0, res);
			return;
		}
		if (require_utils.isLisp(current) && current[0] === require_utils.LispType.Return) {
			done(void 0, new ExecReturn(context.ctx.auditReport, res, true));
			return;
		}
	}
	done(void 0, new ExecReturn(context.ctx.auditReport, void 0, false));
}
async function _executeWithDoneAsync(done, ticks, context, executionTree, scope, statementLabels, internal, generatorYield) {
	if (!(executionTree instanceof Array)) throw new SyntaxError("Bad execution tree");
	let i = 0;
	for (i = 0; i < executionTree.length; i++) {
		let res;
		let err;
		const current = executionTree[i];
		try {
			await execAsync(ticks, current, scope, context, (...args) => {
				if (args.length === 1) err = { error: args[0] };
				else res = args[1];
			}, statementLabels, internal, generatorYield);
		} catch (e) {
			err = { error: e };
		}
		if (err) {
			done(err.error);
			return;
		}
		if (res instanceof ExecReturn) {
			done(void 0, res);
			return;
		}
		if (require_utils.isLisp(current) && current[0] === require_utils.LispType.Return) {
			done(void 0, new ExecReturn(context.ctx.auditReport, res, true));
			return;
		}
	}
	done(void 0, new ExecReturn(context.ctx.auditReport, void 0, false));
}
//#endregion
exports.ExecReturn = ExecReturn;
exports.If = If;
exports.KeyVal = KeyVal;
exports.SpreadArray = SpreadArray;
exports.SpreadObject = SpreadObject;
exports.YieldValue = YieldValue;
exports.addOps = addOps;
exports.assignCheck = assignCheck;
exports.asyncDone = asyncDone;
exports.createAsyncGeneratorFunction = createAsyncGeneratorFunction;
exports.createFunction = createFunction;
exports.createFunctionAsync = createFunctionAsync;
exports.createGeneratorFunction = createGeneratorFunction;
exports.execAsync = execAsync;
exports.execMany = execMany;
exports.execSync = execSync;
exports.executeTree = executeTree;
exports.executeTreeAsync = executeTreeAsync;
exports.ops = ops;
exports.syncDone = syncDone;
