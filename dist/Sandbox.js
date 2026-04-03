import { createExecContext } from './utils.js';
export { LocalScope, SandboxAccessError, SandboxCapabilityError, SandboxError, SandboxExecutionTreeError } from './utils.js';
import { createFunction, createFunctionAsync } from './executor.js';
import parse, { lispifyFunction } from './parser.js';
import SandboxExec from './SandboxExec.js';

function createEvalContext() {
    return {
        sandboxFunction,
        sandboxAsyncFunction,
        sandboxedEval,
        sandboxedSetTimeout,
        sandboxedSetInterval,
        sandboxedClearTimeout,
        sandboxedClearInterval,
        lispifyFunction,
    };
}
function SB() { }
function sandboxFunction(context) {
    SandboxFunction.prototype = SB.prototype;
    return SandboxFunction;
    function SandboxFunction(...params) {
        const code = params.pop() || '';
        const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
        return createFunction(params, parsed.tree, context.ctx.ticks, {
            ...context,
            constants: parsed.constants,
            tree: parsed.tree,
        }, undefined, 'anonymous');
    }
}
function SAF() { }
function sandboxAsyncFunction(context) {
    SandboxAsyncFunction.prototype = SAF.prototype;
    return SandboxAsyncFunction;
    function SandboxAsyncFunction(...params) {
        const code = params.pop() || '';
        const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
        return createFunctionAsync(params, parsed.tree, context.ctx.ticks, {
            ...context,
            constants: parsed.constants,
            tree: parsed.tree,
        }, undefined, 'anonymous');
    }
}
function SE() { }
function sandboxedEval(func, context) {
    sandboxEval.prototype = SE.prototype;
    return sandboxEval;
    function sandboxEval(code) {
        // Parse the code and wrap last statement in return for completion value
        const parsed = parse(code, false, false, context.ctx.options.maxParserRecursionDepth);
        const tree = wrapLastStatementInReturn(parsed.tree);
        // Create and execute function with modified tree
        return createFunction([], tree, context.ctx.ticks, {
            ...context,
            constants: parsed.constants,
            tree,
        }, undefined, 'anonymous')();
    }
}
function wrapLastStatementInReturn(tree) {
    if (tree.length === 0)
        return tree;
    const newTree = [...tree];
    const lastIndex = newTree.length - 1;
    const lastStmt = newTree[lastIndex];
    // Only wrap if it's not already a return or throw
    if (Array.isArray(lastStmt) && lastStmt.length >= 1) {
        const op = lastStmt[0];
        // Don't wrap Return (8) or Throw (47) - they already control flow
        if (op === 8 /* LispType.Return */ || op === 46 /* LispType.Throw */) {
            return newTree;
        }
        // List of statement types that should have undefined completion value
        // These match JavaScript semantics where declarations and control structures
        // don't produce a completion value
        const statementTypes = [
            3 /* LispType.Let */, // 3
            4 /* LispType.Const */, // 4
            34 /* LispType.Var */, // 35
            37 /* LispType.Function */, // 38
            13 /* LispType.If */, // 14
            38 /* LispType.Loop */, // 39
            39 /* LispType.Try */, // 40
            40 /* LispType.Switch */, // 41
            42 /* LispType.Block */, // 43
            43 /* LispType.Expression */, // 44
        ];
        // If the last statement is a declaration or control structure,
        // don't wrap it (it will naturally return undefined)
        if (statementTypes.includes(op)) {
            return newTree;
        }
        // For all other types (expressions, operators, etc.),
        // wrap in return to capture the completion value
        newTree[lastIndex] = [8 /* LispType.Return */, 0 /* LispType.None */, lastStmt];
    }
    return newTree;
}
function sST() { }
function sandboxedSetTimeout(func, context) {
    sandboxSetTimeout.prototype = sST.prototype;
    return sandboxSetTimeout;
    function sandboxSetTimeout(handler, timeout, ...args) {
        const sandbox = context.ctx.sandbox;
        const exec = (...a) => {
            const h = typeof handler === 'string' ? func(handler) : handler;
            haltsub.unsubscribe();
            contsub.unsubscribe();
            sandbox.setTimeoutHandles.delete(sandBoxhandle);
            return h(...a);
        };
        const sandBoxhandle = ++sandbox.timeoutHandleCounter;
        let start = Date.now();
        let handle = setTimeout(exec, timeout, ...args);
        let elapsed = 0;
        const haltsub = sandbox.subscribeHalt(() => {
            elapsed = Date.now() - start + elapsed;
            clearTimeout(handle);
        });
        const contsub = sandbox.subscribeResume(() => {
            start = Date.now();
            const remaining = Math.floor((timeout || 0) - elapsed);
            handle = setTimeout(exec, remaining, ...args);
            sandbox.setTimeoutHandles.set(sandBoxhandle, {
                handle,
                haltsub,
                contsub,
            });
        });
        sandbox.setTimeoutHandles.set(sandBoxhandle, {
            handle,
            haltsub,
            contsub,
        });
        return sandBoxhandle;
    }
}
function sCT() { }
function sandboxedClearTimeout(context) {
    sandboxClearTimeout.prototype = sCT.prototype;
    return sandboxClearTimeout;
    function sandboxClearTimeout(handle) {
        const sandbox = context.ctx.sandbox;
        const timeoutHandle = sandbox.setTimeoutHandles.get(handle);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle.handle);
            timeoutHandle.haltsub.unsubscribe();
            timeoutHandle.contsub.unsubscribe();
            sandbox.setTimeoutHandles.delete(handle);
        }
    }
}
function sCI() { }
function sandboxedClearInterval(context) {
    sandboxClearInterval.prototype = sCI.prototype;
    return sandboxClearInterval;
    function sandboxClearInterval(handle) {
        const sandbox = context.ctx.sandbox;
        const intervalHandle = sandbox.setIntervalHandles.get(handle);
        if (intervalHandle) {
            clearInterval(intervalHandle.handle);
            intervalHandle.haltsub.unsubscribe();
            intervalHandle.contsub.unsubscribe();
            sandbox.setIntervalHandles.delete(handle);
        }
    }
}
function sSI() { }
function sandboxedSetInterval(func, context) {
    sandboxSetInterval.prototype = sSI.prototype;
    return sandboxSetInterval;
    function sandboxSetInterval(handler, timeout, ...args) {
        const sandbox = context.ctx.sandbox;
        const h = typeof handler === 'string' ? func(handler) : handler;
        const exec = (...a) => {
            start = Date.now();
            elapsed = 0;
            return h(...a);
        };
        const sandBoxhandle = ++sandbox.timeoutHandleCounter;
        let start = Date.now();
        let handle = setInterval(exec, timeout, ...args);
        let elapsed = 0;
        const haltsub = sandbox.subscribeHalt(() => {
            elapsed = Date.now() - start + elapsed;
            clearInterval(handle);
        });
        const contsub = sandbox.subscribeResume(() => {
            start = Date.now();
            handle = setTimeout(() => {
                start = Date.now();
                elapsed = 0;
                handle = setInterval(exec, timeout, ...args);
                exec(...args);
            }, Math.floor((timeout || 0) - elapsed), ...args);
            handlObj.handle = handle;
        });
        const handlObj = {
            handle,
            haltsub,
            contsub,
        };
        sandbox.setIntervalHandles.set(sandBoxhandle, handlObj);
        return sandBoxhandle;
    }
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
        return sandbox.executeTree(createExecContext(sandbox, parse(code, true, false, sandbox.context.options.maxParserRecursionDepth), createEvalContext()), scopes);
    }
    static parse(code) {
        return parse(code);
    }
    compile(code, optimize = false) {
        const parsed = parse(code, optimize, false, this.context.options.maxParserRecursionDepth);
        const exec = (...scopes) => {
            const context = createExecContext(this, parsed, this.evalContext);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileAsync(code, optimize = false) {
        const parsed = parse(code, optimize, false, this.context.options.maxParserRecursionDepth);
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
        const parsed = parse(code, optimize, true, this.context.options.maxParserRecursionDepth);
        const exec = (...scopes) => {
            const context = createExecContext(this, parsed, this.evalContext);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileExpressionAsync(code, optimize = false) {
        const parsed = parse(code, optimize, true, this.context.options.maxParserRecursionDepth);
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
