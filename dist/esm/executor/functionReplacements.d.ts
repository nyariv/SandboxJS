import { IContext } from '../utils/types';
/**
 * Checks if adding `expectTicks` would exceed the tick limit, and throws SandboxHaltError
 * (which bypasses user try/catch) if so. Otherwise increments the tick counter.
 */
export declare function checkTicksAndThrow(ctx: IContext, expectTicks: bigint): void;
export declare const typedArrayProtos: Set<any>;
type Factory = (ctx: IContext) => Function;
export declare const DEFAULT_FUNCTION_REPLACEMENTS: Map<Function, Factory>;
export {};
