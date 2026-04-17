import { IExecContext, IScope } from './types';

export class SandboxError extends Error {}

export class SandboxExecutionQuotaExceededError extends SandboxError {}

export class SandboxExecutionTreeError extends SandboxError {}

export class SandboxCapabilityError extends SandboxError {}

export class SandboxAccessError extends SandboxError {}
