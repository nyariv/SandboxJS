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
/**
 * Thrown by function replacements when the execution quota is exceeded.
 * This error bypasses user try/catch blocks and cannot be caught by sandboxed code.
 */
export declare class SandboxHaltError extends SandboxError {
    readonly cause: SandboxError;
    constructor(cause: SandboxError);
}
