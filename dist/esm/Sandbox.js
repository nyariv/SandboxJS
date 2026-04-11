import { SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError, delaySynchronousResult } from "./utils/errors.js";
import { LocalScope } from "./utils/Scope.js";
import { createExecContext } from "./utils/ExecContext.js";
import "./utils/index.js";
import parse from "./parser/parserUtils.js";
import "./parser/index.js";
import { createEvalContext } from "./eval/index.js";
import { SandboxExec } from "./SandboxExec.js";
//#region src/Sandbox.ts
var Sandbox = class extends SandboxExec {
	constructor(options) {
		super(options, createEvalContext());
	}
	static audit(code, scopes = []) {
		const globals = {};
		for (const i of Object.getOwnPropertyNames(globalThis)) globals[i] = globalThis[i];
		const sandbox = new SandboxExec({
			globals,
			audit: true
		});
		return sandbox.executeTree(createExecContext(sandbox, parse(code, true, false, sandbox.context.options.maxParserRecursionDepth), createEvalContext()), scopes);
	}
	static parse(code) {
		return parse(code, true);
	}
	compile(code, optimize = false) {
		if (this.context.options.nonBlocking) throw new SandboxCapabilityError("Non-blocking mode is enabled, use Sandbox.compileAsync() instead.");
		const parsed = parse(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileAsync(code, optimize = false) {
		const parsed = parse(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
	compileExpression(code, optimize = false) {
		const parsed = parse(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileExpressionAsync(code, optimize = false) {
		const parsed = parse(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const exec = (...scopes) => {
			const context = createExecContext(this, parsed, this.evalContext);
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
};
//#endregion
export { LocalScope, Sandbox, Sandbox as default, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError, delaySynchronousResult };

//# sourceMappingURL=Sandbox.js.map