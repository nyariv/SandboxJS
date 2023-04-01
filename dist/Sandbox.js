import { createExecContext } from './utils.js';
import { createFunction, currentTicks } from './executor.js';
import parse, { lispifyFunction } from './parser.js';
import SandboxExec from './SandboxExec.js';

function createEvalContext() {
    return {
        sandboxFunction,
        sandboxedEval,
        sandboxedSetTimeout,
        sandboxedSetInterval,
        lispifyFunction,
    };
}
function sandboxFunction(context, ticks) {
    return SandboxFunction;
    function SandboxFunction(...params) {
        const code = params.pop() || '';
        const parsed = parse(code);
        return createFunction(params, parsed.tree, ticks || currentTicks.current, {
            ...context,
            constants: parsed.constants,
            tree: parsed.tree,
        }, undefined, 'anonymous');
    }
}
function sandboxedEval(func) {
    return sandboxEval;
    function sandboxEval(code) {
        return func(code)();
    }
}
function sandboxedSetTimeout(func) {
    return function sandboxSetTimeout(handler, ...args) {
        if (typeof handler !== 'string')
            return setTimeout(handler, ...args);
        return setTimeout(func(handler), ...args);
    };
}
function sandboxedSetInterval(func) {
    return function sandboxSetInterval(handler, ...args) {
        if (typeof handler !== 'string')
            return setInterval(handler, ...args);
        return setInterval(func(handler), ...args);
    };
}

class Sandbox extends SandboxExec {
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

export { Sandbox as default };
//# sourceMappingURL=Sandbox.js.map
