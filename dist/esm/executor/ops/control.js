import { SandboxError } from "../../utils/errors.js";
import { LispType } from "../../utils/types.js";
import { Scope, sanitizeProp } from "../../utils/Scope.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { ExecReturn, If, addControlFlowTarget, addControlFlowTargets, asyncDone, createLabeledStatementTarget, createLoopTarget, createSwitchTarget, execAsync, execSync, executeTree, executeTreeAsync, executeTreeWithDone, matchesControlFlowTarget, normalizeStatementLabel, normalizeStatementLabels, syncDone } from "../executorUtils.js";
//#region src/executor/ops/control.ts
addOps(LispType.Loop, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep, isForAwait, label] = a;
	const loopStatementTargets = [...normalizeStatementLabels(label).map((loopLabel) => createLoopTarget(loopLabel, false)), createLoopTarget()];
	const loopTargets = addControlFlowTargets(statementLabels, loopStatementTargets);
	if (isForAwait === LispType.True && exec !== execAsync) {
		done(/* @__PURE__ */ new SyntaxError("for-await-of loops are only allowed inside async functions"));
		return;
	}
	let loop = true;
	const loopScope = new Scope(scope, {});
	const internalVars = { $$obj: void 0 };
	const interalScope = new Scope(loopScope, internalVars);
	if (exec === execAsync) (async () => {
		let ad;
		ad = asyncDone((d) => exec(ticks, startStep, loopScope, context, d, void 0, internal, generatorYield));
		internalVars["$$obj"] = (ad = asyncDone((d) => exec(ticks, getIterator, loopScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		if (isForAwait === LispType.True) {
			const obj = internalVars["$$obj"];
			internalVars["$$obj"] = obj[Symbol.asyncIterator] ? obj[Symbol.asyncIterator]() : obj[Symbol.iterator] ? obj[Symbol.iterator]() : obj;
		}
		ad = asyncDone((d) => exec(ticks, startInternal, interalScope, context, d, void 0, internal, generatorYield));
		if (isForAwait === LispType.True) internalVars["$$next"] = await internalVars["$$next"];
		if (checkFirst) loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d, void 0, internal, generatorYield))).isInstant === true ? ad.instant : (await ad.p).result;
		while (loop) {
			const iterScope = new Scope(interalScope, {});
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
			if (isForAwait === LispType.True) internalVars["$$next"] = await internalVars["$$next"];
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
			const iterScope = new Scope(interalScope, {});
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
addOps(LispType.If, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
	exec(ticks, sanitizeProp(a, context) ? b.t : b.f, scope, context, done, statementLabels, internal, generatorYield);
});
addOps(LispType.InlineIf, ({ exec, done, ticks, a, b, context, scope, internal, generatorYield }) => {
	exec(ticks, sanitizeProp(a, context) ? b.t : b.f, scope, context, done, void 0, internal, generatorYield);
});
addOps(LispType.InlineIfCase, ({ done, a, b }) => done(void 0, new If(a, b)));
addOps(LispType.IfCase, ({ done, a, b }) => done(void 0, new If(a, b)));
addOps(LispType.Labeled, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
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
addOps(LispType.Switch, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
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
addOps(LispType.Try, ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
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
			}, ticks, context, finallyBody, [new Scope(scope, {})], statementLabels, internal, generatorYield);
			else if (hadError) done(errorOrResult);
			else if (errorOrResult instanceof ExecReturn) if (errorOrResult.returned || errorOrResult.breakLoop || errorOrResult.continueLoop) done(void 0, errorOrResult);
			else done();
			else done();
		};
		if (tryHadError && tryError instanceof SandboxError) {
			done(tryError);
			return;
		}
		if (tryHadError && catchBody && catchBody.length > 0) {
			const sc = {};
			if (exception) sc[exception] = tryError;
			executeTreeWithDone(exec, (...catchArgs) => {
				const catchHadError = catchArgs.length === 1;
				executeFinallyAndComplete(catchHadError, catchHadError ? catchArgs[0] : catchArgs.length > 1 ? catchArgs[1] : void 0);
			}, ticks, context, catchBody, [new Scope(scope, sc)], statementLabels, internal, generatorYield);
		} else executeFinallyAndComplete(tryHadError, tryHadError ? tryError : tryResult);
	}, ticks, context, a, [new Scope(scope)], statementLabels, internal, generatorYield);
});
addOps(LispType.Expression, ({ done, a }) => done(void 0, a.pop()));
//#endregion

//# sourceMappingURL=control.js.map