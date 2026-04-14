import {
  addOps,
  execAsync,
  execSync,
  asyncDone,
  executeTreeWithDone,
  normalizeStatementLabels,
  addControlFlowTargets,
  createLoopTarget,
  createSwitchTarget,
  createLabeledStatementTarget,
  matchesControlFlowTarget,
  If,
  ExecReturn,
  executeTreeAsync,
  syncDone,
  executeTree,
  normalizeStatementLabel,
  addControlFlowTarget,
} from '../executorUtils';
import type { AsyncDoneRet } from '../executorUtils';
import type { Lisp, LispItem, StatementLabel, SwitchCase } from '../../parser';
import { LispType, Scope, SandboxError, SandboxHaltError, sanitizeProp } from '../../utils';

addOps<Lisp[], Lisp[]>(
  LispType.Loop,
  ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
    const [
      checkFirst,
      startInternal,
      getIterator,
      startStep,
      step,
      condition,
      beforeStep,
      isForAwait,
      label,
    ] = a;
    const loopStatementTargets = [
      ...normalizeStatementLabels(label).map((loopLabel) => createLoopTarget(loopLabel, false)),
      createLoopTarget(),
    ];
    const loopTargets = addControlFlowTargets(statementLabels, loopStatementTargets);
    if ((isForAwait as unknown as LispType) === LispType.True && exec !== execAsync) {
      done(new SyntaxError('for-await-of loops are only allowed inside async functions'));
      return;
    }
    let loop = true;
    const loopScope = new Scope(scope, {});
    const internalVars: Record<string, unknown> = {
      $$obj: undefined,
    };
    const interalScope = new Scope(loopScope, internalVars);
    if (exec === execAsync) {
      (async () => {
        let ad: AsyncDoneRet;
        ad = asyncDone((d) =>
          exec(ticks, startStep, loopScope, context, d, undefined, internal, generatorYield),
        );
        internalVars['$$obj'] =
          (ad = asyncDone((d) =>
            exec(ticks, getIterator, loopScope, context, d, undefined, internal, generatorYield),
          )).isInstant === true
            ? ad.instant
            : (await ad.p).result;
        // for-await-of: override $$obj with the correct async iterator
        if ((isForAwait as unknown as LispType) === LispType.True) {
          const obj = internalVars['$$obj'] as any;
          internalVars['$$obj'] = obj[Symbol.asyncIterator]
            ? obj[Symbol.asyncIterator]()
            : obj[Symbol.iterator]
              ? obj[Symbol.iterator]()
              : obj;
        }
        ad = asyncDone((d) =>
          exec(ticks, startInternal, interalScope, context, d, undefined, internal, generatorYield),
        );
        // for-await-of: await the $$next promise after startInternal sets it
        if ((isForAwait as unknown as LispType) === LispType.True) {
          internalVars['$$next'] = await internalVars['$$next'];
        }
        if (checkFirst)
          loop =
            (ad = asyncDone((d) =>
              exec(ticks, condition, interalScope, context, d, undefined, internal, generatorYield),
            )).isInstant === true
              ? ad.instant
              : (await ad.p).result;
        while (loop) {
          const innerLoopVars = {};
          const iterScope = new Scope(interalScope, innerLoopVars);
          ad = asyncDone((d) =>
            exec(ticks, beforeStep, iterScope, context, d, undefined, internal, generatorYield),
          );
          ad.isInstant === true ? ad.instant : (await ad.p).result;
          const res = await executeTreeAsync(
            ticks,
            context,
            b,
            [iterScope],
            loopTargets,
            internal,
            generatorYield,
          );
          if (res instanceof ExecReturn && res.returned) {
            done(undefined, res);
            return;
          }
          if (res instanceof ExecReturn && res.controlFlow) {
            if (
              !loopStatementTargets.some((target) =>
                matchesControlFlowTarget(res.controlFlow!, target),
              )
            ) {
              done(undefined, res);
              return;
            }
            if (res.breakLoop) {
              break;
            }
          }
          ad = asyncDone((d) =>
            exec(ticks, step, interalScope, context, d, undefined, internal, generatorYield),
          );
          // for-await-of: await the $$next promise after step updates it
          if ((isForAwait as unknown as LispType) === LispType.True) {
            internalVars['$$next'] = await internalVars['$$next'];
          }
          loop =
            (ad = asyncDone((d) =>
              exec(ticks, condition, interalScope, context, d, undefined, internal, generatorYield),
            )).isInstant === true
              ? ad.instant
              : (await ad.p).result;
        }
        done();
      })().catch(done);
    } else {
      syncDone((d) =>
        exec(ticks, startStep, loopScope, context, d, undefined, internal, generatorYield),
      );
      internalVars['$$obj'] = syncDone((d) =>
        exec(ticks, getIterator, loopScope, context, d, undefined, internal, generatorYield),
      ).result;
      syncDone((d) =>
        exec(ticks, startInternal, interalScope, context, d, undefined, internal, generatorYield),
      );
      if (checkFirst)
        loop = syncDone((d) =>
          exec(ticks, condition, interalScope, context, d, undefined, internal, generatorYield),
        ).result;
      while (loop) {
        const innerLoopVars = {};
        const iterScope = new Scope(interalScope, innerLoopVars);
        syncDone((d) =>
          exec(ticks, beforeStep, iterScope, context, d, undefined, internal, generatorYield),
        );
        const res = executeTree(
          ticks,
          context,
          b,
          [iterScope],
          loopTargets,
          internal,
          generatorYield,
        );
        if (res instanceof ExecReturn && res.returned) {
          done(undefined, res);
          return;
        }
        if (res instanceof ExecReturn && res.controlFlow) {
          if (
            !loopStatementTargets.some((target) =>
              matchesControlFlowTarget(res.controlFlow!, target),
            )
          ) {
            done(undefined, res);
            return;
          }
          if (res.breakLoop) {
            break;
          }
        }
        syncDone((d) =>
          exec(ticks, step, interalScope, context, d, undefined, internal, generatorYield),
        );
        loop = syncDone((d) =>
          exec(ticks, condition, interalScope, context, d, undefined, internal, generatorYield),
        ).result;
      }
      done();
    }
  },
);

