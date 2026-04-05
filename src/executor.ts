import { LispItem, Lisp, IRegEx, StatementLabel, SwitchCase } from './parser.js';
import {
  CodeString,
  hasOwnProperty,
  IAuditReport,
  IExecContext,
  IScope,
  isLisp,
  LispType,
  LocalScope,
  Prop,
  SandboxExecutionQuotaExceededError,
  SandboxError,
  SandboxExecutionTreeError,
  Scope,
  Ticks,
  VarType,
  GeneratorFunction,
  AsyncGeneratorFunction,
  SandboxCapabilityError,
  SandboxAccessError,
} from './utils.js';

export type Done<T = any> = (err?: any, res?: T | typeof optional) => void;

export type ControlFlowAction = 'break' | 'continue';

export interface ControlFlowSignal {
  type: ControlFlowAction;
  label?: string;
}

interface ControlFlowTarget {
  label?: string;
  acceptsBreak: boolean;
  acceptsContinue: boolean;
  acceptsUnlabeledBreak: boolean;
  acceptsUnlabeledContinue: boolean;
}

export type ControlFlowTargets = readonly ControlFlowTarget[] | undefined;

export class ExecReturn<T> {
  constructor(
    public auditReport: IAuditReport | undefined,
    public result: T,
    public returned: boolean,
    public controlFlow?: ControlFlowSignal,
  ) {}

  get breakLoop() {
    return this.controlFlow?.type === 'break';
  }

  get continueLoop() {
    return this.controlFlow?.type === 'continue';
  }
}

export type Unknown = undefined | null | Record<string | number, unknown>;

export interface IChange {
  type: string;
}

export interface ICreate extends IChange {
  type: 'create';
  prop: number | string;
}

export interface IReplace extends IChange {
  type: 'replace';
}

export interface IDelete extends IChange {
  type: 'delete';
  prop: number | string;
}

export interface IReverse extends IChange {
  type: 'reverse';
}

export interface ISort extends IChange {
  type: 'sort';
}

export interface IPush extends IChange {
  type: 'push';
  added: unknown[];
}

export interface IPop extends IChange {
  type: 'pop';
  removed: unknown[];
}

export interface IShift extends IChange {
  type: 'shift';
  removed: unknown[];
}

export interface IUnShift extends IChange {
  type: 'unshift';
  added: unknown[];
}

export interface ISplice extends IChange {
  type: 'splice';
  startIndex: number;
  deleteCount: number;
  added: unknown[];
  removed: unknown[];
}

export interface ICopyWithin extends IChange {
  type: 'copyWithin';
  startIndex: number;
  endIndex: number;
  added: unknown[];
  removed: unknown[];
}

export type Change =
  | ICreate
  | IReplace
  | IDelete
  | IReverse
  | ISort
  | IPush
  | IPop
  | IUnShift
  | IShift
  | ISplice
  | ICopyWithin;

const optional = {};
const emptyControlFlowTargets: readonly ControlFlowTarget[] = [];

function normalizeStatementLabel(label: StatementLabel | undefined) {
  return label === undefined || label === LispType.None ? undefined : label;
}

function normalizeStatementLabels(label: LispItem | StatementLabel | undefined) {
  if (label === undefined || label === LispType.None) return [] as string[];
  if (Array.isArray(label) && !isLisp(label)) {
    return label.filter((item): item is string => typeof item === 'string');
  }
  return [label as string];
}

function createLoopTarget(label?: string, acceptsUnlabeled = true): ControlFlowTarget {
  return {
    label,
    acceptsBreak: true,
    acceptsContinue: true,
    acceptsUnlabeledBreak: acceptsUnlabeled,
    acceptsUnlabeledContinue: acceptsUnlabeled,
  };
}

function createSwitchTarget(label?: string): ControlFlowTarget {
  return {
    label,
    acceptsBreak: true,
    acceptsContinue: false,
    acceptsUnlabeledBreak: true,
    acceptsUnlabeledContinue: false,
  };
}

function createLabeledStatementTarget(label?: string): ControlFlowTarget | undefined {
  if (!label) return undefined;
  return {
    label,
    acceptsBreak: true,
    acceptsContinue: false,
    acceptsUnlabeledBreak: false,
    acceptsUnlabeledContinue: false,
  };
}

function addControlFlowTarget(
  controlFlowTargets: ControlFlowTargets,
  target?: ControlFlowTarget,
): ControlFlowTargets {
  if (!target) return controlFlowTargets;
  return [...(controlFlowTargets || emptyControlFlowTargets), target];
}

function addControlFlowTargets(
  controlFlowTargets: ControlFlowTargets,
  targets: ControlFlowTarget[],
): ControlFlowTargets {
  return targets.reduce(
    (currentTargets, target) => addControlFlowTarget(currentTargets, target),
    controlFlowTargets,
  );
}

function matchesControlFlowTarget(signal: ControlFlowSignal, target: ControlFlowTarget) {
  if (signal.type === 'continue') {
    if (!target.acceptsContinue) return false;
    return signal.label ? target.label === signal.label : target.acceptsUnlabeledContinue;
  }
  if (!target.acceptsBreak) return false;
  return signal.label ? target.label === signal.label : target.acceptsUnlabeledBreak;
}

function findControlFlowTarget(
  controlFlowTargets: ControlFlowTargets,
  type: ControlFlowAction,
  label?: string,
) {
  if (!controlFlowTargets) return undefined;
  for (let i = controlFlowTargets.length - 1; i >= 0; i--) {
    const target = controlFlowTargets[i];
    if (label) {
      if (target.label !== label) continue;
      if (type === 'continue' ? target.acceptsContinue : target.acceptsBreak) {
        return target;
      }
      return null;
    }
    if (type === 'continue' ? target.acceptsUnlabeledContinue : target.acceptsUnlabeledBreak) {
      return target;
    }
  }
  return undefined;
}

function generateArgs(argNames: string[], args: unknown[]) {
  const vars: Record<string, unknown> = {};
  argNames.forEach((arg, i) => {
    if (arg.startsWith('...')) {
      vars[arg.substring(3)] = args.slice(i);
    } else {
      vars[arg] = args[i];
    }
  });
  return vars;
}

export function createFunction(
  argNames: string[],
  parsed: Lisp[],
  ticks: Ticks,
  context: IExecContext,
  scope?: Scope,
  name?: string,
  internal = false,
) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxCapabilityError('Function creation is forbidden');
  }
  let func;
  if (name === undefined) {
    func = (...args: unknown[]) => {
      const vars = generateArgs(argNames, args);
      const res = executeTree(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars)],
        undefined,
        internal,
      );
      return res.result;
    };
  } else {
    func = function sandboxedObject(this: Unknown, ...args: unknown[]) {
      const vars = generateArgs(argNames, args);
      const res = executeTree(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars, this)],
        undefined,
        internal,
      );
      return res.result;
    };
  }
  context.registerSandboxFunction(func);
  context.ctx.sandboxedFunctions.add(func);
  return func;
}

export function createFunctionAsync(
  argNames: string[],
  parsed: Lisp[],
  ticks: Ticks,
  context: IExecContext,
  scope?: Scope,
  name?: string,
  internal = false,
) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxCapabilityError('Function creation is forbidden');
  }
  if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
    throw new SandboxCapabilityError('Async/await not permitted');
  }
  let func;
  if (name === undefined) {
    func = async (...args: unknown[]) => {
      const vars = generateArgs(argNames, args);
      const res = await executeTreeAsync(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars)],
        undefined,
        internal,
      );
      return res.result;
    };
  } else {
    func = async function sandboxedObject(this: Unknown, ...args: unknown[]) {
      const vars = generateArgs(argNames, args);
      const res = await executeTreeAsync(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars, this)],
        undefined,
        internal,
      );
      return res.result;
    };
  }
  context.registerSandboxFunction(func);
  context.ctx.sandboxedFunctions.add(func);
  return func;
}

// Sentinel class used to communicate yield values from the executor back to the generator.
export class YieldValue {
  constructor(
    public value: unknown,
    public delegate: boolean,
  ) {}
}

// Unique sentinel thrown by captureYieldFn in executeGenBody's default case when a new
// synchronous yield is encountered. Propagates through the call stack back to the restart loop.
const syncYieldPauseSentinel = Symbol('syncYieldPause');

