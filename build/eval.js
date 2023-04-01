import { createFunction, currentTicks } from './executor.js';
import parse, { lispifyFunction } from './parser.js';
export function createEvalContext() {
    return {
        sandboxFunction,
        sandboxedEval,
        sandboxedSetTimeout,
        sandboxedSetInterval,
        lispifyFunction,
    };
}
export function sandboxFunction(context, ticks) {
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
export function sandboxedEval(func) {
    return sandboxEval;
    function sandboxEval(code) {
        return func(code)();
    }
}
export function sandboxedSetTimeout(func) {
    return function sandboxSetTimeout(handler, ...args) {
        if (typeof handler !== 'string')
            return setTimeout(handler, ...args);
        return setTimeout(func(handler), ...args);
    };
}
export function sandboxedSetInterval(func) {
    return function sandboxSetInterval(handler, ...args) {
        if (typeof handler !== 'string')
            return setInterval(handler, ...args);
        return setInterval(func(handler), ...args);
    };
}
