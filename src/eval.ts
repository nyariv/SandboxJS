import {
  createAsyncGeneratorFunction,
  createFunction,
  createFunctionAsync,
  createGeneratorFunction,
} from './executor.js';
import parse, { Lisp, lispifyFunction } from './parser.js';
import { getSandboxSymbolCtor, IExecContext, LispType, Ticks } from './utils.js';

export interface IEvalContext {
  sandboxFunction: typeof sandboxFunction;
  sandboxAsyncFunction: typeof sandboxAsyncFunction;
  sandboxGeneratorFunction: typeof sandboxGeneratorFunction;
  sandboxAsyncGeneratorFunction: typeof sandboxAsyncGeneratorFunction;
  sandboxedSymbol: typeof sandboxedSymbol;
  sandboxedEval: (func: SandboxFunction, context: IExecContext) => SandboxEval;
  sandboxedSetTimeout: typeof sandboxedSetTimeout;
  sandboxedSetInterval: typeof sandboxedSetInterval;
  sandboxedClearTimeout: typeof sandboxedClearTimeout;
  sandboxedClearInterval: typeof sandboxedClearInterval;
  lispifyFunction: typeof lispifyFunction;
}
export type SandboxFunction = (code: string, ...args: string[]) => () => unknown;
export type SandboxEval = (code: string) => unknown;
export type SandboxSetTimeout = (
  handler: TimerHandler,
  timeout?: number,
  ...args: unknown[]
) => any;
export type SandboxSetInterval = (
  handler: TimerHandler,
  timeout?: number,
  ...args: unknown[]
) => any;
export type SandboxClearTimeout = (handle: number) => void;
export type SandboxClearInterval = (handle: number) => void;

export function createEvalContext(): IEvalContext {
  return {
    sandboxFunction,
    sandboxAsyncFunction,
    sandboxGeneratorFunction,
    sandboxAsyncGeneratorFunction,
    sandboxedSymbol,
    sandboxedEval,
    sandboxedSetTimeout,
    sandboxedSetInterval,
    sandboxedClearTimeout,
    sandboxedClearInterval,
    lispifyFunction,
  };
}

export function sandboxedSymbol(context: IExecContext) {
  return getSandboxSymbolCtor(context.ctx.sandboxSymbols);
}

function SB() {}
export function sandboxFunction(context: IExecContext): SandboxFunction {
  SandboxFunction.prototype = SB.prototype;
  return SandboxFunction;
  function SandboxFunction(...params: string[]) {
    const code = params.pop() || '';
    const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
    return createFunction(
      params,
      parsed.tree,
      context.ctx.ticks,
      {
        ...context,
        constants: parsed.constants,
        tree: parsed.tree,
      },
      undefined,
      'anonymous',
    );
  }
}

export type SandboxAsyncFunction = (code: string, ...args: string[]) => () => Promise<unknown>;
function SAF() {}
export function sandboxAsyncFunction(context: IExecContext): SandboxAsyncFunction {
  SandboxAsyncFunction.prototype = SAF.prototype;
  return SandboxAsyncFunction;
  function SandboxAsyncFunction(...params: string[]) {
    const code = params.pop() || '';
    const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
    return createFunctionAsync(
      params,
      parsed.tree,
      context.ctx.ticks,
      {
        ...context,
        constants: parsed.constants,
        tree: parsed.tree,
      },
      undefined,
      'anonymous',
    );
  }
}

export type SandboxGeneratorFunction = (
  code: string,
  ...args: string[]
) => () => Iterator<unknown> & Iterable<unknown>;
function SGF() {}
export function sandboxGeneratorFunction(context: IExecContext): SandboxGeneratorFunction {
  SandboxGeneratorFunction.prototype = SGF.prototype;
  return SandboxGeneratorFunction;
  function SandboxGeneratorFunction(...params: string[]) {
    const code = params.pop() || '';
    const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
    return createGeneratorFunction(
      params,
      parsed.tree,
      context.ctx.ticks,
      {
        ...context,
        constants: parsed.constants,
        tree: parsed.tree,
      },
      undefined,
      'anonymous',
    );
  }
}

export type SandboxAsyncGeneratorFunction = (
  code: string,
  ...args: string[]
) => () => AsyncGenerator<unknown, unknown, unknown>;
function SAGF() {}
export function sandboxAsyncGeneratorFunction(
  context: IExecContext,
): SandboxAsyncGeneratorFunction {
  SandboxAsyncGeneratorFunction.prototype = SAGF.prototype;
  return SandboxAsyncGeneratorFunction;
  function SandboxAsyncGeneratorFunction(...params: string[]) {
    const code = params.pop() || '';
    const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
    return createAsyncGeneratorFunction(
      params,
      parsed.tree,
      context.ctx.ticks,
      {
        ...context,
        constants: parsed.constants,
        tree: parsed.tree,
      },
      undefined,
      'anonymous',
    );
  }
}

function SE() {}
export function sandboxedEval(func: SandboxFunction, context: IExecContext): SandboxEval {
  sandboxEval.prototype = SE.prototype;
  return sandboxEval;
  function sandboxEval(code: string) {
    // Parse the code and wrap last statement in return for completion value
    const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
    const tree = wrapLastStatementInReturn(parsed.tree);
    // Create and execute function with modified tree
    return createFunction(
      [],
      tree,
      context.ctx.ticks,
      {
        ...context,
        constants: parsed.constants,
        tree,
      },
      undefined,
      'anonymous',
    )();
  }
}

