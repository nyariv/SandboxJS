import { SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError } from "./utils/errors.js";
import { AsyncFunction } from "./utils/types.js";
import { LocalScope, delaySynchronousResult, sanitizeScopes } from "./utils/Scope.js";
import { createExecContext } from "./utils/ExecContext.js";
import "./utils/index.js";
import parse, { ParseError } from "./parser/parserUtils.js";
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
	get Function() {
		return createExecContext(this, {
			tree: [],
			constants: {
				strings: [],
				eager: true,
				literals: [],
				maxDepth: this.context.options.maxParserRecursionDepth,
				regexes: []
			}
		}, this.evalContext).evals.get(Function);
	}
	get AsyncFunction() {
		return createExecContext(this, {
			tree: [],
			constants: {
				strings: [],
				eager: true,
				literals: [],
				maxDepth: this.context.options.maxParserRecursionDepth,
				regexes: []
			}
		}, this.evalContext).evals.get(AsyncFunction);
	}
	get eval() {
		return createExecContext(this, {
			tree: [],
			constants: {
				strings: [],
				eager: true,
				literals: [],
				maxDepth: this.context.options.maxParserRecursionDepth,
				regexes: []
			}
		}, this.evalContext).evals.get(eval);
	}
	compile(code, optimize = false) {
		if (this.context.options.nonBlocking) throw new SandboxCapabilityError("Non-blocking mode is enabled, use Sandbox.compileAsync() instead.");
		const parsed = parse(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const context = createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			sanitizeScopes(scopes, context);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileAsync(code, optimize = false) {
		const parsed = parse(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const context = createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			sanitizeScopes(scopes, context);
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
	compileExpression(code, optimize = false) {
		const parsed = parse(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const context = createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			sanitizeScopes(scopes, context);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileExpressionAsync(code, optimize = false) {
		const parsed = parse(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const context = createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
};
//#endregion
export { LocalScope, ParseError, Sandbox, Sandbox as default, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionQuotaExceededError, SandboxExecutionTreeError, delaySynchronousResult };

//# sourceMappingURL=Sandbox.js.map