import { lispifyFunction } from './parser.js';
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
export type SandboxSetTimeout = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type SandboxSetInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type SandboxClearTimeout = (handle: number) => void;
export type SandboxClearInterval = (handle: number) => void;
export declare function createEvalContext(): IEvalContext;
export declare function sandboxFunction(context: IExecContext, ticks?: Ticks): SandboxFunction;
export type SandboxAsyncFunction = (code: string, ...args: string[]) => () => Promise<unknown>;
export declare function sandboxAsyncFunction(context: IExecContext, ticks?: Ticks): SandboxAsyncFunction;
export declare function sandboxedEval(func: SandboxFunction): SandboxEval;
export declare function sandboxedSetTimeout(func: SandboxFunction, context: IExecContext): SandboxSetTimeout;
export declare function sandboxedClearTimeout(context: IExecContext): SandboxClearTimeout;
export declare function sandboxedClearInterval(context: IExecContext): SandboxClearInterval;
export declare function sandboxedSetInterval(func: SandboxFunction, context: IExecContext): SandboxSetInterval;