addOps<LispItem, If>(
  LispType.If,
  ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
    exec(
      ticks,
      sanitizeProp(a, context) ? b.t : b.f,
      scope,
      context,
      done,
      statementLabels,
      internal,
      generatorYield,
    );
  },
);

addOps<LispItem, If>(
  LispType.InlineIf,
  ({ exec, done, ticks, a, b, context, scope, internal, generatorYield }) => {
    exec(
      ticks,
      sanitizeProp(a, context) ? b.t : b.f,
      scope,
      context,
      done,
      undefined,
      internal,
      generatorYield,
    );
  },
);

addOps<Lisp, Lisp>(LispType.InlineIfCase, ({ done, a, b }) => done(undefined, new If(a, b)));

addOps<Lisp, Lisp>(LispType.IfCase, ({ done, a, b }) => done(undefined, new If(a, b)));

addOps<StatementLabel, Lisp>(
  LispType.Labeled,
  ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
    const target = createLabeledStatementTarget(normalizeStatementLabel(a));
    exec(
      ticks,
      b,
      scope,
      context,
      (...args: unknown[]) => {
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
        done(undefined, res as any);
      },
      addControlFlowTarget(statementLabels, target),
      internal,
      generatorYield,
    );
  },
);

addOps<LispItem, SwitchCase[]>(
  LispType.Switch,
  ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
    const switchTarget = createSwitchTarget();
    const switchTargets = addControlFlowTarget(statementLabels, switchTarget);
    exec(
      ticks,
      a,
      scope,
      context,
      (...args: unknown[]) => {
        if (args.length === 1) {
          done(args[0]);
          return;
        }
        let toTest = args[1];
        toTest = sanitizeProp(toTest, context);
        if (exec === execSync) {
          let res: ExecReturn<unknown>;
          let isTrue = false;
          for (const caseItem of b) {
            if (
              isTrue ||
              (isTrue =
                !caseItem[1] ||
                toTest ===
                  sanitizeProp(
                    syncDone((d) =>
                      exec(
                        ticks,
                        caseItem[1],
                        scope,
                        context,
                        d,
                        undefined,
                        internal,
                        generatorYield,
                      ),
                    ).result,
                    context,
                  ))
            ) {
              if (!caseItem[2]) continue;
              res = executeTree(
                ticks,
                context,
                caseItem[2],
                [scope],
                switchTargets,
                internal,
                generatorYield,
              );
              if (res.controlFlow) {
                if (!matchesControlFlowTarget(res.controlFlow, switchTarget)) {
                  done(undefined, res);
                  return;
                }
                if (res.breakLoop) break;
              }
              if (res.returned) {
                done(undefined, res);
                return;
              }
              if (!caseItem[1]) {
                // default case
                break;
              }
            }
          }
          done();
        } else {
          (async () => {
            let res: ExecReturn<unknown>;
            let isTrue = false;
            for (const caseItem of b) {
              let ad: AsyncDoneRet;
              if (
                isTrue ||
                (isTrue =
                  !caseItem[1] ||
                  toTest ===
                    sanitizeProp(
                      (ad = asyncDone((d) =>
                        exec(
                          ticks,
                          caseItem[1],
                          scope,
                          context,
                          d,
                          undefined,
                          internal,
                          generatorYield,
                        ),
                      )).isInstant === true
                        ? ad.instant
                        : (await ad.p).result,
                      context,
                    ))
              ) {
                if (!caseItem[2]) continue;
                res = await executeTreeAsync(
                  ticks,
                  context,
                  caseItem[2],
                  [scope],
                  switchTargets,
                  internal,
                  generatorYield,
                );
                if (res.controlFlow) {
                  if (!matchesControlFlowTarget(res.controlFlow, switchTarget)) {
                    done(undefined, res);
                    return;
                  }
                  if (res.breakLoop) break;
                }
                if (res.returned) {
                  done(undefined, res);
                  return;
                }
                if (!caseItem[1]) {
                  // default case
                  break;
                }
              }
            }
            done();
          })().catch(done);
        }
      },
      undefined,
      internal,
      generatorYield,
    );
  },
);

