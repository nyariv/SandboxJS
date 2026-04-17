const require_errors = require("../utils/errors.js");
const require_types = require("../utils/types.js");
const require_Prop = require("../utils/Prop.js");
const require_Scope = require("../utils/Scope.js");
const require_ExecContext = require("../utils/ExecContext.js");
require("../utils/index.js");
const require_opsRegistry = require("./opsRegistry.js");
require("./ops/index.js");
//#region src/executor/executorUtils.ts
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
var emptyControlFlowTargets = [];
function normalizeStatementLabel(label) {
	return label === void 0 || label === require_types.LispType.None ? void 0 : label;
}
function normalizeStatementLabels(label) {
	if (label === void 0 || label === require_types.LispType.None) return [];
	if (Array.isArray(label) && !require_ExecContext.isLisp(label)) return label.filter((item) => typeof item === "string");
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
	if (context.ctx.options.forbidFunctionCreation) throw new require_errors.SandboxCapabilityError("Function creation is forbidden");
	let func;
	if (name === void 0) func = (...args) => {
		const vars = generateArgs(argNames, args);
		return executeTree(ticks, context, parsed, scope === void 0 ? [] : [new require_Scope.Scope(scope, vars)], void 0, internal).result;
	};
	else func = function sandboxedObject(...args) {
		const vars = generateArgs(argNames, args);
		return executeTree(ticks, context, parsed, scope === void 0 ? [] : [new require_Scope.Scope(scope, vars, this)], void 0, internal).result;
	};
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
function createFunctionAsync(argNames, parsed, ticks, context, scope, name, internal = false) {
	if (context.ctx.options.forbidFunctionCreation) throw new require_errors.SandboxCapabilityError("Function creation is forbidden");
	if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) throw new require_errors.SandboxCapabilityError("Async/await not permitted");
	let func;
	if (name === void 0) func = async (...args) => {
		const vars = generateArgs(argNames, args);
		return (await executeTreeAsync(ticks, context, parsed, scope === void 0 ? [] : [new require_Scope.Scope(scope, vars)], void 0, internal)).result;
	};
	else func = async function sandboxedObject(...args) {
		const vars = generateArgs(argNames, args);
		return (await executeTreeAsync(ticks, context, parsed, scope === void 0 ? [] : [new require_Scope.Scope(scope, vars, this)], void 0, internal)).result;
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
	if (!require_ExecContext.isLisp(tree) && Array.isArray(tree)) {
		const stmts = tree;
		if (stmts.length === 0 || stmts[0] === require_types.LispType.None) return new ExecReturn(context.ctx.auditReport, void 0, false);
		for (const stmt of stmts) {
			const res = yield* executeGenBody(ticks, stmt, scope, context, statementLabels, internal);
			if (res instanceof ExecReturn && (res.returned || res.controlFlow)) return res;
			if (require_ExecContext.isLisp(stmt) && stmt[0] === require_types.LispType.Return) return new ExecReturn(context.ctx.auditReport, res.result, true);
		}
		return new ExecReturn(context.ctx.auditReport, void 0, false);
	}
	const [op, a, b] = tree;
	switch (op) {
		case require_types.LispType.Yield: {
			const injected = yield require_Scope.sanitizeProp((yield* executeGenBody(ticks, a, scope, context, statementLabels, internal)).result, context);
			return new ExecReturn(context.ctx.auditReport, injected, false);
		}
		case require_types.LispType.YieldDelegate: {
			const result = yield* asIterableIterator(require_Scope.sanitizeProp((yield* executeGenBody(ticks, a, scope, context, statementLabels, internal)).result, context));
			return new ExecReturn(context.ctx.auditReport, result, false);
		}
		case require_types.LispType.If: {
			const condResult = yield* executeGenBody(ticks, a, scope, context, statementLabels, internal);
			const ifCase = syncDone((d) => execSync(ticks, b, scope, context, d, statementLabels, internal, void 0)).result;
			const branch = require_Scope.sanitizeProp(condResult.result, context) ? ifCase.t : ifCase.f;
			if (branch) return yield* executeGenBody(ticks, branch, scope, context, statementLabels, internal);
			return new ExecReturn(context.ctx.auditReport, void 0, false);
		}
		case require_types.LispType.Loop: {
			const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep, isForAwait, label] = a;
			if (isForAwait === require_types.LispType.True) throw new SyntaxError("for-await-of loops are only allowed inside async functions");
			const loopStatementTargets = [...normalizeStatementLabels(label).map((loopLabel) => createLoopTarget(loopLabel, false)), createLoopTarget()];
			const loopTargets = addControlFlowTargets(statementLabels, loopStatementTargets);
			const loopScope = new require_Scope.Scope(scope, {});
			const internalVars = { $$obj: void 0 };
			const interalScope = new require_Scope.Scope(loopScope, internalVars);
			syncDone((d) => execSync(ticks, startStep, loopScope, context, d, void 0, internal, void 0));
			internalVars["$$obj"] = syncDone((d) => execSync(ticks, getIterator, loopScope, context, d, void 0, internal, void 0)).result;
			syncDone((d) => execSync(ticks, startInternal, interalScope, context, d, void 0, internal, void 0));
			let loop = true;
			if (checkFirst) loop = syncDone((d) => execSync(ticks, condition, interalScope, context, d, void 0, internal, void 0)).result;
			while (loop) {
				const iterScope = new require_Scope.Scope(interalScope, {});
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
		case require_types.LispType.Try: {
			const [exception, catchBody, finallyBody] = b;
			let result;
			let finalOverride;
			try {
				result = yield* executeGenBody(ticks, a, scope, context, statementLabels, internal);
			} catch (e) {
				if (exception && catchBody?.length > 0) result = yield* executeGenBody(ticks, catchBody, new require_Scope.Scope(scope, { [exception]: e }), context, statementLabels, internal);
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
		case require_types.LispType.Labeled: {
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
	if (context.ctx.options.forbidFunctionCreation) throw new require_errors.SandboxCapabilityError("Function creation is forbidden");
	const makeGen = (thisArg, args) => {
		const vars = generateArgs(argNames, args);
		const executionGen = executeGenBody(ticks, parsed, scope === void 0 ? new require_Scope.Scope(null, vars, thisArg) : new require_Scope.Scope(scope, vars, thisArg), context, void 0, internal);
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
	Object.setPrototypeOf(func, require_types.GeneratorFunction.prototype);
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
function createAsyncGeneratorFunction(argNames, parsed, ticks, context, scope, name, internal = false) {
	if (context.ctx.options.forbidFunctionCreation) throw new require_errors.SandboxCapabilityError("Function creation is forbidden");
	if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) throw new require_errors.SandboxCapabilityError("Async/await not permitted");
	const makeGen = (thisArg, args) => {
		const vars = generateArgs(argNames, args);
		const genScope = scope === void 0 ? [new require_Scope.Scope(null, vars, thisArg)] : [new require_Scope.Scope(scope, vars, thisArg)];
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
	Object.setPrototypeOf(func, require_types.AsyncGeneratorFunction.prototype);
	context.registerSandboxFunction(func);
	context.ctx.sandboxedFunctions.add(func);
	return func;
}
function assignCheck(obj, context, op = "assign") {
	if (obj.context === void 0) throw new ReferenceError(`Cannot ${op} value to undefined.`);
	if (obj.isConst) throw new TypeError(`Assignment to constant variable.`);
	if (obj.isGlobal) throw new require_errors.SandboxAccessError(`Cannot ${op} property '${obj.prop.toString()}' of a global object`);
	if (obj.context === null) throw new TypeError("Cannot set properties of null");
	if (typeof obj.context[obj.prop] === "function" && !require_Prop.hasOwnProperty(obj.context, obj.prop)) throw new require_errors.SandboxAccessError(`Override prototype property '${obj.prop.toString()}' not allowed`);
	if (op === "delete") {
		if (require_Prop.hasOwnProperty(obj.context, obj.prop)) {
			context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({
				type: "delete",
				prop: obj.prop.toString()
			}));
			context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({
				type: "delete",
				prop: obj.prop.toString()
			}));
		}
	} else if (require_Prop.hasOwnProperty(obj.context, obj.prop)) {
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
var ArrayHole = class {};
var If = class {
	constructor(t, f, label) {
		this.t = t;
		this.f = f;
		this.label = label;
	}
};
var literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
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
		if (require_ExecContext.isLisp(tree[i]) && tree[i][0] === require_types.LispType.Return) {
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
		if (require_ExecContext.isLisp(tree[i]) && tree[i][0] === require_types.LispType.Return) {
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
	if (!_execNoneRecurse(ticks, tree, scope, context, done, true, statementLabels, internal, generatorYield) && require_ExecContext.isLisp(tree)) {
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
			a = obj instanceof require_Prop.Prop ? obj.get(context) : obj;
		} catch (e) {
			done(e);
			return;
		}
		if (op === require_types.LispType.PropOptional || op === require_types.LispType.CallOptional) {
			if (a === void 0 || a === null) {
				done(void 0, require_Scope.optional);
				return;
			}
			op = op === require_types.LispType.PropOptional ? require_types.LispType.Prop : require_types.LispType.Call;
		}
		if (a === require_Scope.optional) if (op === require_types.LispType.Prop || op === require_types.LispType.Call) {
			done(void 0, a);
			return;
		} else a = void 0;
		if (op === require_types.LispType.NullishCoalescing && a !== void 0 && a !== null) {
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
			b = bobj instanceof require_Prop.Prop ? bobj.get(context) : bobj;
		} catch (e) {
			done(e);
			return;
		}
		if (b === require_Scope.optional) b = void 0;
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
	if (!_execNoneRecurse(ticks, tree, scope, context, done, false, statementLabels, internal, generatorYield) && require_ExecContext.isLisp(tree)) {
		let op = tree[0];
		let obj = syncDone((d) => execSync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield)).result;
		let a = obj instanceof require_Prop.Prop ? obj.get(context) : obj;
		if (op === require_types.LispType.PropOptional || op === require_types.LispType.CallOptional) {
			if (a === void 0 || a === null) {
				done(void 0, require_Scope.optional);
				return;
			}
			op = op === require_types.LispType.PropOptional ? require_types.LispType.Prop : require_types.LispType.Call;
		}
		if (a === require_Scope.optional) if (op === require_types.LispType.Prop || op === require_types.LispType.Call) {
			done(void 0, a);
			return;
		} else a = void 0;
		if (op === require_types.LispType.NullishCoalescing && a !== void 0 && a !== null) {
			done(void 0, a);
			return;
		}
		let bobj = syncDone((d) => execSync(ticks, tree[2], scope, context, d, statementLabels, internal, generatorYield)).result;
		let b = bobj instanceof require_Prop.Prop ? bobj.get(context) : bobj;
		if (b === require_Scope.optional) b = void 0;
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
function checkHaltExpectedTicks(params, expectTicks = 0n) {
	const sandbox = params.context.ctx.sandbox;
	const { ticks, scope, context } = params;
	if (sandbox.halted) {
		const sub = sandbox.subscribeResume(() => {
			sub.unsubscribe();
			performOp(params, false);
		});
		return true;
	} else if (ticks.tickLimit !== void 0 && ticks.tickLimit <= ticks.ticks + expectTicks) {
		const error = new require_errors.SandboxExecutionQuotaExceededError("Execution quota exceeded");
		if (context.ctx.options.haltOnSandboxError) {
			const sub = sandbox.subscribeResume(() => {
				sub.unsubscribe();
				performOp(params);
			});
			sandbox.haltExecution({
				type: "error",
				error,
				ticks,
				scope,
				context
			});
		} else params.done(error);
		return true;
	} else if (ticks.nextYield && ticks.ticks > ticks.nextYield) {
		const sub = sandbox.subscribeResume(() => {
			sub.unsubscribe();
			performOp(params, false);
		});
		ticks.nextYield += require_types.NON_BLOCKING_THRESHOLD;
		sandbox.haltExecution({ type: "yield" });
		setTimeout(() => sandbox.resumeExecution());
		return true;
	}
	ticks.ticks += expectTicks;
	return false;
}
function performOp(params, count = true) {
	const { done, op, ticks, context, scope } = params;
	if (count) ticks.ticks++;
	const sandbox = context.ctx.sandbox;
	try {
		if (checkHaltExpectedTicks(params)) return;
		const o = require_opsRegistry.ops.get(op);
		if (o === void 0) {
			done(new require_errors.SandboxExecutionTreeError("Unknown operator: " + op));
			return;
		}
		o(params);
	} catch (err) {
		if (context.ctx.options.haltOnSandboxError && err instanceof require_errors.SandboxError) {
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
	require_types.LispType.ArrowFunction,
	require_types.LispType.Function,
	require_types.LispType.InlineFunction,
	require_types.LispType.Loop,
	require_types.LispType.Try,
	require_types.LispType.Switch,
	require_types.LispType.IfCase,
	require_types.LispType.InlineIfCase,
	require_types.LispType.Labeled,
	require_types.LispType.Typeof
]);
function _execNoneRecurse(ticks, tree, scope, context, done, isAsync, statementLabels, internal, generatorYield) {
	const exec = isAsync ? execAsync : execSync;
	if (tree instanceof require_Prop.Prop) done(void 0, tree.get(context));
	else if (tree === require_Scope.optional) done();
	else if (Array.isArray(tree) && !require_ExecContext.isLisp(tree)) if (tree[0] === require_types.LispType.None) done();
	else execMany(ticks, exec, tree, done, scope, context, statementLabels, internal, generatorYield);
	else if (!require_ExecContext.isLisp(tree)) done(void 0, tree);
	else if (tree[0] === require_types.LispType.Block) execMany(ticks, exec, tree[1], done, new require_Scope.Scope(scope), context, statementLabels, internal, generatorYield);
	else if (tree[0] === require_types.LispType.InternalBlock) execMany(ticks, exec, tree[1], done, scope, context, statementLabels, true, generatorYield);
	else if (tree[0] === require_types.LispType.Await) if (!isAsync) done(/* @__PURE__ */ new SyntaxError("Illegal use of 'await', must be inside async function"));
	else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) execAsync(ticks, tree[1], scope, context, async (...args) => {
		if (args.length === 1) done(args[0]);
		else try {
			done(void 0, await require_Scope.sanitizeProp(args[1], context));
		} catch (err) {
			done(err);
		}
	}, statementLabels, internal, generatorYield).catch(done);
	else done(new require_errors.SandboxCapabilityError("Async/await is not permitted"));
	else if (tree[0] === require_types.LispType.Yield || tree[0] === require_types.LispType.YieldDelegate) {
		const yieldFn = generatorYield;
		if (!yieldFn) {
			done(/* @__PURE__ */ new SyntaxError("Illegal use of 'yield', must be inside a generator function"));
			return true;
		}
		const isDelegate = tree[0] === require_types.LispType.YieldDelegate;
		if (isAsync) execAsync(ticks, tree[1], scope, context, async (...args) => {
			if (args.length === 1) {
				done(args[0]);
				return;
			}
			try {
				yieldFn(new YieldValue(await require_Scope.sanitizeProp(args[1], context), isDelegate), done);
			} catch (err) {
				done(err);
			}
		}, statementLabels, internal, generatorYield).catch(done);
		else try {
			const val = syncDone((d) => execSync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield)).result;
			yieldFn(new YieldValue(require_Scope.sanitizeProp(val, context), isDelegate), done);
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
		if (s instanceof require_Scope.Scope) scope = s;
		else scope = new require_Scope.Scope(scope, s, s instanceof require_Scope.LocalScope ? void 0 : null);
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
		if (require_ExecContext.isLisp(current) && current[0] === require_types.LispType.Return) {
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
		if (require_ExecContext.isLisp(current) && current[0] === require_types.LispType.Return) {
			done(void 0, new ExecReturn(context.ctx.auditReport, res, true));
			return;
		}
	}
	done(void 0, new ExecReturn(context.ctx.auditReport, void 0, false));
}
//#endregion
exports.ArrayHole = ArrayHole;
exports.ExecReturn = ExecReturn;
exports.If = If;
exports.KeyVal = KeyVal;
exports.SpreadArray = SpreadArray;
exports.SpreadObject = SpreadObject;
exports.YieldValue = YieldValue;
exports.addControlFlowTarget = addControlFlowTarget;
exports.addControlFlowTargets = addControlFlowTargets;
exports.arrayChange = arrayChange;
exports.assignCheck = assignCheck;
exports.asyncDone = asyncDone;
exports.checkHaltExpectedTicks = checkHaltExpectedTicks;
exports.createAsyncGeneratorFunction = createAsyncGeneratorFunction;
exports.createFunction = createFunction;
exports.createFunctionAsync = createFunctionAsync;
exports.createGeneratorFunction = createGeneratorFunction;
exports.createLabeledStatementTarget = createLabeledStatementTarget;
exports.createLoopTarget = createLoopTarget;
exports.createSwitchTarget = createSwitchTarget;
exports.execAsync = execAsync;
exports.execMany = execMany;
exports.execSync = execSync;
exports.executeTree = executeTree;
exports.executeTreeAsync = executeTreeAsync;
exports.executeTreeWithDone = executeTreeWithDone;
exports.findControlFlowTarget = findControlFlowTarget;
exports.hasPossibleProperties = hasPossibleProperties;
exports.isPropertyKey = isPropertyKey;
exports.literalRegex = literalRegex;
exports.matchesControlFlowTarget = matchesControlFlowTarget;
exports.normalizeStatementLabel = normalizeStatementLabel;
exports.normalizeStatementLabels = normalizeStatementLabels;
exports.prorptyKeyTypes = prorptyKeyTypes;
exports.syncDone = syncDone;
