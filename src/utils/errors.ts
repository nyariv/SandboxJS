import { IExecContext, IScope } from './types';

export class SandboxError extends Error {}

export class SandboxExecutionQuotaExceededError extends SandboxError {}

export class SandboxExecutionTreeError extends SandboxError {}

export class SandboxCapabilityError extends SandboxError {}

export class SandboxAccessError extends SandboxError {}

/**
 * Thrown by function replacements when the execution quota is exceeded.
 * This error bypasses user try/catch blocks and cannot be caught by sandboxed code.
 */
export class SandboxHaltError extends SandboxError {
  constructor(public readonly cause: SandboxError) {
    super(cause.message);
    this.name = 'SandboxHaltError';
  }
}