function asIterableIterator(value: unknown): Iterator<unknown> & Iterable<unknown> {
  const iterator =
    (value as { [Symbol.iterator]?: () => Iterator<unknown> })?.[Symbol.iterator]?.() ??
    (value as Iterator<unknown>);

  if (!iterator || typeof iterator.next !== 'function') {
    throw new TypeError('yield* target is not iterable');
  }

  if (typeof (iterator as Iterator<unknown> & Iterable<unknown>)[Symbol.iterator] === 'function') {
    return iterator as Iterator<unknown> & Iterable<unknown>;
  }

  return {
    next: iterator.next.bind(iterator),
    throw: iterator.throw?.bind(iterator),
    return: iterator.return?.bind(iterator),
    [Symbol.iterator]() {
      return this;
    },
  };
}

function asAsyncIterableIterator(value: unknown): AsyncIterator<unknown> & AsyncIterable<unknown> {
  const asyncIterator = (value as { [Symbol.asyncIterator]?: () => AsyncIterator<unknown> })?.[
    Symbol.asyncIterator
  ]?.();

  if (asyncIterator) {
    return {
      next: asyncIterator.next.bind(asyncIterator),
      throw: asyncIterator.throw?.bind(asyncIterator),
      return: asyncIterator.return?.bind(asyncIterator),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  const iterator = asIterableIterator(value);
  return {
    async next(nextValue?: unknown) {
      return iterator.next(nextValue);
    },
    async throw(err?: unknown) {
      if (typeof iterator.throw === 'function') {
        return iterator.throw(err);
      }
      throw err;
    },
    async return(valueToReturn?: unknown) {
      if (typeof iterator.return === 'function') {
        return iterator.return(valueToReturn);
      }
      return { value: valueToReturn, done: true };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

// executeGenBody: a native generator that lazily executes a generator function body.
// It handles compound control-flow nodes (statements, if, loop, try, yield) with yield*
// recursion, and falls back to the existing execSync for all leaf expressions.
// Only used by createGeneratorFunction — nothing else in the executor is changed.
function* executeGenBody(
  ticks: Ticks,
  tree: Lisp | Lisp[],
  scope: Scope,
  context: IExecContext,
  statementLabels: ControlFlowTargets,
  internal: boolean,
): Generator<unknown, ExecReturn<unknown> | unknown, unknown> {
  // ── Statement list ──────────────────────────────────────────────────────────
  if (!isLisp(tree as Lisp) && Array.isArray(tree)) {
    const stmts = tree as Lisp[];
    if (stmts.length === 0 || (stmts[0] as unknown) === LispType.None) {
      return new ExecReturn(context.ctx.auditReport, undefined, false);
    }
    for (const stmt of stmts) {
      const res = (yield* executeGenBody(
        ticks,
        stmt,
        scope,
        context,
        statementLabels,
        internal,
      )) as ExecReturn<unknown>;
      if (res instanceof ExecReturn && (res.returned || res.controlFlow)) return res;
      // Mirror _executeWithDoneSync: wrap the result of a return statement
      if (isLisp(stmt) && (stmt as Lisp)[0] === LispType.Return) {
        return new ExecReturn(context.ctx.auditReport, res.result, true);
      }
    }
    return new ExecReturn(context.ctx.auditReport, undefined, false);
  }

  const [op, a, b] = tree as Lisp;

  switch (op) {
    // ── yield expr ────────────────────────────────────────────────────────────
    case LispType.Yield: {
      const valResult = (yield* executeGenBody(
        ticks,
        a as Lisp,
        scope,
        context,
        statementLabels,
        internal,
      )) as ExecReturn<unknown>;
      const sanitized = sanitizeProp(valResult.result, context);
      const injected: unknown = yield sanitized; // ← real pause point
      return new ExecReturn(context.ctx.auditReport, injected, false);
    }

    // ── yield* expr ───────────────────────────────────────────────────────────
    case LispType.YieldDelegate: {
      const iterResult = (yield* executeGenBody(
        ticks,
        a as Lisp,
        scope,
        context,
        statementLabels,
        internal,
      )) as ExecReturn<unknown>;
      const delegatee = sanitizeProp(iterResult.result, context);
      const result: unknown = yield* asIterableIterator(delegatee);
      return new ExecReturn(context.ctx.auditReport, result, false);
    }

    // ── if / else ─────────────────────────────────────────────────────────────
    // LispType.If is NOT in unexecTypes — its `a` is the raw condition Lisp,
    // `b` is the raw IfCase node that evaluates to an If object with .t/.f.
    case LispType.If: {
      const condResult = (yield* executeGenBody(
        ticks,
        a as Lisp,
        scope,
        context,
        statementLabels,
        internal,
      )) as ExecReturn<unknown>;
      const ifCase = syncDone((d) =>
        execSync(ticks, b as Lisp, scope, context, d, statementLabels, internal, undefined),
      ).result as If;
      const branch = sanitizeProp(condResult.result, context) ? ifCase.t : ifCase.f;
      if (branch) {
        return (yield* executeGenBody(
          ticks,
          branch,
          scope,
          context,
          statementLabels,
          internal,
        )) as ExecReturn<unknown>;
      }
      return new ExecReturn(context.ctx.auditReport, undefined, false);
    }

    // ── loops (while / for / for-of / for-in / do-while) ─────────────────────
    // Mirror the sync path of the existing Loop handler (executor.ts ~1421-1475)
    // but replace `executeTree(b, ...)` with `yield*`.
    case LispType.Loop: {
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
      ] = a as Lisp[];
      if ((isForAwait as unknown as LispType) === LispType.True) {
        throw new SyntaxError('for-await-of loops are only allowed inside async functions');
      }
      const loopStatementTargets = [
        ...normalizeStatementLabels(label).map((loopLabel) => createLoopTarget(loopLabel, false)),
        createLoopTarget(),
      ];
      const loopTargets = addControlFlowTargets(statementLabels, loopStatementTargets);
      const loopScope = new Scope(scope, {});
      const internalVars: Record<string, unknown> = { $$obj: undefined };
      const interalScope = new Scope(loopScope, internalVars);

      syncDone((d) =>
        execSync(ticks, startStep, loopScope, context, d, undefined, internal, undefined),
      );
      internalVars['$$obj'] = syncDone((d) =>
        execSync(ticks, getIterator, loopScope, context, d, undefined, internal, undefined),
      ).result;
      syncDone((d) =>
        execSync(ticks, startInternal, interalScope, context, d, undefined, internal, undefined),
      );

      let loop: unknown = true;
      if (checkFirst) {
        loop = syncDone((d) =>
          execSync(ticks, condition, interalScope, context, d, undefined, internal, undefined),
        ).result;
      }

      while (loop) {
        const iterScope = new Scope(interalScope, {});
        syncDone((d) =>
          execSync(ticks, beforeStep, iterScope, context, d, undefined, internal, undefined),
        );

        const res = (yield* executeGenBody(
          ticks,
          b as Lisp[],
          iterScope,
          context,
          loopTargets,
          internal,
        )) as ExecReturn<unknown>;

        if (res.returned) return res;
        if (res.controlFlow) {
          if (!loopStatementTargets.some((t) => matchesControlFlowTarget(res.controlFlow!, t))) {
            return res; // break/continue targeting an outer labeled loop
          }
          if (res.breakLoop) break;
          // continueLoop: fall through to step + condition check
        }
        syncDone((d) =>
          execSync(ticks, step, interalScope, context, d, undefined, internal, undefined),
        );
        loop = syncDone((d) =>
          execSync(ticks, condition, interalScope, context, d, undefined, internal, undefined),
        ).result;
      }
      return new ExecReturn(context.ctx.auditReport, undefined, false);
    }

    // ── try / catch / finally ─────────────────────────────────────────────────
    // Using real native try/catch/finally gives us correct gen.throw() and
    // gen.return() semantics for free (the native generator machinery handles them).
    case LispType.Try: {
      const [exception, catchBody, finallyBody] = b as [string, Lisp[], Lisp[]];
      let result!: ExecReturn<unknown>;
      let finalOverride: ExecReturn<unknown> | undefined;
      try {
        result = (yield* executeGenBody(
          ticks,
          a as Lisp[],
          scope,
          context,
          statementLabels,
          internal,
        )) as ExecReturn<unknown>;
      } catch (e) {
        if (exception && catchBody?.length > 0) {
          const catchScope = new Scope(scope, { [exception]: e });
          result = (yield* executeGenBody(
            ticks,
            catchBody,
            catchScope,
            context,
            statementLabels,
            internal,
          )) as ExecReturn<unknown>;
        } else {
          throw e;
        }
      } finally {
        if (finallyBody?.length > 0) {
          const fr = (yield* executeGenBody(
            ticks,
            finallyBody,
            scope,
            context,
            statementLabels,
            internal,
          )) as ExecReturn<unknown>;
          // finally control flow (return/break/continue) overrides everything
          if (fr.returned || fr.controlFlow) {
            finalOverride = fr;
          }
        }
      }
      if (finalOverride) return finalOverride;
      return result;
    }

    // ── labeled statement ─────────────────────────────────────────────────────
    case LispType.Labeled: {
      const target = createLabeledStatementTarget(normalizeStatementLabel(a as StatementLabel));
      const newTargets = addControlFlowTargets(statementLabels, target ? [target] : []);
      const res = (yield* executeGenBody(
        ticks,
        b as Lisp,
        scope,
        context,
        newTargets,
        internal,
      )) as ExecReturn<unknown>;
      if (res.controlFlow && target && matchesControlFlowTarget(res.controlFlow, target)) {
        return new ExecReturn(context.ctx.auditReport, res.result, false);
      }
      return res;
    }

    // ── everything else ───────────────────────────────────────────────────────
    // Arithmetic, property access, function calls, assignments, etc. are
    // delegated to execSync. However, a yield expression may be nested inside
    // a non-unexecType node (e.g. `const x = yield 1`). In that case the
    // existing sync yield handler throws syncYieldPauseSentinel. We restart
    // execSync from scratch on each such pause, skipping already-completed
    // yields by immediately calling their continuation with the stored result.
    default: {
      let completedYields = 0;
      const yieldResults: unknown[] = [];
      while (true) {
        let currentYieldIdx = 0;
        let capturedValue: unknown = undefined;
        let capturedDelegate = false;
        let yielded = false;
        const captureYieldFn = (yv: YieldValue, continueDone?: Done) => {
          if (currentYieldIdx < completedYields) {
            // This yield already happened in a prior iteration; fast-forward.
            continueDone!(undefined, yieldResults[currentYieldIdx]);
            currentYieldIdx++;
            return;
          }
          // New yield: capture the value and pause.
          capturedValue = yv.value;
          capturedDelegate = yv.delegate;
          yielded = true;
          currentYieldIdx++;
          throw syncYieldPauseSentinel;
        };
        try {
          const result = syncDone((d) =>
            execSync(
              ticks,
              tree as Lisp,
              scope,
              context,
              d,
              statementLabels,
              internal,
              captureYieldFn,
            ),
          ).result;
          if (result instanceof ExecReturn) return result;
          return new ExecReturn(context.ctx.auditReport, result, false);
        } catch (e) {
          if (!yielded || e !== syncYieldPauseSentinel) throw e;
          const resumedValue: unknown = capturedDelegate
            ? yield* asIterableIterator(capturedValue)
            : yield capturedValue;
          yieldResults.push(resumedValue);
          completedYields++;
        }
      }
    }
  }
}

export function createGeneratorFunction(
  argNames: string[],
  parsed: Lisp[],
  ticks: Ticks,
  context: IExecContext,
  scope?: Scope,
  name?: string,
  internal = false,
) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxCapabilityError('Function creation is forbidden');
  }
  const makeGen = (thisArg: Unknown, args: unknown[]) => {
    const vars = generateArgs(argNames, args);
    const genScope =
      scope === undefined ? new Scope(null, vars, thisArg) : new Scope(scope, vars, thisArg);

    const executionGen = executeGenBody(ticks, parsed, genScope, context, undefined, internal);
    let isDone = false;

    function drive(action: () => IteratorResult<unknown>): IteratorResult<unknown> {
      if (isDone) return { value: undefined, done: true };
      try {
        const r = action();
        if (r.done) {
          isDone = true;
          return {
            value: r.value instanceof ExecReturn ? r.value.result : r.value,
            done: true,
          };
        }
        return { value: r.value, done: false };
      } catch (e) {
        isDone = true;
        throw e;
      }
    }

    const iterator: Iterator<unknown> & Iterable<unknown> = {
      next(value?: unknown) {
        return drive(() => executionGen.next(value));
      },
      return(value?: unknown) {
        return drive(() => executionGen.return(value));
      },
      throw(err?: unknown) {
        return drive(() => executionGen.throw(err));
      },
      [Symbol.iterator]() {
        return this;
      },
    };
    return iterator;
  };
  const func = function sandboxedObject(this: Unknown, ...args: unknown[]) {
    return makeGen(this, args);
  };
  Object.setPrototypeOf(func, GeneratorFunction.prototype);
  context.registerSandboxFunction(func);
  context.ctx.sandboxedFunctions.add(func);
  return func;
}

export function createAsyncGeneratorFunction(
  argNames: string[],
  parsed: Lisp[],
  ticks: Ticks,
  context: IExecContext,
  scope?: Scope,
  name?: string,
  internal = false,
) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxCapabilityError('Function creation is forbidden');
  }
  if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
    throw new SandboxCapabilityError('Async/await not permitted');
  }
  const makeGen = (thisArg: Unknown, args: unknown[]) => {
    const vars = generateArgs(argNames, args);
    const genScope =
      scope === undefined ? [new Scope(null, vars, thisArg)] : [new Scope(scope, vars, thisArg)];
    return (async function* sandboxedAsyncGenerator(): AsyncGenerator<unknown, unknown, unknown> {
      const yieldQueue: Array<{ yieldValue: YieldValue; continueDone?: Done }> = [];
      let resolveYield: (() => void) | null = null;
      const yieldFn = (yv: YieldValue, continueDone?: Done) => {
        yieldQueue.push({ yieldValue: yv, continueDone });
        if (resolveYield) {
          resolveYield();
          resolveYield = null;
        }
      };
      const bodyPromise = executeTreeAsync(
        ticks,
        context,
        parsed,
        genScope,
        undefined,
        internal,
        yieldFn,
      );
      let bodyDone = false;
      let bodyResult: ExecReturn<unknown> | undefined;
      let bodyError: unknown;
      bodyPromise.then(
        (r) => {
          bodyDone = true;
          bodyResult = r;
          resolveYield?.();
        },
        (e) => {
          bodyDone = true;
          bodyError = e;
          resolveYield?.();
        },
      );
      while (true) {
        if (yieldQueue.length === 0 && !bodyDone) {
          await new Promise<void>((res) => {
            resolveYield = res;
          });
        }
        while (yieldQueue.length > 0) {
          const { yieldValue, continueDone } = yieldQueue.shift()!;
          try {
            const resumedValue = yieldValue.delegate
              ? yield* asAsyncIterableIterator(yieldValue.value)
              : yield yieldValue.value;
            continueDone?.(undefined, resumedValue);
          } catch (err) {
            continueDone?.(err);
          }
        }
        if (bodyDone) break;
      }
      if (bodyError !== undefined) throw bodyError;
      return bodyResult?.result;
    })();
  };
  const func = function sandboxedObject(this: Unknown, ...args: unknown[]) {
    return makeGen(this, args) as unknown as AsyncGenerator;
  };
  Object.setPrototypeOf(func, AsyncGeneratorFunction.prototype);
  context.registerSandboxFunction(func);
  context.ctx.sandboxedFunctions.add(func);
  return func;
}

