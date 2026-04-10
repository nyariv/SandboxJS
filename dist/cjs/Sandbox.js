Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
const require_utils = require("./utils.js");
const require_parser = require("./parser.js");
const require_eval = require("./eval.js");
const require_SandboxExec = require("./SandboxExec.js");
//#region src/Sandbox.ts
var Sandbox = class extends require_SandboxExec.default {
	constructor(options) {
		super(options, require_eval.createEvalContext());
	}
	static audit(code, scopes = []) {
		const globals = {};
		for (const i of Object.getOwnPropertyNames(globalThis)) globals[i] = globalThis[i];
		const sandbox = new require_SandboxExec.default({
			globals,
			audit: true
		});
		return sandbox.executeTree(require_utils.createExecContext(sandbox, require_parser.default(code, true, false, sandbox.context.options.maxParserRecursionDepth), require_eval.createEvalContext()), scopes);
	}
	static parse(code) {
		return require_parser.default(code, true);
	}
	compile(code, optimize = false) {
		if (this.context.options.nonBlocking) throw new require_utils.SandboxCapabilityError("Non-blocking mode is enabled, use Sandbox.compileAsync() instead.");
		const parsed = require_parser.default(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = require_utils.createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileAsync(code, optimize = false) {
		const parsed = require_parser.default(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = require_utils.createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
	compileExpression(code, optimize = false) {
		const parsed = require_parser.default(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = require_utils.createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileExpressionAsync(code, optimize = false) {
		const parsed = require_parser.default(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = require_utils.createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
};
//#endregion
exports.LocalScope = require_utils.LocalScope;
exports.SandboxAccessError = require_utils.SandboxAccessError;
exports.SandboxCapabilityError = require_utils.SandboxCapabilityError;
exports.SandboxError = require_utils.SandboxError;
exports.SandboxExecutionQuotaExceededError = require_utils.SandboxExecutionQuotaExceededError;
exports.SandboxExecutionTreeError = require_utils.SandboxExecutionTreeError;
exports.default = Sandbox;
exports.delaySynchronousResult = require_utils.delaySynchronousResult;
