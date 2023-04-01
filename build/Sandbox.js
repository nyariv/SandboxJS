import { createExecContext } from './utils.js';
import { createEvalContext } from './eval.js';
import parse from './parser.js';
import SandboxExec from './SandboxExec.js';
export default class Sandbox extends SandboxExec {
    constructor(options) {
        super(options, createEvalContext());
    }
    static audit(code, scopes = []) {
        const globals = {};
        for (const i of Object.getOwnPropertyNames(globalThis)) {
            globals[i] = globalThis[i];
        }
        const sandbox = new SandboxExec({
            globals,
            audit: true,
        });
        return sandbox.executeTree(createExecContext(sandbox, parse(code, true), createEvalContext()), scopes);
    }
    static parse(code) {
        return parse(code);
    }
    compile(code, optimize = false) {
        const parsed = parse(code, optimize);
        const exec = (...scopes) => {
            const context = createExecContext(this, parsed, this.evalContext);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileAsync(code, optimize = false) {
        const parsed = parse(code, optimize);
        const exec = (...scopes) => {
            const context = createExecContext(this, parsed, this.evalContext);
            return {
                context,
                run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result),
            };
        };
        return exec;
    }
    compileExpression(code, optimize = false) {
        const parsed = parse(code, optimize, true);
        const exec = (...scopes) => {
            const context = createExecContext(this, parsed, this.evalContext);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileExpressionAsync(code, optimize = false) {
        const parsed = parse(code, optimize, true);
        const exec = (...scopes) => {
            const context = createExecContext(this, parsed, this.evalContext);
            return {
                context,
                run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result),
            };
        };
        return exec;
    }
}
