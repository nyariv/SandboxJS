//#region src/utils/errors.ts
var SandboxError = class extends Error {};
var SandboxExecutionQuotaExceededError = class extends SandboxError {};
var SandboxExecutionTreeError = class extends SandboxError {};
var SandboxCapabilityError = class extends SandboxError {};
var SandboxAccessError = class extends SandboxError {};
//#endregion
exports.SandboxAccessError = SandboxAccessError;
exports.SandboxCapabilityError = SandboxCapabilityError;
exports.SandboxError = SandboxError;
exports.SandboxExecutionQuotaExceededError = SandboxExecutionQuotaExceededError;
exports.SandboxExecutionTreeError = SandboxExecutionTreeError;