export function assignCheck(obj: Prop, context: IExecContext, op = 'assign') {
  if (obj.context === undefined) {
    throw new ReferenceError(`Cannot ${op} value to undefined.`);
  }
  if (obj.isConst) {
    throw new TypeError(`Assignment to constant variable.`);
  }
  if (obj.isGlobal) {
    throw new SandboxAccessError(
      `Cannot ${op} property '${obj.prop.toString()}' of a global object`,
    );
  }
  if (obj.context === null) {
    throw new TypeError('Cannot set properties of null');
  }
  if (
    typeof (obj.context as any)[obj.prop] === 'function' &&
    !hasOwnProperty(obj.context, obj.prop)
  ) {
    throw new SandboxAccessError(
      `Override prototype property '${obj.prop.toString()}' not allowed`,
    );
  }
  if (op === 'delete') {
    if (hasOwnProperty(obj.context, obj.prop)) {
      context.changeSubscriptions
        .get(obj.context)
        ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop.toString() }));
      context.changeSubscriptionsGlobal
        .get(obj.context)
        ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop.toString() }));
    }
  } else if (hasOwnProperty(obj.context, obj.prop)) {
    context.setSubscriptions
      .get(obj.context)
      ?.get(obj.prop.toString())
      ?.forEach((cb) =>
        cb({
          type: 'replace',
        }),
      );
    context.setSubscriptionsGlobal
      .get(obj.context)
      ?.get(obj.prop.toString())
      ?.forEach((cb) =>
        cb({
          type: 'replace',
        }),
      );
  } else {
    context.changeSubscriptions
      .get(obj.context)
      ?.forEach((cb) => cb({ type: 'create', prop: obj.prop.toString() }));
    context.changeSubscriptionsGlobal
      .get(obj.context)
      ?.forEach((cb) => cb({ type: 'create', prop: obj.prop.toString() }));
  }
}
const arrayChange = new Set([
  [].push,
  [].pop,
  [].shift,
  [].unshift,
  [].splice,
  [].reverse,
  [].sort,
  [].copyWithin,
]);

