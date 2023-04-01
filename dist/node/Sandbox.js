'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var utils = require('./utils.js');
var executor = require('./executor.js');
var parser = require('./parser.js');
var SandboxExec = require('./SandboxExec.js');

function createEvalContext() {
    return {
        sandboxFunction,
        sandboxedEval,
        sandboxedSetTimeout,
        sandboxedSetInterval,
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

exports.default = Sandbox;