function wrapLastStatementInReturn(tree: Lisp[]): Lisp[] {
  if (tree.length === 0) return tree;
  const newTree = [...tree];
  const lastIndex = newTree.length - 1;
  const lastStmt = newTree[lastIndex];

  // Only wrap if it's not already a return or throw
  if (Array.isArray(lastStmt) && lastStmt.length >= 1) {
    const op = lastStmt[0];

    // Don't wrap Return (8) or Throw (47) - they already control flow
    if (op === LispType.Return || op === LispType.Throw) {
      return newTree;
    }

    // List of statement types that should have undefined completion value
    // These match JavaScript semantics where declarations and control structures
    // don't produce a completion value
    const statementTypes = [
      LispType.Let, // 3
      LispType.Const, // 4
      LispType.Var, // 35
      LispType.Function, // 38
      LispType.If, // 14
      LispType.Loop, // 39
      LispType.Try, // 40
      LispType.Switch, // 41
      LispType.InternalBlock, // 43
      LispType.Expression, // 44
    ];

    // If the last statement is a declaration or control structure,
    // don't wrap it (it will naturally return undefined)
    if (statementTypes.includes(op)) {
      return newTree;
    }

    // For all other types (expressions, operators, etc.),
    // wrap in return to capture the completion value
    newTree[lastIndex] = [LispType.Return, LispType.None, lastStmt];
  }

  return newTree;
}

function sST() {}
export function sandboxedSetTimeout(
  func: SandboxFunction,
  context: IExecContext,
): SandboxSetTimeout {
  sandboxSetTimeout.prototype = sST.prototype;
  return sandboxSetTimeout;
  function sandboxSetTimeout(handler: TimerHandler, timeout?: number, ...args: unknown[]) {
    const sandbox = context.ctx.sandbox;
    const exec = (...a: any[]) => {
      const h = typeof handler === 'string' ? func(handler) : handler;
      haltsub.unsubscribe();
      contsub.unsubscribe();
      sandbox.setTimeoutHandles.delete(sandBoxhandle);
      return h(...a);
    };

    const sandBoxhandle = ++sandbox.timeoutHandleCounter;

    let start = Date.now();
    let handle: number = setTimeout(exec, timeout, ...args);

    let elapsed = 0;
    const haltsub = sandbox.subscribeHalt(() => {
      elapsed = Date.now() - start + elapsed;
      clearTimeout(handle);
    });
    const contsub = sandbox.subscribeResume(() => {
      start = Date.now();
      const remaining = Math.floor((timeout || 0) - elapsed);
      handle = setTimeout(exec, remaining, ...args);
      sandbox.setTimeoutHandles.set(sandBoxhandle, {
        handle,
        haltsub,
        contsub,
      });
    });
    sandbox.setTimeoutHandles.set(sandBoxhandle, {
      handle,
      haltsub,
      contsub,
    });
    return sandBoxhandle;
  }
}

function sCT() {}
export function sandboxedClearTimeout(context: IExecContext): SandboxClearTimeout {
  sandboxClearTimeout.prototype = sCT.prototype;
  return sandboxClearTimeout;
  function sandboxClearTimeout(handle: number) {
    const sandbox = context.ctx.sandbox;
    const timeoutHandle = sandbox.setTimeoutHandles.get(handle);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle.handle);
      timeoutHandle.haltsub.unsubscribe();
      timeoutHandle.contsub.unsubscribe();
      sandbox.setTimeoutHandles.delete(handle);
    }
  }
}
function sCI() {}
export function sandboxedClearInterval(context: IExecContext): SandboxClearInterval {
  sandboxClearInterval.prototype = sCI.prototype;
  return sandboxClearInterval;
  function sandboxClearInterval(handle: number) {
    const sandbox = context.ctx.sandbox;
    const intervalHandle = sandbox.setIntervalHandles.get(handle);
    if (intervalHandle) {
      clearInterval(intervalHandle.handle);
      clearTimeout(intervalHandle.handle);
      intervalHandle.haltsub.unsubscribe();
      intervalHandle.contsub.unsubscribe();
      sandbox.setIntervalHandles.delete(handle);
    }
  }
}

function sSI() {}
export function sandboxedSetInterval(
  func: SandboxFunction,
  context: IExecContext,
): SandboxSetInterval {
  sandboxSetInterval.prototype = sSI.prototype;
  return sandboxSetInterval;
  function sandboxSetInterval(
    handler: TimerHandler,
    timeout: number | undefined,
    ...args: unknown[]
  ) {
    const sandbox = context.ctx.sandbox;
    const h = typeof handler === 'string' ? func(handler) : handler;
    const exec = (...a: any[]) => {
      start = Date.now();
      elapsed = 0;
      return h(...a);
    };

    const sandBoxhandle = ++sandbox.timeoutHandleCounter;

    let start = Date.now();
    let handle: number = setInterval(exec, timeout, ...args);

    let elapsed = 0;
    const haltsub = sandbox.subscribeHalt(() => {
      elapsed = Date.now() - start + elapsed;
      clearInterval(handle);
      clearTimeout(handle);
    });
    const contsub = sandbox.subscribeResume(() => {
      start = Date.now();
      handle = setTimeout(
        () => {
          start = Date.now();
          elapsed = 0;
          handle = setInterval(exec, timeout, ...args);
          handlObj.handle = handle;
          exec(...args);
        },
        Math.floor((timeout || 0) - elapsed),
        ...args,
      );
      handlObj.handle = handle;
    });

    const handlObj = {
      handle,
      haltsub,
      contsub,
    };
    sandbox.setIntervalHandles.set(sandBoxhandle, handlObj);
    return sandBoxhandle;
  }
}