export class KeyVal {
  constructor(
    public key: string | SpreadObject,
    public val: unknown,
  ) {}
}

export class SpreadObject {
  constructor(public item: { [key: string]: unknown }) {}
}

export class SpreadArray {
  constructor(public item: unknown[]) {}
}

export class If {
  constructor(
    public t: Lisp,
    public f: Lisp,
    public label?: string,
  ) {}
}

const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
type OpCallback<a, b, obj, bobj> = (params: OpsCallbackParams<a, b, obj, bobj>) => void;

export const ops = new Map<LispType, OpCallback<any, any, any, any>>();
export function addOps<a = unknown, b = unknown, obj = unknown, bobj = unknown>(
  type: LispType,
  cb: OpCallback<a, b, obj, bobj>,
) {
  ops.set(type, cb);
}

const prorptyKeyTypes = ['string', 'number', 'symbol'];

function isPropertyKey(val: unknown): val is PropertyKey {
  return prorptyKeyTypes.includes(typeof val);
}

function hasPossibleProperties(val: unknown): val is {} {
  return val !== null && val !== undefined;
}

addOps<unknown, PropertyKey>(LispType.Prop, ({ done, a, b, obj, context, scope, internal }) => {
  if (a === null) {
    throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
  }

  if (!isPropertyKey(b)) {
    b = `${b}`;
  }

  if (a === undefined && obj === undefined && typeof b === 'string') {
    // is variable access
    const prop = scope.get(b, internal);
    if (prop.context === context.ctx.sandboxGlobal) {
      if (context.ctx.options.audit) {
        context.ctx.auditReport?.globalsAccess.add(b);
      }
    }
    const val = prop.context ? (prop.context as any)[prop.prop] : undefined;
    const p = getGlobalProp(val, context, prop) || prop;

    done(undefined, p);
    return;
  } else if (a === undefined) {
    throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
  }

  if (!hasPossibleProperties(a)) {
    done(undefined, new Prop(undefined, b));
    return;
  }

  const prototypeAccess = typeof a === 'function' || !hasOwnProperty(a, b);

  if (context.ctx.options.audit && prototypeAccess) {
    let prot: {} = Object.getPrototypeOf(a);
    do {
      if (hasOwnProperty(prot, b)) {
        if (
          context.ctx.auditReport &&
          !context.ctx.auditReport.prototypeAccess[prot.constructor.name]
        ) {
          context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
        }
        context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
      }
    } while ((prot = Object.getPrototypeOf(prot)));
  }

  if (prototypeAccess) {
    if (typeof a === 'function') {
      if (hasOwnProperty(a, b)) {
        const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
        const replace = context.ctx.options.prototypeReplacements.get(a);
        if (replace) {
          done(undefined, new Prop(replace(a, true), b));
          return;
        }
        if (
          !(whitelist && (!whitelist.size || whitelist.has(b))) &&
          !context.ctx.sandboxedFunctions.has(a)
        ) {
          throw new SandboxAccessError(
            `Static method or property access not permitted: ${a.name}.${b.toString()}`,
          );
        }
      }
    }

    let prot: {} = a;
    while ((prot = Object.getPrototypeOf(prot))) {
      if (hasOwnProperty(prot, b) || b === '__proto__') {
        const whitelist = context.ctx.prototypeWhitelist.get(prot);
        const replace = context.ctx.options.prototypeReplacements.get(prot.constructor);
        if (replace) {
          done(undefined, new Prop(replace(a, false), b));
          return;
        }
        if (
          (whitelist && (!whitelist.size || whitelist.has(b))) ||
          context.ctx.sandboxedFunctions.has(prot.constructor)
        ) {
          break;
        }
        if (b === '__proto__') {
          throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
        }
        throw new SandboxAccessError(
          `Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`,
        );
      }
    }
  }

  const val = a[b as keyof typeof a] as unknown;
  if (typeof a === 'function') {
    if (b === 'prototype' && !context.ctx.sandboxedFunctions.has(a)) {
      throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
    }
  }

  if (b === '__proto__' && !context.ctx.sandboxedFunctions.has(val?.constructor as any)) {
    throw new SandboxAccessError(`Access to prototype of global object is not permitted`);
  }

  const p = getGlobalProp(val, context, new Prop(a, b, false, false));
  if (p) {
    done(undefined, p);
    return;
  }

  const g =
    (obj instanceof Prop && obj.isGlobal) ||
    (typeof a === 'function' && !context.ctx.sandboxedFunctions.has(a)) ||
    context.ctx.globalsWhitelist.has(a);

  done(undefined, new Prop(a, b, false, g, false));
});

function getGlobalProp(val: unknown, context: IExecContext, prop?: Prop) {
  if (!val) return;
  const isFunc = typeof val === 'function';
  if (val instanceof Prop) {
    if (!prop) {
      prop = val;
    }
    val = val.get(context);
  }
  const p = prop?.prop || 'prop';
  if (val === globalThis) {
    return new Prop(
      {
        [p]: context.ctx.sandboxGlobal,
      },
      p,
      prop?.isConst || false,
      false,
      prop?.isVariable || false,
    );
  }
  const evl = isFunc && context.evals.get(val as Function);
  if (evl) {
    return new Prop(
      {
        [p]: evl,
      },
      p,
      prop?.isConst || false,
      true,
      prop?.isVariable || false,
    );
  }
}