addOps<Lisp[], [string, Lisp[], Lisp[]]>(
  LispType.Try,
  ({ exec, done, ticks, a, b, context, scope, statementLabels, internal, generatorYield }) => {
    const [exception, catchBody, finallyBody] = b;

    // Execute try block
    executeTreeWithDone(
      exec,
      (...tryArgs: unknown[]) => {
        const tryHadError = tryArgs.length === 1;
        const tryError = tryHadError ? tryArgs[0] : undefined;
        const tryResult = !tryHadError && tryArgs.length > 1 ? tryArgs[1] : undefined;

        // Handler to execute finally and complete
        const executeFinallyAndComplete = (hadError: boolean, errorOrResult: unknown) => {
          if (finallyBody && finallyBody.length > 0) {
            // Execute finally block
            executeTreeWithDone(
              exec,
              (...finallyArgs: unknown[]) => {
                const finallyHadError = finallyArgs.length === 1;
                const finallyResult =
                  !finallyHadError && finallyArgs.length > 1 ? finallyArgs[1] : undefined;

                // If finally throws an error, it overrides everything
                if (finallyHadError) {
                  done(finallyArgs[0]);
                  return;
                }

                // If finally has a control flow statement (return/break/continue), it overrides everything
                if (
                  finallyResult instanceof ExecReturn &&
                  (finallyResult.returned || finallyResult.breakLoop || finallyResult.continueLoop)
                ) {
                  done(undefined, finallyResult);
                  return;
                }

                // Otherwise, return the original try/catch result/error
                if (hadError) {
                  done(errorOrResult);
                } else if (errorOrResult instanceof ExecReturn) {
                  // If try/catch returned or has some other control flow, pass that through
                  if (
                    errorOrResult.returned ||
                    errorOrResult.breakLoop ||
                    errorOrResult.continueLoop
                  ) {
                    done(undefined, errorOrResult);
                  } else {
                    // Normal completion - don't return a value
                    done();
                  }
                } else {
                  // Try/catch completed normally, just signal completion with no return value
                  done();
                }
              },
              ticks,
              context,
              finallyBody,
              [new Scope(scope, {})],
              statementLabels,
              internal,
              generatorYield,
            );
          } else {
            // No finally block, just return result/error
            if (hadError) {
              done(errorOrResult);
            } else if (errorOrResult instanceof ExecReturn) {
              // If try/catch returned or has some other control flow, pass that through
              if (errorOrResult.returned || errorOrResult.breakLoop || errorOrResult.continueLoop) {
                done(undefined, errorOrResult);
              } else {
                // Normal completion - don't return a value
                done();
              }
            } else {
              done();
            }
          }
        };

        // SandboxErrors bypass both catch and finally — propagate immediately.
        if (tryHadError && tryError instanceof SandboxError) {
          done(tryError);
          return;
        }

        // If try had an error and there's a catch block, execute catch.
        if (tryHadError && catchBody && catchBody.length > 0) {
          const sc: Record<string, unknown> = {};
          if (exception) sc[exception] = tryError;

          executeTreeWithDone(
            exec,
            (...catchArgs: unknown[]) => {
              const catchHadError = catchArgs.length === 1;
              const catchErrorOrResult = catchHadError
                ? catchArgs[0]
                : catchArgs.length > 1
                  ? catchArgs[1]
                  : undefined;

              // Execute finally with catch result
              executeFinallyAndComplete(catchHadError, catchErrorOrResult);
            },
            ticks,
            context,
            catchBody,
            [new Scope(scope, sc)],
            statementLabels,
            internal,
            generatorYield,
          );
        } else {
          // No catch or no error, execute finally with try result
          executeFinallyAndComplete(tryHadError, tryHadError ? tryError : tryResult);
        }
      },
      ticks,
      context,
      a,
      [new Scope(scope)],
      statementLabels,
      internal,
      generatorYield,
    );
  },
);

addOps<unknown[]>(LispType.Expression, ({ done, a }) => done(undefined, a.pop()));
