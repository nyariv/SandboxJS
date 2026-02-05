'use strict';

// Reusable AsyncFunction constructor reference
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
const GeneratorFunction = Object.getPrototypeOf(function* () { }).constructor;
const AsyncGeneratorFunction = Object.getPrototypeOf(async function* () { }).constructor;
const SandboxGlobal = function SandboxGlobal(globals) {
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
        const asyncFunc = evalContext.sandboxAsyncFunction(execContext);
        evals.set(Function, func);
        evals.set(AsyncFunction, asyncFunc);
        evals.set(GeneratorFunction, func);
        evals.set(AsyncGeneratorFunction, asyncFunc);
        evals.set(eval, evalContext.sandboxedEval(func));
        evals.set(setTimeout, evalContext.sandboxedSetTimeout(func));
        evals.set(setInterval, evalContext.sandboxedSetInterval(func));
        for (const [key, value] of evals) {
            sandbox.context.prototypeWhitelist.set(value.prototype, new Set());
            sandbox.context.prototypeWhitelist.set(key.prototype, new Set());
        }
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
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'null',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
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
    get(key) {
        const isThis = key === 'this';
        const scope = this.getWhereValScope(key, isThis);
        if (scope && isThis) {
            return new Prop({ this: scope.functionThis }, key, true, false, true);
        }
        if (!scope) {
            return new Prop(undefined, key);
        }
        return new Prop(scope.allVars, key, key in scope.const, key in scope.globals, true);
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
        if (prop.context === null) {
            throw new TypeError(`Cannot set properties of null, (setting '${key}')`);
        }
        if (prop.isConst) {
            throw new TypeError(`Cannot assign to const variable '${key}'`);
        }
        if (prop.isGlobal) {
            throw new SandboxError(`Cannot override global variable '${key}'`);
        }
        prop.context[prop.prop] = val;
        return prop;
    }
    getWhereValScope(key, isThis = false) {
        if (isThis) {
            if (this.functionThis !== undefined) {
                return this;
            }
            else {
                return this.parent?.getWhereValScope(key, isThis) || null;
            }
        }
        if (key in this.allVars) {
            return this;
        }
        return this.parent?.getWhereValScope(key, isThis) || null;
    }
    getWhereVarScope(key, localScope = false) {
        if (key in this.allVars) {
            return this;
        }
        if (this.parent === null || localScope || this.functionThis !== undefined) {
            return this;
        }
        return this.parent.getWhereVarScope(key, localScope);
    }
    declare(key, type, value = undefined, isGlobal = false) {
        if (key === 'this')
            throw new SyntaxError('"this" cannot be declared');
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        const existingScope = this.getWhereVarScope(key, type !== "var" /* VarType.var */);
        if (type === "var" /* VarType.var */) {
            if (existingScope.var[key]) {
                existingScope.allVars[key] = value;
                if (!isGlobal) {
                    delete existingScope.globals[key];
                }
                else {
                    existingScope.globals[key] = true;
                }
                return new Prop(existingScope.allVars, key, false, existingScope.globals[key], true);
            }
            else if (key in existingScope.allVars) {
                throw new SyntaxError(`Identifier '${key}' has already been declared`);
            }
        }
        if (key in existingScope.allVars) {
            throw new SyntaxError(`Identifier '${key}' has already been declared`);
        }
        if (isGlobal) {
            existingScope.globals[key] = true;
        }
        existingScope[type][key] = true;
        existingScope.allVars[key] = value;
        return new Prop(this.allVars, key, type === "const" /* VarType.const */, isGlobal, true);
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
            throw new ReferenceError(`${this.prop.toString()} is not defined`);
        if (ctx === null)
            throw new TypeError(`Cannot read properties of null, (reading '${this.prop.toString()}')`);
        context.getSubscriptions.forEach((cb) => cb(ctx, this.prop.toString()));
        return ctx[this.prop];
    }
}
function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.AsyncFunction = AsyncFunction;
exports.AsyncGeneratorFunction = AsyncGeneratorFunction;
exports.CodeString = CodeString;
exports.ExecContext = ExecContext;
exports.FunctionScope = FunctionScope;
exports.GeneratorFunction = GeneratorFunction;
exports.LocalScope = LocalScope;
exports.Prop = Prop;
exports.SandboxError = SandboxError;
exports.SandboxGlobal = SandboxGlobal;
exports.Scope = Scope;
exports.createContext = createContext;
exports.createExecContext = createExecContext;
exports.hasOwnProperty = hasOwnProperty;
exports.isLisp = isLisp;
exports.reservedWords = reservedWords;