addOps<unknown, Lisp[], any>(LispType.Call, ({ done, a, b, obj, context }) => {
  if (context.ctx.options.forbidFunctionCalls)
    throw new SandboxCapabilityError('Function invocations are not allowed');
  if (typeof a !== 'function') {
    throw new TypeError(
      `${typeof obj?.prop === 'symbol' ? 'Symbol' : obj?.prop} is not a function`,
    );
  }
  const vals = b
    .map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    })
    .flat()
    .map((item) => sanitizeProp(item, context));

  if (typeof obj === 'function') {
    const evl = context.evals.get(obj);
    let ret = evl ? evl(obj, ...vals) : obj(...vals);
    ret = sanitizeProp(ret, context);
    done(undefined, ret);
    return;
  }
  if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
    const cache = new Set<any>();
    const recurse = (x: unknown) => {
      if (!x || !(typeof x === 'object') || cache.has(x)) return;
      cache.add(x);
      for (const y of Object.keys(x) as (keyof typeof x)[]) {
        context.getSubscriptions.forEach((cb) => cb(x, y));
        recurse(x[y]);
      }
    };
    recurse(vals[0]);
  }

  if (
    obj.context instanceof Array &&
    arrayChange.has(obj.context[obj.prop]) &&
    (context.changeSubscriptions.get(obj.context) ||
      context.changeSubscriptionsGlobal.get(obj.context))
  ) {
    let change: Change;
    let changed = false;
    if (obj.prop === 'push') {
      change = {
        type: 'push',
        added: vals,
      };
      changed = !!vals.length;
    } else if (obj.prop === 'pop') {
      change = {
        type: 'pop',
        removed: obj.context.slice(-1),
      };
      changed = !!change.removed.length;
    } else if (obj.prop === 'shift') {
      change = {
        type: 'shift',
        removed: obj.context.slice(0, 1),
      };
      changed = !!change.removed.length;
    } else if (obj.prop === 'unshift') {
      change = {
        type: 'unshift',
        added: vals,
      };
      changed = !!vals.length;
    } else if (obj.prop === 'splice') {
      change = {
        type: 'splice',
        startIndex: vals[0] as number,
        deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
        added: vals.slice(2),
        removed: obj.context.slice(
          vals[0],
          vals[1] === undefined ? undefined : (vals[0] as number) + (vals[1] as number),
        ),
      };
      changed = !!change.added.length || !!change.removed.length;
    } else if (obj.prop === 'reverse' || obj.prop === 'sort') {
      change = { type: obj.prop };
      changed = !!obj.context.length;
    } else if (obj.prop === 'copyWithin') {
      const len =
        vals[2] === undefined
          ? obj.context.length - (vals[1] as number)
          : Math.min(obj.context.length, (vals[2] as number) - (vals[1] as number));
      change = {
        type: 'copyWithin',
        startIndex: vals[0] as number,
        endIndex: (vals[0] as number) + len,
        added: obj.context.slice(vals[1] as number, (vals[1] as number) + len),
        removed: obj.context.slice(vals[0] as number, (vals[0] as number) + len),
      };
      changed = !!change.added.length || !!change.removed.length;
    }
    if (changed) {
      context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb(change));
      context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb(change));
    }
  }
  obj.get(context);
  const evl = context.evals.get(obj.context[obj.prop] as any);
  let ret = evl ? evl(obj.context[obj.prop], ...vals) : (obj.context[obj.prop](...vals) as unknown);
  ret = sanitizeProp(ret, context);
  done(undefined, ret);
});

addOps<unknown, KeyVal[]>(LispType.CreateObject, ({ done, b }) => {
  let res = {} as any;
  for (const item of b) {
    if (item.key instanceof SpreadObject) {
      res = { ...res, ...item.key.item };
    } else {
      res[item.key] = item.val;
    }
  }
  done(undefined, res);
});

addOps<string, LispItem>(LispType.KeyVal, ({ done, a, b }) => done(undefined, new KeyVal(a, b)));

addOps<unknown, Lisp[]>(LispType.CreateArray, ({ done, b, context }) => {
  const items = b
    .map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    })
    .flat()
    .map((item) => sanitizeProp(item, context));
  done(undefined, items);
});

addOps<unknown, unknown>(LispType.Group, ({ done, b }) => done(undefined, b));

addOps<unknown, string>(LispType.GlobalSymbol, ({ done, b }) => {
  switch (b) {
    case 'true':
      return done(undefined, true);
    case 'false':
      return done(undefined, false);
    case 'null':
      return done(undefined, null);
    case 'undefined':
      return done(undefined, undefined);
    case 'NaN':
      return done(undefined, NaN);
    case 'Infinity':
      return done(undefined, Infinity);
  }
  done(new Error('Unknown symbol: ' + b));
});

addOps<unknown, string>(LispType.Number, ({ done, b }) =>
  done(undefined, Number(b.replace(/_/g, ''))),
);
addOps<unknown, string>(LispType.BigInt, ({ done, b }) =>
  done(undefined, BigInt(b.replace(/_/g, ''))),
);
addOps<unknown, string>(LispType.StringIndex, ({ done, b, context }) =>
  done(undefined, context.constants.strings[parseInt(b)]),
);

addOps<unknown, string>(LispType.RegexIndex, ({ done, b, context }) => {
  const reg: IRegEx = context.constants.regexes[parseInt(b)];
  if (!context.ctx.globalsWhitelist.has(RegExp)) {
    throw new SandboxCapabilityError('Regex not permitted');
  } else {
    done(undefined, new RegExp(reg.regex, reg.flags));
  }
});

addOps<unknown, string>(
  LispType.LiteralIndex,
  ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
    const item = context.constants.literals[parseInt(b)];
    const [, name, js] = item;
    const found: Lisp[] = [];
    let f: RegExpExecArray | null;
    const resnums: string[] = [];
    while ((f = literalRegex.exec(name))) {
      if (!f[2]) {
        found.push(js[parseInt(f[3], 10)]);
        resnums.push(f[3]);
      }
    }

    exec<unknown[]>(
      ticks,
      found,
      scope,
      context,
      (...args: unknown[]) => {
        const reses: Record<string, unknown> = {};
        if (args.length === 1) {
          done(args[0]);
          return;
        }
        const processed = args[1];
        for (const i of Object.keys(processed!) as (keyof typeof processed)[]) {
          const num = resnums[i];
          reses[num] = processed![i];
        }
        done(
          undefined,
          name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
            if ($) return match;
            const res = reses[num];
            return ($$ ? $$ : '') + `${sanitizeProp(res, context)}`;
          }),
        );
      },
      undefined,
      internal,
      generatorYield,
    );
  },
);

addOps<unknown, unknown[]>(LispType.SpreadArray, ({ done, b }) => {
  done(undefined, new SpreadArray(b));
});

addOps<unknown, Record<string, unknown>>(LispType.SpreadObject, ({ done, b }) => {
  done(undefined, new SpreadObject(b));
});

addOps<unknown, unknown>(LispType.Not, ({ done, b }) => done(undefined, !b));
addOps<unknown, number>(LispType.Inverse, ({ done, b }) => done(undefined, ~b));

addOps<unknown, unknown, Prop<any>>(LispType.IncrementBefore, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, ++obj.context[obj.prop]);
});

addOps<unknown, unknown, Prop<any>>(LispType.IncrementAfter, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]++);
});

addOps<unknown, unknown, Prop<any>>(LispType.DecrementBefore, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, --obj.context[obj.prop]);
});

addOps<unknown, unknown, Prop<any>>(LispType.DecrementAfter, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]--);
});

addOps<unknown, unknown, Prop<any>, Prop<any>>(
  LispType.Assign,
  ({ done, b, obj, context, scope, bobj, internal }) => {
    assignCheck(obj, context);
    obj.isGlobal = bobj?.isGlobal || false;
    if (obj.isVariable) {
      const s = scope.getWhereValScope(obj.prop as string, obj.prop === 'this', internal);
      if (s === null) {
        throw new ReferenceError(`Cannot assign to undeclared variable '${obj.prop.toString()}'`);
      }
      s.set(obj.prop as string, b, internal);
      if (obj.isGlobal) {
        s.globals[obj.prop.toString()] = true;
      } else {
        delete s.globals[obj.prop.toString()];
      }
      done(undefined, b);
      return;
    }
    done(undefined, (obj.context[obj.prop] = b));
  },
);

addOps<unknown, unknown, Prop<any>>(LispType.AddEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] += b));
});

addOps<unknown, number, Prop<any>>(LispType.SubractEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] -= b));
});

addOps<unknown, number, Prop<any>>(LispType.DivideEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] /= b));
});

addOps<unknown, number, Prop<any>>(LispType.MultiplyEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] *= b));
});

addOps<unknown, number, Prop<any>>(LispType.PowerEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] **= b));
});

addOps<unknown, number, Prop<any>>(LispType.ModulusEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] %= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitNegateEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] ^= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitAndEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] &= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitOrEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] |= b));
});

addOps<unknown, number, Prop<any>>(LispType.ShiftLeftEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] <<= b));
});

addOps<unknown, number, Prop<any>>(LispType.ShiftRightEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] >>= b));
});

addOps<unknown, number, Prop<any>>(
  LispType.UnsignedShiftRightEquals,
  ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>>= b));
  },
);

addOps<unknown, unknown, Prop<any>>(LispType.AndEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] &&= b));
});

addOps<unknown, unknown, Prop<any>>(LispType.OrEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] ||= b));
});

addOps<unknown, unknown, Prop<any>>(
  LispType.NullishCoalescingEquals,
  ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] ??= b));
  },
);

