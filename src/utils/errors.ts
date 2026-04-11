export class SandboxError extends Error {}

export class SandboxExecutionQuotaExceededError extends SandboxError {}

export class SandboxExecutionTreeError extends SandboxError {}

export class SandboxCapabilityError extends SandboxError {}

export class SandboxAccessError extends SandboxError {}

export class DelayedSynchronousResult {
  readonly result: unknown;
  constructor(cb: () => unknown) {
    this.result = cb();
  }
}

export function delaySynchronousResult(cb: () => unknown) {
  return new DelayedSynchronousResult(cb);
}
