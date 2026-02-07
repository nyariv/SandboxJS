'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var utils = require('./utils.js');
var executor = require('./executor.js');
var parser = require('./parser.js');
var SandboxExec = require('./SandboxExec.js');

function createEvalContext() {
    return {
        sandboxFunction,
        sandboxAsyncFunction,
        sandboxedEval,
        sandboxedSetTimeout,
        sandboxedSetInterval,
        sandboxedClearTimeout,
        sandboxedClearInterval,
        lispifyFunction: parser.lispifyFunction,
    };
}
function sandboxFunction(context, ticks) {
    return SandboxFunction;
    function SandboxFunction(...params) {
        const code = params.pop() || '';
        const parsed = parser.default(code);
        return executor.createFunction(params, parsed.tree, ticks || executor.currentTicks.current, {
            ...context,
            constants: parsed.constants,
            tree: parsed.tree,
        }, undefined, 'anonymous');
    }
}
function sandboxAsyncFunction(context, ticks) {
    return SandboxAsyncFunction;
    function SandboxAsyncFunction(...params) {
        const code = params.pop() || '';
        const parsed = parser.default(code);
        return executor.createFunctionAsync(params, parsed.tree, ticks || executor.currentTicks.current, {
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
function sandboxedSetTimeout(func, context) {
    return function sandboxSetTimeout(handler, timeout, ...args) {
        const sandbox = context.ctx.sandbox;
        const exec = (...a) => {
            const h = typeof handler === 'string' ? func(handler) : handler;
            haltsub.unsubscribe();
            contsub.unsubscribe();
            return h(...a);
        };
        const sandBoxhandle = ++sandbox.timeoutHandleCounter;
        let start = Date.now();
        let handle = setTimeout(exec, timeout, ...args);
        sandbox.setTimeoutHandles.set(sandBoxhandle, handle);
        let elapsed = 0;
        const haltsub = sandbox.subscribeHalt(() => {
            elapsed = Date.now() - start + elapsed;
            clearTimeout(handle);
        });
        const contsub = sandbox.subscribeResume(() => {
            start = Date.now();
            const remaining = Math.floor((timeout || 0) - elapsed);
            handle = setTimeout(exec, remaining, ...args);
            sandbox.setTimeoutHandles.set(sandBoxhandle, handle);
        });
        return sandBoxhandle;
    };
}
function sandboxedClearTimeout(context) {
    return function sandboxClearTimeout(handle) {
        const sandbox = context.ctx.sandbox;
        const timeoutHandle = sandbox.setTimeoutHandles.get(handle);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            sandbox.setTimeoutHandles.delete(handle);
        }
    };
}
function sandboxedClearInterval(context) {
    return function sandboxClearInterval(handle) {
        const sandbox = context.ctx.sandbox;
        const intervalHandle = sandbox.setIntervalHandles.get(handle);
        if (intervalHandle) {
            clearInterval(intervalHandle.handle);
            sandbox.setIntervalHandles.delete(handle);
            intervalHandle.haltsub.unsubscribe();
            intervalHandle.contsub.unsubscribe();
        }
    };
}
function sandboxedSetInterval(func, context) {
    return function sandboxSetInterval(handler, timeout, ...args) {
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
    };
}

class Sandbox extends SandboxExec.default {
    constructor(options) {
        super(options, createEvalContext());
    }
    static audit(code, scopes = []) {
        const globals = {};
        for (const i of Object.getOwnPropertyNames(globalThis)) {
            globals[i] = globalThis[i];
        }
        const sandbox = new SandboxExec.default({
            globals,
            audit: true,
        });
        return sandbox.executeTree(utils.createExecContext(sandbox, parser.default(code, true), createEvalContext()), scopes);
    }
    static parse(code) {
        return parser.default(code);
    }
    compile(code, optimize = false) {
        const parsed = parser.default(code, optimize);
        const exec = (...scopes) => {
            const context = utils.createExecContext(this, parsed, this.evalContext);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileAsync(code, optimize = false) {
        const parsed = parser.default(code, optimize);
        const exec = (...scopes) => {
            const context = utils.createExecContext(this, parsed, this.evalContext);
            return {
                context,
                run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result),
            };
        };
        return exec;
    }
    compileExpression(code, optimize = false) {
        const parsed = parser.default(code, optimize, true);
        const exec = (...scopes) => {
            const context = utils.createExecContext(this, parsed, this.evalContext);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileExpressionAsync(code, optimize = false) {
        const parsed = parser.default(code, optimize, true);
        const exec = (...scopes) => {
            const context = utils.createExecContext(this, parsed, this.evalContext);
            return {
                context,
                run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result),
            };
        };
        return exec;
    }
}

exports.LocalScope = utils.LocalScope;
exports.SandboxAccessError = utils.SandboxAccessError;
exports.SandboxCapabilityError = utils.SandboxCapabilityError;
exports.SandboxError = utils.SandboxError;
exports.SandboxExecutionTreeError = utils.SandboxExecutionTreeError;
exports.default = Sandbox;