addOps<number, number>(LispType.LargerThan, ({ done, a, b }) => done(undefined, a > b));
addOps<number, number>(LispType.SmallerThan, ({ done, a, b }) => done(undefined, a < b));
addOps<number, number>(LispType.LargerEqualThan, ({ done, a, b }) => done(undefined, a >= b));
addOps<number, number>(LispType.SmallerEqualThan, ({ done, a, b }) => done(undefined, a <= b));
addOps<number, number>(LispType.Equal, ({ done, a, b }) => done(undefined, a == b));
addOps<number, number>(LispType.StrictEqual, ({ done, a, b }) => done(undefined, a === b));
addOps<number, number>(LispType.NotEqual, ({ done, a, b }) => done(undefined, a != b));
addOps<number, number>(LispType.StrictNotEqual, ({ done, a, b }) => done(undefined, a !== b));
addOps<number, number>(LispType.And, ({ done, a, b }) => done(undefined, a && b));
addOps<number, number>(LispType.Or, ({ done, a, b }) => done(undefined, a || b));
addOps<number, number>(LispType.NullishCoalescing, ({ done, a, b }) => done(undefined, a ?? b));
addOps<number, number>(LispType.BitAnd, ({ done, a, b }) => done(undefined, a & b));
addOps<number, number>(LispType.BitOr, ({ done, a, b }) => done(undefined, a | b));
addOps<number, number>(LispType.Plus, ({ done, a, b }) => done(undefined, a + b));
addOps<number, number>(LispType.Minus, ({ done, a, b }) => done(undefined, a - b));
addOps<number, number>(LispType.Positive, ({ done, b }) => done(undefined, +b));
addOps<number, number>(LispType.Negative, ({ done, b }) => done(undefined, -b));
addOps<number, number>(LispType.Divide, ({ done, a, b }) => done(undefined, a / b));
addOps<number, number>(LispType.Power, ({ done, a, b }) => done(undefined, a ** b));
addOps<number, number>(LispType.BitNegate, ({ done, a, b }) => done(undefined, a ^ b));
addOps<number, number>(LispType.Multiply, ({ done, a, b }) => done(undefined, a * b));
addOps<number, number>(LispType.Modulus, ({ done, a, b }) => done(undefined, a % b));
addOps<number, number>(LispType.BitShiftLeft, ({ done, a, b }) => done(undefined, a << b));
addOps<number, number>(LispType.BitShiftRight, ({ done, a, b }) => done(undefined, a >> b));
addOps<number, number>(LispType.BitUnsignedShiftRight, ({ done, a, b }) =>
  done(undefined, a >>> b),
);
addOps<unknown, LispItem>(
  LispType.Typeof,
  ({ exec, done, ticks, b, context, scope, internal, generatorYield }) => {
    exec(
      ticks,
      b,
      scope,
      context,
      (e, prop) => {
        done(undefined, typeof sanitizeProp(prop, context));
      },
      undefined,
      internal,
      generatorYield,
    );
  },
);

addOps<unknown, { new (): unknown }>(LispType.Instanceof, ({ done, a, b }) =>
  done(undefined, a instanceof b),
);
addOps<string, {}>(LispType.In, ({ done, a, b }) => done(undefined, a in b));

addOps<unknown, unknown>(LispType.Delete, ({ done, context, bobj }) => {
  if (!(bobj instanceof Prop)) {
    done(undefined, true);
    return;
  }
  assignCheck(bobj, context, 'delete');
  if (bobj.isVariable) {
    done(undefined, false);
    return;
  }
  done(undefined, delete (bobj.context as any)?.[bobj.prop]);
});

addOps(LispType.Return, ({ done, b }) => done(undefined, b));

addOps<string, unknown, unknown, Prop>(LispType.Var, ({ done, a, b, scope, bobj, internal }) => {
  done(undefined, scope.declare(a, VarType.var, b, bobj?.isGlobal || false, internal));
});

addOps<string, unknown, unknown, Prop>(LispType.Let, ({ done, a, b, scope, bobj, internal }) => {
  done(undefined, scope.declare(a, VarType.let, b, bobj?.isGlobal || false, internal));
});

addOps<string, unknown, unknown, Prop>(LispType.Const, ({ done, a, b, scope, bobj, internal }) => {
  done(undefined, scope.declare(a, VarType.const, b, bobj?.isGlobal || false, internal));
});

addOps<string, unknown, unknown, Prop>(
  LispType.Internal,
  ({ done, a, b, scope, bobj, internal }) => {
    if (!internal) {
      throw new SandboxCapabilityError('Internal variables are not accessible');
    }
    done(undefined, scope.declare(a, VarType.internal, b, bobj?.isGlobal || false, internal));
  },
);

addOps<string[], Lisp[], Lisp>(
  LispType.ArrowFunction,
  ({ done, ticks, a, b, obj, context, scope, internal }) => {
    a = [...a];
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    if (a.shift()) {
      done(undefined, createFunctionAsync(a, b, ticks, context, scope, undefined, internal));
    } else {
      done(undefined, createFunction(a, b, ticks, context, scope, undefined, internal));
    }
  },
);

addOps<(string | LispType)[], Lisp[], Lisp>(
  LispType.Function,
  ({ done, ticks, a, b, obj, context, scope, internal }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const isAsync = a.shift();
    const isGenerator = a.shift();
    const name = a.shift() as string;
    let func;
    if (isAsync === LispType.True && isGenerator === LispType.True) {
      func = createAsyncGeneratorFunction(a as string[], b, ticks, context, scope, name, internal);
    } else if (isGenerator === LispType.True) {
      func = createGeneratorFunction(a as string[], b, ticks, context, scope, name, internal);
    } else if (isAsync === LispType.True) {
      func = createFunctionAsync(a as string[], b, ticks, context, scope, name, internal);
    } else {
      func = createFunction(a as string[], b, ticks, context, scope, name, internal);
    }
    if (name) {
      scope.declare(name, VarType.var, func, false, internal);
    }
    done(undefined, func);
  },
);

addOps<(string | LispType)[], Lisp[], Lisp>(
  LispType.InlineFunction,
  ({ done, ticks, a, b, obj, context, scope, internal }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const isAsync = a.shift();
    const isGenerator = a.shift();
    const name = a.shift() as string;
    if (name) {
      scope = new Scope(scope, {});
    }
    let func;
    if (isAsync === LispType.True && isGenerator === LispType.True) {
      func = createAsyncGeneratorFunction(a as string[], b, ticks, context, scope, name, internal);
    } else if (isGenerator === LispType.True) {
      func = createGeneratorFunction(a as string[], b, ticks, context, scope, name, internal);
    } else if (isAsync === LispType.True) {
      func = createFunctionAsync(a as string[], b, ticks, context, scope, name, internal);
    } else {
      func = createFunction(a as string[], b, ticks, context, scope, name, internal);
    }
    if (name) {
      scope.declare(name, VarType.let, func, false, internal);
    }
    done(undefined, func);
  },
);

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

