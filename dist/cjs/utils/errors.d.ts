export declare class SandboxError extends Error {
}
export declare class SandboxExecutionQuotaExceededError extends SandboxError {
}
export declare class SandboxExecutionTreeError extends SandboxError {
}
export declare class SandboxCapabilityError extends SandboxError {
}
export declare class SandboxAccessError extends SandboxError {
}
export declare class DelayedSynchronousResult {
    readonly result: unknown;
    constructor(cb: () => unknown);
}
export declare function delaySynchronousResult(cb: () => unknown): DelayedSynchronousResult;
