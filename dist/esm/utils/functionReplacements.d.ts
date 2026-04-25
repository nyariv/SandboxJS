import { IExecContext } from './types';
/**
 * Checks if adding `expectTicks` would exceed the tick limit, and throws SandboxExecutionQuotaExceededError
 * (which bypasses user try/catch) if so. Otherwise increments the tick counter.
 */
export declare function checkTicksAndThrow(ctx: IExecContext, expectTicks: bigint): void;
export declare const typedArrayProtos: Set<any>;
type Factory = (ctx: IExecContext) => Function;
export declare const DEFAULT_FUNCTION_REPLACEMENTS: Map<Function, Factory>;
export declare const THIS_DEPENDENT_FUNCTION_REPLACEMENTS: Set<Function>;
export {};
