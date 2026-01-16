import { createFunction, createFunctionAsync, currentTicks } from './executor.js';
import parse, { lispifyFunction } from './parser.js';
import { IExecContext, Ticks } from './utils.js';

export interface IEvalContext {
  sandboxFunction: typeof sandboxFunction;
  sandboxAsyncFunction: typeof sandboxAsyncFunction;
  sandboxedEval: typeof sandboxedEval;
  sandboxedSetTimeout: typeof sandboxedSetTimeout;
  sandboxedSetInterval: typeof sandboxedSetInterval;
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

export function createEvalContext(): IEvalContext {
  return {
    sandboxFunction,
    sandboxAsyncFunction,
    sandboxedEval,
    sandboxedSetTimeout,
    sandboxedSetInterval,
    lispifyFunction,
  };
}

export function sandboxFunction(context: IExecContext, ticks?: Ticks): SandboxFunction {
  return SandboxFunction;
  function SandboxFunction(...params: string[]) {
    const code = params.pop() || '';
    const parsed = parse(code);
    return createFunction(
      params,
      parsed.tree,
      ticks || currentTicks.current,
      {
        ...context,
        constants: parsed.constants,
        tree: parsed.tree,
      },
      undefined,
      'anonymous'
    );
  }
}

export type SandboxAsyncFunction = (code: string, ...args: string[]) => () => Promise<unknown>;
export function sandboxAsyncFunction(context: IExecContext, ticks?: Ticks): SandboxAsyncFunction {
  return SandboxAsyncFunction;
  function SandboxAsyncFunction(...params: string[]) {
    const code = params.pop() || '';
    const parsed = parse(code);
    return createFunctionAsync(
      params,
      parsed.tree,
      ticks || currentTicks.current,
      {
        ...context,
        constants: parsed.constants,
        tree: parsed.tree,
      },
      undefined,
      'anonymous'
    );
  }
}

export function sandboxedEval(func: SandboxFunction): SandboxEval {
  return sandboxEval;
  function sandboxEval(code: string) {
    return func(code)();
  }
}

export function sandboxedSetTimeout(func: SandboxFunction): SandboxSetTimeout {
  return function sandboxSetTimeout(handler, ...args) {
    if (typeof handler !== 'string') return setTimeout(handler, ...args);
    return setTimeout(func(handler), ...args);
  };
}

export function sandboxedSetInterval(func: SandboxFunction): SandboxSetInterval {
  return function sandboxSetInterval(handler, ...args) {
    if (typeof handler !== 'string') return setInterval(handler, ...args);
    return setInterval(func(handler), ...args);
  };
}
