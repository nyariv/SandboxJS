//#region src/utils/errors.ts
var SandboxError = class extends Error {};
var SandboxExecutionQuotaExceededError = class extends SandboxError {};
var SandboxExecutionTreeError = class extends SandboxError {};
var SandboxCapabilityError = class extends SandboxError {};
var SandboxAccessError = class extends SandboxError {};
var DelayedSynchronousResult = class {
	constructor(cb) {
		this.result = cb();
	}
};
function delaySynchronousResult(cb) {
	return new DelayedSynchronousResult(cb);
}
//#endregion
export { DelayedSynchronousResult, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError, delaySynchronousResult };

//# sourceMappingURL=errors.js.map