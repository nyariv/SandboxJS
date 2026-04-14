const require_errors = require("../../utils/errors.js");
const require_types = require("../../utils/types.js");
const require_Scope = require("../../utils/Scope.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/control.ts
require_opsRegistry.addOps(require_types.LispType.Loop, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep, isForAwait, label] = a;
	const loopStatementTargets = [...require_executorUtils.normalizeStatementLabels(label).map((loopLabel) => require_executorUtils.createLoopTarget(loopLabel, false)), require_executorUtils.createLoopTarget()];
	const loopTargets = require_executorUtils.addControlFlowTargets(statementLabels, loopStatementTargets);
	if (isForAwait === require_types.LispType.True && exec !== require_executorUtils.execAsync) {
		done(/* @__PURE__ */ new SyntaxError("for-await-of loops are only allowed inside async functions"));
		return;
	}
	let loop = true;
	const loopScope = new require_Scope.Scope(scope, {});
	const internalVars = { $$obj: void 0 };
	const interalScope = new require_Scope.Scope(loopScope, internalVars);
	if (exec === require_executorUtils.execAsync) (async () => {
		let ad;
		ad = require_executorUtils.asyncDone((d) => exec(ticks, startStep, loopScope, context, d, void 0, internal, generatorYield));
		internalVars["$$obj"] = (ad = require_executorUtils.asyncDone((d) => exec(ticks, getIterator, loopScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		if (isForAwait === require_types.LispType.True) {
			const obj = internalVars["$$obj"];
			internalVars["$$obj"] = obj[Symbol.asyncIterator] ? obj[Symbol.asyncIterator]() : obj[Symbol.iterator] ? obj[Symbol.iterator]() : obj;
		}
		ad = require_executorUtils.asyncDone((d) => exec(ticks, startInternal, interalScope, context, d, void 0, internal, generatorYield));
		if (isForAwait === require_types.LispType.True) internalVars["$$next"] = await internalVars["$$next"];
		if (checkFirst) loop = (ad = require_executorUtils.asyncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		while (loop) {
			const iterScope = new require_Scope.Scope(interalScope, {});
			ad = require_executorUtils.asyncDone((d) => exec(ticks, beforeStep, iterScope, context, d, void 0, internal, generatorYield));
			ad.isInstant === true ? ad.instant : (await ad.p).result;
			const res = await require_executorUtils.executeTreeAsync(ticks, context, b, [iterScope], loopTargets, internal, generatorYield);
			if (res instanceof require_executorUtils.ExecReturn && res.returned) {
				done(void 0, res);
				return;
			}
			if (res instanceof require_executorUtils.ExecReturn && res.controlFlow) {
				if (!loopStatementTargets.some((target) => require_executorUtils.matchesControlFlowTarget(res.controlFlow, target))) {
					done(void 0, res);
					return;
				}
				if (res.breakLoop) break;
			}
			ad = require_executorUtils.asyncDone((d) => exec(ticks, step, interalScope, context, d, void 0, internal, generatorYield));
			if (isForAwait === require_types.LispType.True) internalVars["$$next"] = await internalVars["$$next"];
			loop = (ad = require_executorUtils.asyncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		}
		done();
	})().catch(done);
	else {
		require_executorUtils.syncDone((d) => exec(ticks, startStep, loopScope, context, d, void 0, internal, generatorYield));
		internalVars["$$obj"] = require_executorUtils.syncDone((d) => exec(ticks, getIterator, loopScope, context, d, void 0, internal, generatorYield)).result;
		require_executorUtils.syncDone((d) => exec(ticks, startInternal, interalScope, context, d, void 0, internal, generatorYield));
		if (checkFirst) loop = require_executorUtils.syncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield)).result;
		while (loop) {
			const iterScope = new require_Scope.Scope(interalScope, {});
			require_executorUtils.syncDone((d) => exec(ticks, beforeStep, iterScope, context, d, void 0, internal, generatorYield));
			const res = require_executorUtils.executeTree(ticks, context, b, [iterScope], loopTargets, internal, generatorYield);
			if (res instanceof require_executorUtils.ExecReturn && res.returned) {
				done(void 0, res);
				return;
			}
			if (res instanceof require_executorUtils.ExecReturn && res.controlFlow) {
				if (!loopStatementTargets.some((target) => require_executorUtils.matchesControlFlowTarget(res.controlFlow, target))) {
					done(void 0, res);
					return;
				}
				if (res.breakLoop) break;
			}
			require_executorUtils.syncDone((d) => exec(ticks, step, interalScope, context, d, void 0, internal, generatorYield));
			loop = require_executorUtils.syncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield)).result;
		}
		done();
	}
});
require_opsRegistry.addOps(require_types.LispType.If, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	exec(ticks, require_Scope.sanitizeProp(a, context) ? b.t : b.f, scope, context, done, statementLabels, internal, generatorYield);
});
require_opsRegistry.addOps(require_types.LispType.InlineIf, ({ exec, done, ticks, a, b, context, scope, internal, generatorYield }) => {
	exec(ticks, require_Scope.sanitizeProp(a, context) ? b.t : b.f, scope, context, done, void 0, internal, generatorYield);
});
require_opsRegistry.addOps(require_types.LispType.InlineIfCase, ({ done, a, b }) => done(void 0, new require_executorUtils.If(a, b)));
require_opsRegistry.addOps(require_types.LispType.IfCase, ({ done, a, b }) => done(void 0, new require_executorUtils.If(a, b)));
require_opsRegistry.addOps(require_types.LispType.Labeled, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const target = require_executorUtils.createLabeledStatementTarget(require_executorUtils.normalizeStatementLabel(a));
	exec(ticks, b, scope, context, (...args) => {
		if (args.length === 1) {
			done(args[0]);
			return;
		}
		const res = args[1];
		if (res instanceof require_executorUtils.ExecReturn && res.controlFlow && target) {
			if (require_executorUtils.matchesControlFlowTarget(res.controlFlow, target)) {
				done();
				return;
			}
		}
		done(void 0, res);
	}, require_executorUtils.addControlFlowTarget(statementLabels, target), internal, generatorYield);
});
require_opsRegistry.addOps(require_types.LispType.Switch, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const switchTarget = require_executorUtils.createSwitchTarget();
	const switchTargets = require_executorUtils.addControlFlowTarget(statementLabels, switchTarget);
	exec(ticks, a, scope, context, (...args) => {
		if (args.length === 1) {
			done(args[0]);
			return;
		}
		let toTest = args[1];
		toTest = require_Scope.sanitizeProp(toTest, context);
		if (exec === require_executorUtils.execSync) {
			let res;
			let isTrue = false;
			for (const caseItem of b) if (isTrue || (isTrue = !caseItem[1] || toTest === require_Scope.sanitizeProp(require_executorUtils.syncDone((d) => exec(ticks, caseItem[1], scope, context, d, void 0, internal, generatorYield)).result, context))) {
				if (!caseItem[2]) continue;
				res = require_executorUtils.executeTree(ticks, context, caseItem[2], [scope], switchTargets, internal, generatorYield);
				if (res.controlFlow) {
					if (!require_executorUtils.matchesControlFlowTarget(res.controlFlow, switchTarget)) {
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
				if (isTrue || (isTrue = !caseItem[1] || toTest === require_Scope.sanitizeProp((ad = require_executorUtils.asyncDone((d) => exec(ticks, caseItem[1], scope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result, context))) {
					if (!caseItem[2]) continue;
					res = await require_executorUtils.executeTreeAsync(ticks, context, caseItem[2], [scope], switchTargets, internal, generatorYield);
					if (res.controlFlow) {
						if (!require_executorUtils.matchesControlFlowTarget(res.controlFlow, switchTarget)) {
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
require_opsRegistry.addOps(require_types.LispType.Try, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const [exception, catchBody, finallyBody] = b;
	require_executorUtils.executeTreeWithDone(exec, (...tryArgs) => {
		const tryHadError = tryArgs.length === 1;
		const tryError = tryHadError ? tryArgs[0] : void 0;
		const tryResult = !tryHadError && tryArgs.length > 1 ? tryArgs[1] : void 0;
		const executeFinallyAndComplete = (hadError, errorOrResult) => {
			if (finallyBody && finallyBody.length > 0) require_executorUtils.executeTreeWithDone(exec, (...finallyArgs) => {
				const finallyHadError = finallyArgs.length === 1;
				const finallyResult = !finallyHadError && finallyArgs.length > 1 ? finallyArgs[1] : void 0;
				if (finallyHadError) {
					done(finallyArgs[0]);
					return;
				}
				if (finallyResult instanceof require_executorUtils.ExecReturn && (finallyResult.returned || finallyResult.breakLoop || finallyResult.continueLoop)) {
					done(void 0, finallyResult);
					return;
				}
				if (hadError) done(errorOrResult);
				else if (errorOrResult instanceof require_executorUtils.ExecReturn) if (errorOrResult.returned || errorOrResult.breakLoop || errorOrResult.continueLoop) done(void 0, errorOrResult);
				else done();
				else done();
			}, ticks, context, finallyBody, [new require_Scope.Scope(scope, {})], statementLabels, internal, generatorYield);
			else if (hadError) done(errorOrResult);
			else if (errorOrResult instanceof require_executorUtils.ExecReturn) if (errorOrResult.returned || errorOrResult.breakLoop || errorOrResult.continueLoop) done(void 0, errorOrResult);
			else done();
			else done();
		};
		if (tryHadError && tryError instanceof require_errors.SandboxError) {
			done(tryError);
			return;
		}
		if (tryHadError && catchBody && catchBody.length > 0) {
			const sc = {};
			if (exception) sc[exception] = tryError;
			require_executorUtils.executeTreeWithDone(exec, (...catchArgs) => {
				const catchHadError = catchArgs.length === 1;
				executeFinallyAndComplete(catchHadError, catchHadError ? catchArgs[0] : catchArgs.length > 1 ? catchArgs[1] : void 0);
			}, ticks, context, catchBody, [new require_Scope.Scope(scope, sc)], statementLabels, internal, generatorYield);
		} else executeFinallyAndComplete(tryHadError, tryHadError ? tryError : tryResult);
	}, ticks, context, a, [new require_Scope.Scope(scope)], statementLabels, internal, generatorYield);
});
require_opsRegistry.addOps(require_types.LispType.Expression, ({ done, a }) => done(void 0, a.pop()));
//#endregion
