import { createFunction, createFunctionAsync, currentTicks } from './executor.js';
import parse, { lispifyFunction } from './parser.js';
import { IExecContext, Ticks } from './utils.js';

export interface IEvalContext {
  sandboxFunction: typeof sandboxFunction;
  sandboxAsyncFunction: typeof sandboxAsyncFunction;
  sandboxedEval: typeof sandboxedEval;
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
    sandboxedEval,
    sandboxedSetTimeout,
    sandboxedSetInterval,
    sandboxedClearTimeout,
    sandboxedClearInterval,
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

export function sandboxedSetTimeout(func: SandboxFunction, context: IExecContext): SandboxSetTimeout {
  return function sandboxSetTimeout(handler, timeout, ...args) {
    const sandbox = context.ctx.sandbox;
    const exec = (...a: any[]) => {
      const h = typeof handler === 'string' ? func(handler) : handler;
      haltsub.unsubscribe();
      contsub.unsubscribe();
      return h(...a);
    };

    const sandBoxhandle = ++sandbox.timeoutHandleCounter;

    let start = Date.now();
    let handle: any = setTimeout(exec, timeout, ...args);
    sandbox.setTimeoutHandles.set(sandBoxhandle, handle);
    
    let elapsed = 0;
    const haltsub = sandbox.subscribeHalt(() => {
      elapsed = Date.now() - start + elapsed
      clearTimeout(handle);
    });
    const contsub = sandbox.subscribeResume(() => {
      start = Date.now();
      const remaining = Math.floor((timeout || 0) - elapsed);
      handle = setTimeout(exec, remaining, ...args);
      sandbox.setTimeoutHandles.set(sandBoxhandle, handle);
    });
    return sandBoxhandle;
  }
}

export function sandboxedClearTimeout(context: IExecContext): SandboxClearTimeout {
  return function sandboxClearTimeout(handle: number) {
    const sandbox = context.ctx.sandbox;
    const timeoutHandle = sandbox.setTimeoutHandles.get(handle);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      sandbox.setTimeoutHandles.delete(handle);
    }
  }
}
export function sandboxedClearInterval(context: IExecContext): SandboxClearInterval {
  return function sandboxClearInterval(handle: number) {
    const sandbox = context.ctx.sandbox;
    const intervalHandle = sandbox.setIntervalHandles.get(handle);
    if (intervalHandle) {
      clearInterval(intervalHandle.handle);
      sandbox.setIntervalHandles.delete(handle);
      intervalHandle.haltsub.unsubscribe();
      intervalHandle.contsub.unsubscribe();
    }
  }
}
    
export function sandboxedSetInterval(func: SandboxFunction, context: IExecContext): SandboxSetInterval {
  return function sandboxSetInterval(handler, timeout, ...args) {
    const sandbox = context.ctx.sandbox;
    const h = typeof handler === 'string' ? func(handler) : handler;
    const exec = (...a: any[]) => {
      start = Date.now();
      elapsed = 0;
      return h(...a);
    };

    const sandBoxhandle = ++sandbox.timeoutHandleCounter;

    let start = Date.now();
    let handle: any = setInterval(exec, timeout, ...args);
    
    let elapsed = 0;
    const haltsub = sandbox.subscribeHalt(() => {
      elapsed = Date.now() - start + elapsed
      clearInterval(handle); 
    });
    const contsub = sandbox.subscribeResume(() => {
      start = Date.now();
      handle = setTimeout(() => {
        start = Date.now();
        elapsed = 0;
        handle = setInterval(exec, timeout, ...args);
        exec(...args);
      }, Math.floor((timeout || 0) - elapsed), ...args);
      handlObj.handle = handle;
    });

    const handlObj = {
      handle,
      haltsub,
      contsub,
    }
    sandbox.setIntervalHandles.set(sandBoxhandle, handlObj);
    return sandBoxhandle;
  };
}
