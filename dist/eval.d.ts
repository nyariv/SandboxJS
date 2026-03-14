import { lispifyFunction } from './parser.js';
import { IExecContext } from './utils.js';
export interface IEvalContext {
    sandboxFunction: typeof sandboxFunction;
    sandboxAsyncFunction: typeof sandboxAsyncFunction;
    sandboxedEval: (func: SandboxFunction, context: IExecContext) => SandboxEval;
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
export declare function sandboxFunction(context: IExecContext): SandboxFunction;
export type SandboxAsyncFunction = (code: string, ...args: string[]) => () => Promise<unknown>;
export declare function sandboxAsyncFunction(context: IExecContext): SandboxAsyncFunction;
export declare function sandboxedEval(func: SandboxFunction, context: IExecContext): SandboxEval;
export declare function sandboxedSetTimeout(func: SandboxFunction, context: IExecContext): SandboxSetTimeout;
export declare function sandboxedClearTimeout(context: IExecContext): SandboxClearTimeout;
export declare function sandboxedClearInterval(context: IExecContext): SandboxClearInterval;
export declare function sandboxedSetInterval(func: SandboxFunction, context: IExecContext): SandboxSetInterval;
