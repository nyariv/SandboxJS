//#region src/utils/errors.ts
var SandboxError = class extends Error {};
var SandboxExecutionQuotaExceededError = class extends SandboxError {};
var SandboxExecutionTreeError = class extends SandboxError {};
var SandboxCapabilityError = class extends SandboxError {};
var SandboxAccessError = class extends SandboxError {};
//#endregion
export { SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError };

//# sourceMappingURL=errors.js.map