Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
const require_errors = require("./utils/errors.js");
const require_types = require("./utils/types.js");
const require_Scope = require("./utils/Scope.js");
const require_ExecContext = require("./utils/ExecContext.js");
require("./utils/index.js");
const require_parserUtils = require("./parser/parserUtils.js");
require("./parser/index.js");
const require_index$2 = require("./eval/index.js");
const require_SandboxExec = require("./SandboxExec.js");
//#region src/Sandbox.ts
var Sandbox = class extends require_SandboxExec.SandboxExec {
	constructor(options) {
		super(options, require_index$2.createEvalContext());
	}
	static audit(code, scopes = []) {
		const globals = {};
		for (const i of Object.getOwnPropertyNames(globalThis)) globals[i] = globalThis[i];
		const sandbox = new require_SandboxExec.SandboxExec({
			globals,
			audit: true
		});
		return sandbox.executeTree(require_ExecContext.createExecContext(sandbox, require_parserUtils.default(code, true, false, sandbox.context.options.maxParserRecursionDepth), require_index$2.createEvalContext()), scopes);
	}
	static parse(code) {
		return require_parserUtils.default(code, true);
	}
	get Function() {
		return require_ExecContext.createExecContext(this, {
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
		return require_ExecContext.createExecContext(this, {
			tree: [],
			constants: {
				strings: [],
				eager: true,
				literals: [],
				maxDepth: this.context.options.maxParserRecursionDepth,
				regexes: []
			}
		}, this.evalContext).evals.get(require_types.AsyncFunction);
	}
	get eval() {
		return require_ExecContext.createExecContext(this, {
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
		if (this.context.options.nonBlocking) throw new require_errors.SandboxCapabilityError("Non-blocking mode is enabled, use Sandbox.compileAsync() instead.");
		const parsed = require_parserUtils.default(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const context = require_ExecContext.createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			require_Scope.sanitizeScopes(scopes, context);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileAsync(code, optimize = false) {
		const parsed = require_parserUtils.default(code, optimize, false, this.context.options.maxParserRecursionDepth);
		const context = require_ExecContext.createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			require_Scope.sanitizeScopes(scopes, context);
			return {
				context,
				run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result)
			};
		};
		return exec;
	}
	compileExpression(code, optimize = false) {
		const parsed = require_parserUtils.default(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const context = require_ExecContext.createExecContext(this, parsed, this.evalContext);
		const exec = (...scopes) => {
			require_Scope.sanitizeScopes(scopes, context);
			return {
				context,
				run: () => this.executeTree(context, [...scopes]).result
			};
		};
		return exec;
	}
	compileExpressionAsync(code, optimize = false) {
		const parsed = require_parserUtils.default(code, optimize, true, this.context.options.maxParserRecursionDepth);
		const context = require_ExecContext.createExecContext(this, parsed, this.evalContext);
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
exports.LocalScope = require_Scope.LocalScope;
exports.ParseError = require_parserUtils.ParseError;
exports.Sandbox = Sandbox;
exports.default = Sandbox;
exports.SandboxAccessError = require_errors.SandboxAccessError;
exports.SandboxCapabilityError = require_errors.SandboxCapabilityError;
exports.SandboxError = require_errors.SandboxError;
exports.SandboxExecutionQuotaExceededError = require_errors.SandboxExecutionQuotaExceededError;
exports.SandboxExecutionTreeError = require_errors.SandboxExecutionTreeError;
exports.delaySynchronousResult = require_Scope.delaySynchronousResult;
