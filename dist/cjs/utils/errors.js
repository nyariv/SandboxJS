//#region src/utils/errors.ts
var SandboxError = class extends Error {};
var SandboxExecutionQuotaExceededError = class extends SandboxError {};
var SandboxExecutionTreeError = class extends SandboxError {};
var SandboxCapabilityError = class extends SandboxError {};
var SandboxAccessError = class extends SandboxError {};
/**
* Thrown by function replacements when the execution quota is exceeded.
* This error bypasses user try/catch blocks and cannot be caught by sandboxed code.
*/
var SandboxHaltError = class extends SandboxError {
	constructor(cause) {
		super(cause.message);
		this.cause = cause;
		this.name = "SandboxHaltError";
	}
};
//#endregion
exports.SandboxAccessError = SandboxAccessError;
exports.SandboxCapabilityError = SandboxCapabilityError;
exports.SandboxError = SandboxError;
exports.SandboxExecutionQuotaExceededError = SandboxExecutionQuotaExceededError;
exports.SandboxExecutionTreeError = SandboxExecutionTreeError;
exports.SandboxHaltError = SandboxHaltError;
