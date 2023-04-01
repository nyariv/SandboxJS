const SandboxGlobal = function SandboxGlobal(globals) {
    if (globals === globalThis)
        return globalThis;
    for (const i in globals) {
        this[i] = globals[i];
    }
};
class ExecContext {
    constructor(ctx, constants, tree, getSubscriptions, setSubscriptions, changeSubscriptions, setSubscriptionsGlobal, changeSubscriptionsGlobal, evals, registerSandboxFunction, allowJit, evalContext) {
        this.ctx = ctx;
        this.constants = constants;
        this.tree = tree;
        this.getSubscriptions = getSubscriptions;
        this.setSubscriptions = setSubscriptions;
        this.changeSubscriptions = changeSubscriptions;
        this.setSubscriptionsGlobal = setSubscriptionsGlobal;
        this.changeSubscriptionsGlobal = changeSubscriptionsGlobal;
        this.evals = evals;
        this.registerSandboxFunction = registerSandboxFunction;
        this.allowJit = allowJit;
        this.evalContext = evalContext;
    }
}
function createContext(sandbox, options) {
    const sandboxGlobal = new SandboxGlobal(options.globals);
    const context = {
        sandbox: sandbox,
        globalsWhitelist: new Set(Object.values(options.globals)),
        prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
        options,
        globalScope: new Scope(null, options.globals, sandboxGlobal),
        sandboxGlobal,
    };
    context.prototypeWhitelist.set(Object.getPrototypeOf([][Symbol.iterator]()), new Set());
    return context;
}
function createExecContext(sandbox, executionTree, evalContext) {
    const evals = new Map();
    const execContext = new ExecContext(sandbox.context, executionTree.constants, executionTree.tree, new Set(), new WeakMap(), new WeakMap(), sandbox.setSubscriptions, sandbox.changeSubscriptions, evals, (fn) => sandbox.sandboxFunctions.set(fn, execContext), !!evalContext, evalContext);
    if (evalContext) {
        const func = evalContext.sandboxFunction(execContext);
        evals.set(Function, func);
        evals.set(eval, evalContext.sandboxedEval(func));
        evals.set(setTimeout, evalContext.sandboxedSetTimeout(func));
        evals.set(setInterval, evalContext.sandboxedSetInterval(func));
    }
    return execContext;
}
class CodeString {
    constructor(str) {
        this.ref = { str: '' };
        if (str instanceof CodeString) {
            this.ref = str.ref;
            this.start = str.start;
            this.end = str.end;
        }
        else {
            this.ref.str = str;
            this.start = 0;
            this.end = str.length;
        }
    }
    substring(start, end) {
        if (!this.length)
            return this;
        start = this.start + start;
        if (start < 0) {
            start = 0;
        }
        if (start > this.end) {
            start = this.end;
        }
        end = end === undefined ? this.end : this.start + end;
        if (end < 0) {
            end = 0;
        }
        if (end > this.end) {
            end = this.end;
        }
        const code = new CodeString(this);
        code.start = start;
        code.end = end;
        return code;
    }
    get length() {
        const len = this.end - this.start;
        return len < 0 ? 0 : len;
    }
    char(i) {
        if (this.start === this.end)
            return undefined;
        return this.ref.str[this.start + i];
    }
    toString() {
        return this.ref.str.substring(this.start, this.end);
    }
    trimStart() {
        const found = /^\s+/.exec(this.toString());
        const code = new CodeString(this);
        if (found) {
            code.start += found[0].length;
        }
        return code;
    }
    slice(start, end) {
        if (start < 0) {
            start = this.end - this.start + start;
        }
        if (start < 0) {
            start = 0;
        }
        if (end === undefined) {
            end = this.end - this.start;
        }
        if (end < 0) {
            end = this.end - this.start + end;
        }
        if (end < 0) {
            end = 0;
        }
        return this.substring(start, end);
    }
    trim() {
        const code = this.trimStart();
        const found = /\s+$/.exec(code.toString());
        if (found) {
            code.end -= found[0].length;
        }
        return code;
    }
    valueOf() {
        return this.toString();
    }
}
function keysOnly(obj) {
    const ret = Object.assign({}, obj);
    for (const key in ret) {
        ret[key] = true;
    }
    return ret;
}
const reservedWords = new Set([
    'instanceof',
    'typeof',
    'return',
    'try',
    'catch',
    'if',
    'finally',
    'else',
    'in',
    'of',
    'var',
    'let',
    'const',
    'for',
    'delete',
    'false',
    'true',
    'while',
    'do',
    'break',
    'continue',
    'new',
    'function',
    'async',
    'await',
    'switch',
    'case',
]);
class Scope {
    constructor(parent, vars = {}, functionThis) {
        this.const = {};
        this.let = {};
        this.var = {};
        const isFuncScope = functionThis !== undefined || parent === null;
        this.parent = parent;
        this.allVars = vars;
        this.let = isFuncScope ? this.let : keysOnly(vars);
        this.var = isFuncScope ? keysOnly(vars) : this.var;
        this.globals = parent === null ? keysOnly(vars) : {};
        this.functionThis = functionThis;
    }
    get(key, functionScope = false) {
        const functionThis = this.functionThis;
        if (key === 'this' && functionThis !== undefined) {
            return new Prop({ this: functionThis }, key, true, false, true);
        }
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        if (this.parent === null || !functionScope || functionThis !== undefined) {
            if (this.globals.hasOwnProperty(key)) {
                return new Prop(functionThis, key, false, true, true);
            }
            if (key in this.allVars && (!(key in {}) || this.allVars.hasOwnProperty(key))) {
                return new Prop(this.allVars, key, this.const.hasOwnProperty(key), this.globals.hasOwnProperty(key), true);
            }
            if (this.parent === null) {
                return new Prop(undefined, key);
            }
        }
        return this.parent.get(key, functionScope);
    }
    set(key, val) {
        if (key === 'this')
            throw new SyntaxError('"this" cannot be assigned');
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        const prop = this.get(key);
        if (prop.context === undefined) {
            throw new ReferenceError(`Variable '${key}' was not declared.`);
        }
        if (prop.isConst) {
            throw new TypeError(`Cannot assign to const variable '${key}'`);
        }
        if (prop.isGlobal) {
            throw new SandboxError(`Cannot override global variable '${key}'`);
        }
        if (!(prop.context instanceof Object))
            throw new SandboxError('Scope is not an object');
        prop.context[prop.prop] = val;
        return prop;
    }
    declare(key, type, value = undefined, isGlobal = false) {
        if (key === 'this')
            throw new SyntaxError('"this" cannot be declared');
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        if (type === 'var' && this.functionThis === undefined && this.parent !== null) {
            return this.parent.declare(key, type, value, isGlobal);
        }
        else if ((this[type].hasOwnProperty(key) && type !== 'const' && !this.globals.hasOwnProperty(key)) ||
            !(key in this.allVars)) {
            if (isGlobal) {
                this.globals[key] = true;
            }
            this[type][key] = true;
            this.allVars[key] = value;
        }
        else {
            throw new SandboxError(`Identifier '${key}' has already been declared`);
        }
        return new Prop(this.allVars, key, this.const.hasOwnProperty(key), isGlobal);
    }
}
class FunctionScope {
}
class LocalScope {
}
class SandboxError extends Error {
}
function isLisp(item) {
    return (Array.isArray(item) &&
        typeof item[0] === 'number' &&
        item[0] !== 0 /* LispType.None */ &&
        item[0] !== 88 /* LispType.True */);
}
class Prop {
    constructor(context, prop, isConst = false, isGlobal = false, isVariable = false) {
        this.context = context;
        this.prop = prop;
        this.isConst = isConst;
        this.isGlobal = isGlobal;
        this.isVariable = isVariable;
    }
    get(context) {
        const ctx = this.context;
        if (ctx === undefined)
            throw new ReferenceError(`${this.prop} is not defined`);
        if (ctx === null)
            throw new TypeError(`Cannot read properties of null, (reading '${this.prop}')`);
        context.getSubscriptions.forEach((cb) => cb(ctx, this.prop));
        return ctx[this.prop];
    }
}

export { CodeString, ExecContext, FunctionScope, LocalScope, Prop, SandboxError, SandboxGlobal, Scope, createContext, createExecContext, isLisp };
//# sourceMappingURL=utils.js.map