addOps<LispItem, StatementLabel>(
  LispType.LoopAction,
  ({ done, a, b, context, statementLabels }) => {
    const label = normalizeStatementLabel(b);
    const target = findControlFlowTarget(statementLabels, a as ControlFlowAction, label);
    if (target === null) {
      throw new TypeError('Illegal continue statement');
    }
    if (!target) {
      throw new TypeError(label ? `Undefined label '${label}'` : 'Illegal ' + a + ' statement');
    }
    done(
      undefined,
      new ExecReturn(context.ctx.auditReport, undefined, false, {
        type: a as ControlFlowAction,
        label,
      }),
    );
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

        // If try had an error and there's a catch block, execute catch
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

addOps(LispType.Void, ({ done }) => {
  done();
});
addOps<new (...args: unknown[]) => unknown, unknown[]>(LispType.New, ({ done, a, b, context }) => {
  if (!context.ctx.globalsWhitelist.has(a) && !context.ctx.sandboxedFunctions.has(a)) {
    throw new SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
  }
  b = b.map((item) => sanitizeProp(item, context));
  const ret = sanitizeProp(new a(...b), context);
  done(undefined, ret);
});

addOps(LispType.Throw, ({ done, b }) => {
  done(b);
});
addOps<unknown[]>(LispType.Expression, ({ done, a }) => done(undefined, a.pop()));
addOps(LispType.None, ({ done }) => done());

export function execMany(
  ticks: Ticks,
  exec: Execution,
  tree: Lisp[],
  done: Done,
  scope: Scope,
  context: IExecContext,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  if (exec === execSync) {
    _execManySync(ticks, tree, done, scope, context, statementLabels, internal, generatorYield);
  } else {
    _execManyAsync(
      ticks,
      tree,
      done,
      scope,
      context,
      statementLabels,
      internal,
      generatorYield,
    ).catch(done);
  }
}

function _execManySync(
  ticks: Ticks,
  tree: Lisp[],
  done: Done,
  scope: Scope,
  context: IExecContext,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  const ret: any[] = [];
  for (let i = 0; i < tree.length; i++) {
    let res = syncDone((d) =>
      execSync(ticks, tree[i], scope, context, d, statementLabels, internal, generatorYield),
    ).result;
    if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
      done(undefined, res);
      return;
    }
    if (isLisp(tree[i]) && tree[i][0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
    ret.push(res);
  }
  done(undefined, ret);
}

async function _execManyAsync(
  ticks: Ticks,
  tree: Lisp[],
  done: Done,
  scope: Scope,
  context: IExecContext,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  const ret: any[] = [];
  for (let i = 0; i < tree.length; i++) {
    let res;
    try {
      let ad: AsyncDoneRet;
      res =
        (ad = asyncDone((d) =>
          execAsync(ticks, tree[i], scope, context, d, statementLabels, internal, generatorYield),
        )).isInstant === true
          ? ad.instant
          : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
      done(undefined, res);
      return;
    }
    if (isLisp(tree[i]) && tree[i][0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
    ret.push(res);
  }
  done(undefined, ret);
}

type Execution = <T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) => void;

export interface AsyncDoneRet {
  isInstant: boolean;
  instant: any;
  p: Promise<{ result: any }>;
}

export function asyncDone(callback: (done: Done) => void): AsyncDoneRet {
  let isInstant = false;
  let instant: unknown;
  const p = new Promise<any>((resolve, reject) => {
    callback((...args: unknown[]) => {
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
    p,
  };
}

export function syncDone(callback: (done: Done) => void): { result: any } {
  let result;
  let err: { error: unknown } | undefined;
  callback((...args: unknown[]) => {
    err = args.length === 1 ? { error: args[0] } : undefined;
    result = args[1];
  });
  if (err) throw err.error;
  return { result };
}

export async function execAsync<T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  doneOriginal: Done<T>,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
): Promise<void> {
  let done: Done<T> = doneOriginal;
  const p = new Promise<void>((resolve) => {
    done = (...args: unknown[]) => {
      doneOriginal(...args);
      resolve();
    };
  });
  if (
    !_execNoneRecurse(
      ticks,
      tree,
      scope,
      context,
      done,
      true,
      statementLabels,
      internal,
      generatorYield,
    ) &&
    isLisp(tree)
  ) {
    let op = tree[0];
    let obj;
    try {
      let ad: AsyncDoneRet;
      obj =
        (ad = asyncDone((d) =>
          execAsync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield),
        )).isInstant === true
          ? ad.instant
          : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    let a = obj;
    try {
      a = obj instanceof Prop ? obj.get(context) : obj;
    } catch (e) {
      done(e);
      return;
    }
    if (op === LispType.PropOptional || op === LispType.CallOptional) {
      if (a === undefined || a === null) {
        done(undefined, optional);
        return;
      }
      op = op === LispType.PropOptional ? LispType.Prop : LispType.Call;
    }
    if (a === optional) {
      if (op === LispType.Prop || op === LispType.Call) {
        done(undefined, a);
        return;
      } else {
        a = undefined;
      }
    }
    // Short-circuit for nullish coalescing: if a is not null/undefined, return a without evaluating b
    if (op === LispType.NullishCoalescing && a !== undefined && a !== null) {
      done(undefined, a);
      return;
    }
    let bobj;
    try {
      let ad: AsyncDoneRet;
      bobj =
        (ad = asyncDone((d) =>
          execAsync(ticks, tree[2], scope, context, d, statementLabels, internal, generatorYield),
        )).isInstant === true
          ? ad.instant
          : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    let b = bobj;
    try {
      b = bobj instanceof Prop ? bobj.get(context) : bobj;
    } catch (e) {
      done(e);
      return;
    }
    if (b === optional) {
      b = undefined;
    }
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
      tree,
    });
  }
  await p;
}

export function execSync<T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  if (
    !_execNoneRecurse(
      ticks,
      tree,
      scope,
      context,
      done,
      false,
      statementLabels,
      internal,
      generatorYield,
    ) &&
    isLisp(tree)
  ) {
    let op = tree[0];
    let obj = syncDone((d) =>
      execSync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield),
    ).result;
    let a = obj instanceof Prop ? obj.get(context) : obj;
    if (op === LispType.PropOptional || op === LispType.CallOptional) {
      if (a === undefined || a === null) {
        done(undefined, optional);
        return;
      }
      op = op === LispType.PropOptional ? LispType.Prop : LispType.Call;
    }
    if (a === optional) {
      if (op === LispType.Prop || op === LispType.Call) {
        done(undefined, a);
        return;
      } else {
        a = undefined;
      }
    }
    // Short-circuit for nullish coalescing: if a is not null/undefined, return a without evaluating b
    if (op === LispType.NullishCoalescing && a !== undefined && a !== null) {
      done(undefined, a);
      return;
    }
    let bobj = syncDone((d) =>
      execSync(ticks, tree[2], scope, context, d, statementLabels, internal, generatorYield),
    ).result;
    let b = bobj instanceof Prop ? bobj.get(context) : bobj;
    if (b === optional) {
      b = undefined;
    }
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
      tree,
    });
  }
}

type OpsCallbackParams<a, b, obj, bobj> = {
  op: LispType;
  exec: Execution;
  a: a;
  b: b;
  obj: obj;
  bobj: bobj;
  ticks: Ticks;
  tree: LispItem;
  scope: Scope;
  context: IExecContext;
  done: Done;
  statementLabels: ControlFlowTargets;
  internal: boolean;
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined;
};

function sanitizeArray<T>(val: T, context: IExecContext, cache = new WeakSet<object>()): T {
  if (!Array.isArray(val)) return val;
  if (cache.has(val)) return val;
  cache.add(val);
  for (let i = 0; i < val.length; i++) {
    const item = val[i];
    val[i] = sanitizeProp(item, context);
  }
  return val;
}

function sanitizeProp(value: unknown, context: IExecContext): unknown {
  value = getGlobalProp(value, context) || value;

  if (value instanceof Prop) {
    value = value.get(context);
  }

  if (value === optional) {
    return undefined;
  }

  sanitizeArray(value, context);
  return value;
}

function checkHaltExpectedTicks(
  params: OpsCallbackParams<any, any, any, any>,
  expectTicks = 0,
): boolean {
  const sandbox = params.context.ctx.sandbox;
  const options = params.context.ctx.options;
  const { ticks, scope, context, done, op } = params;
  if (sandbox.halted) {
    const sub = sandbox.subscribeResume(() => {
      sub.unsubscribe();
      try {
        const o = ops.get(op);
        if (!o) {
          done(new SyntaxError('Unknown operator: ' + op));
          return;
        }
        o(params);
      } catch (err) {
        if (options.haltOnSandboxError && err instanceof SandboxError) {
          const sub = sandbox.subscribeResume(() => {
            sub.unsubscribe();
            done(err);
          });
          sandbox.haltExecution({
            error: err as Error,
            ticks,
            scope,
            context,
          });
        } else {
          done(err);
        }
      }
    });
    return true;
  } else if (ticks.tickLimit && ticks.tickLimit <= ticks.ticks + BigInt(expectTicks)) {
    const sub = sandbox.subscribeResume(() => {
      sub.unsubscribe();
      try {
        const o = ops.get(op);
        if (!o) {
          done(new SyntaxError('Unknown operator: ' + op));
          return;
        }
        o(params);
      } catch (err) {
        if (context.ctx.options.haltOnSandboxError && err instanceof SandboxError) {
          const sub = sandbox.subscribeResume(() => {
            sub.unsubscribe();
            done(err);
          });
          sandbox.haltExecution({
            error: err as Error,
            ticks,
            scope,
            context,
          });
        } else {
          done(err);
        }
      }
    });
    const error = new SandboxExecutionQuotaExceededError('Execution quota exceeded');
    sandbox.haltExecution({
      error,
      ticks,
      scope: scope,
      context,
    });
    return true;
  }
  return false;
}

function performOp(params: OpsCallbackParams<any, any, any, any>) {
  const { done, op, ticks, context, scope } = params;
  ticks.ticks++;
  const sandbox = context.ctx.sandbox;

  if (checkHaltExpectedTicks(params)) {
    return;
  }

  try {
    const o = ops.get(op);
    if (!o) {
      done(new SandboxExecutionTreeError('Unknown operator: ' + op));
      return;
    }
    o(params);
  } catch (err) {
    if (context.ctx.options.haltOnSandboxError && err instanceof SandboxError) {
      const sub = sandbox.subscribeResume(() => {
        sub.unsubscribe();
        done(err);
      });
      sandbox.haltExecution({
        error: err as Error,
        ticks,
        scope,
        context,
      });
    } else {
      done(err);
    }
  }
}

const unexecTypes = new Set([
  LispType.ArrowFunction,
  LispType.Function,
  LispType.InlineFunction,
  LispType.Loop,
  LispType.Try,
  LispType.Switch,
  LispType.IfCase,
  LispType.InlineIfCase,
  LispType.Labeled,
  LispType.Typeof,
]);

function _execNoneRecurse<T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  isAsync: boolean,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
): boolean {
  const exec = isAsync ? execAsync : execSync;
  if (tree instanceof Prop) {
    done(undefined, tree.get(context));
  } else if (tree === optional) {
    done();
  } else if (Array.isArray(tree) && !isLisp(tree)) {
    if (tree[0] === LispType.None) {
      done();
    } else {
      execMany(
        ticks,
        exec,
        tree as Lisp[],
        done,
        scope,
        context,
        statementLabels,
        internal,
        generatorYield,
      );
    }
  } else if (!isLisp(tree)) {
    done(undefined, tree);
  } else if (tree[0] === LispType.Block) {
    execMany(
      ticks,
      exec,
      tree[1] as Lisp[],
      done,
      new Scope(scope),
      context,
      statementLabels,
      internal,
      generatorYield,
    );
  } else if (tree[0] === LispType.InternalBlock) {
    execMany(
      ticks,
      exec,
      tree[1] as Lisp[],
      done,
      scope,
      context,
      statementLabels,
      true,
      generatorYield,
    );
  } else if (tree[0] === LispType.Await) {
    if (!isAsync) {
      done(new SyntaxError("Illegal use of 'await', must be inside async function"));
    } else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
      execAsync(
        ticks,
        tree[1],
        scope,
        context,
        async (...args: unknown[]) => {
          if (args.length === 1) done(args[0]);
          else
            try {
              done(undefined, (await sanitizeProp(args[1], context)) as any);
            } catch (err) {
              done(err);
            }
        },
        statementLabels,
        internal,
        generatorYield,
      ).catch(done);
    } else {
      done(new SandboxCapabilityError('Async/await is not permitted'));
    }
  } else if (tree[0] === LispType.Yield || tree[0] === LispType.YieldDelegate) {
    const yieldFn = generatorYield;
    if (!yieldFn) {
      done(new SyntaxError("Illegal use of 'yield', must be inside a generator function"));
      return true;
    }
    const isDelegate = tree[0] === LispType.YieldDelegate;
    if (isAsync) {
      execAsync(
        ticks,
        tree[1],
        scope,
        context,
        async (...args: unknown[]) => {
          if (args.length === 1) {
            done(args[0]);
            return;
          }
          try {
            const val = await sanitizeProp(args[1], context);
            yieldFn(new YieldValue(val, isDelegate), done);
          } catch (err) {
            done(err);
          }
        },
        statementLabels,
        internal,
        generatorYield,
      ).catch(done);
    } else {
      try {
        const val = syncDone((d) =>
          execSync(ticks, tree[1], scope, context, d, statementLabels, internal, generatorYield),
        ).result;
        const sanitized = sanitizeProp(val, context);
        // Pass `done` as second arg so the yieldFn can call it with the injected value.
        // For capture-mode yieldFns (executeGenBody default case), this enables the restart loop.
        // For plain yieldFns (eager mode), done? is ignored and done() is called below.
        yieldFn(new YieldValue(sanitized, isDelegate), done);
        // If yieldFn did not call done (it threw syncYieldPauseSentinel instead), we fall through
        // to the catch which re-throws the sentinel. Otherwise yieldFn called done itself.
      } catch (err) {
        if (err === syncYieldPauseSentinel) throw err; // propagate pause up to restart loop
        done(err);
      }
    }
  } else if (unexecTypes.has(tree[0])) {
    performOp({
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
      bobj: undefined,
      statementLabels,
      internal,
      generatorYield,
    });
  } else {
    return false;
  }
  return true;
}
export function executeTree<T>(
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scopes: IScope[] = [],
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined,
): ExecReturn<T> {
  return syncDone((done) =>
    executeTreeWithDone(
      execSync,
      done,
      ticks,
      context,
      executionTree,
      scopes,
      statementLabels,
      internal,
      generatorYield,
    ),
  ).result;
}

