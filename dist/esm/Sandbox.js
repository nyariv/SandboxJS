import { LocalScope, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionTreeError, createExecContext, delaySynchronousResult } from "./utils.js";
import parse from "./parser.js";
import { createEvalContext } from "./eval.js";
import SandboxExec from "./SandboxExec.js";
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
export { LocalScope, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionTreeError, Sandbox as default, delaySynchronousResult };

//# sourceMappingURL=Sandbox.js.map