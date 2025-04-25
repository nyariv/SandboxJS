import { lispifyFunction } from './parser.js';
import { IExecContext, Ticks } from './utils.js';
export interface IEvalContext {
    sandboxFunction: typeof sandboxFunction;
    sandboxedEval: typeof sandboxedEval;
    sandboxedSetTimeout: typeof sandboxedSetTimeout;
    sandboxedSetInterval: typeof sandboxedSetInterval;
    lispifyFunction: typeof lispifyFunction;
}
export type SandboxFunction = (code: string, ...args: string[]) => () => unknown;
export type SandboxEval = (code: string) => unknown;
export type SandboxSetTimeout = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type SandboxSetInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export declare function createEvalContext(): IEvalContext;
export declare function sandboxFunction(context: IExecContext, ticks?: Ticks): SandboxFunction;
export declare function sandboxedEval(func: SandboxFunction): SandboxEval;
export declare function sandboxedSetTimeout(func: SandboxFunction): SandboxSetTimeout;
export declare function sandboxedSetInterval(func: SandboxFunction): SandboxSetInterval;