export async function executeTreeAsync<T>(
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scopes: IScope[] = [],
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined,
): Promise<ExecReturn<T>> {
  let ad: AsyncDoneRet;
  return (ad = asyncDone((done) =>
    executeTreeWithDone(
      execAsync,
      done,
      ticks,
      context,
      executionTree,
      scopes,
      statementLabels,
      internal,
      generatorYield,
    ),
  )).isInstant === true
    ? ad.instant
    : (await ad.p).result;
}

function executeTreeWithDone(
  exec: Execution,
  done: Done,
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scopes: IScope[] = [],
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  if (!executionTree) {
    done();
    return;
  }
  if (!(executionTree instanceof Array)) {
    throw new SyntaxError('Bad execution tree');
  }
  let scope = context.ctx.globalScope;
  let s;
  while ((s = scopes.shift())) {
    if (typeof s !== 'object') continue;
    if (s instanceof Scope) {
      scope = s;
    } else {
      scope = new Scope(scope, s, s instanceof LocalScope ? undefined : null);
    }
  }
  if (context.ctx.options.audit && !context.ctx.auditReport) {
    context.ctx.auditReport = {
      globalsAccess: new Set(),
      prototypeAccess: {},
    };
  }
  if (exec === execSync) {
    _executeWithDoneSync(
      done,
      ticks,
      context,
      executionTree,
      scope,
      statementLabels,
      internal,
      generatorYield,
    );
  } else {
    _executeWithDoneAsync(
      done,
      ticks,
      context,
      executionTree,
      scope,
      statementLabels,
      internal,
      generatorYield,
    ).catch(done);
  }
}

function _executeWithDoneSync(
  done: Done,
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scope: Scope,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  if (!(executionTree instanceof Array)) throw new SyntaxError('Bad execution tree');
  let i = 0;
  for (i = 0; i < executionTree.length; i++) {
    let res: unknown;
    let err: { error: unknown } | undefined;
    const current = executionTree[i];
    try {
      execSync(
        ticks,
        current,
        scope,
        context,
        (...args: unknown[]) => {
          if (args.length === 1) err = { error: args[0] };
          else res = args[1];
        },
        statementLabels,
        internal,
        generatorYield,
      );
    } catch (e) {
      err = { error: e };
    }
    if (err) {
      done(err.error);
      return;
    }
    if (res instanceof ExecReturn) {
      done(undefined, res);
      return;
    }
    if (isLisp(current) && current[0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}

async function _executeWithDoneAsync(
  done: Done,
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scope: Scope,
  statementLabels: ControlFlowTargets,
  internal: boolean,
  generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined,
) {
  if (!(executionTree instanceof Array)) throw new SyntaxError('Bad execution tree');
  let i = 0;
  for (i = 0; i < executionTree.length; i++) {
    let res: unknown;
    let err: { error: unknown } | undefined;
    const current = executionTree[i];
    try {
      await execAsync(
        ticks,
        current,
        scope,
        context,
        (...args: unknown[]) => {
          if (args.length === 1) err = { error: args[0] };
          else res = args[1];
        },
        statementLabels,
        internal,
        generatorYield,
      );
    } catch (e) {
      err = { error: e };
    }
    if (err) {
      done(err.error);
      return;
    }
    if (res instanceof ExecReturn) {
      done(undefined, res);
      return;
    }
    if (isLisp(current) && current[0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}
