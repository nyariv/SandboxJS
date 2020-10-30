import { SpreadArray, KeyVal, SpreadObject, If, Lisp, parse } from "./parser.js";
export class ExecReturn {
    constructor(auditReport, result, returned, breakLoop = false, continueLoop = false) {
        this.auditReport = auditReport;
        this.result = result;
        this.returned = returned;
        this.breakLoop = breakLoop;
        this.continueLoop = continueLoop;
    }
}
export class Prop {
    constructor(context, prop, isConst = false, isGlobal = false, isVariable = false) {
        this.context = context;
        this.prop = prop;
        this.isConst = isConst;
        this.isGlobal = isGlobal;
        this.isVariable = isVariable;
    }
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
    'case'
]);
var VarType;
(function (VarType) {
    VarType["let"] = "let";
    VarType["const"] = "const";
    VarType["var"] = "var";
})(VarType || (VarType = {}));
export class Scope {
    constructor(parent, vars = {}, functionThis) {
        this.const = new Set();
        this.let = new Set();
        const isFuncScope = functionThis !== undefined || parent === null;
        this.parent = parent;
        this.allVars = vars;
        this.let = isFuncScope ? this.let : new Set(Object.keys(vars));
        this.var = isFuncScope ? new Set(Object.keys(vars)) : this.var;
        this.globals = parent === null ? new Set(Object.keys(vars)) : new Set();
        this.functionThis = functionThis;
    }
    get(key, functionScope = false) {
        if (key === 'this' && this.functionThis !== undefined) {
            return new Prop({ this: this.functionThis }, key, true, false, true);
        }
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        if (this.parent === null || !functionScope || this.functionThis !== undefined) {
            if (this.globals.has(key)) {
                return new Prop(this.functionThis, key, false, true, true);
            }
            if (key in this.allVars && (!(key in {}) || this.allVars.hasOwnProperty(key))) {
                return new Prop(this.allVars, key, this.const.has(key), this.globals.has(key), true);
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
        let prop = this.get(key);
        if (prop.context === undefined) {
            throw new ReferenceError(`Variable '${key}' was not declared.`);
        }
        ``;
        if (prop.isConst) {
            throw new TypeError(`Cannot assign to const variable '${key}'`);
        }
        if (prop.isGlobal) {
            throw new SandboxError(`Cannot override global variable '${key}'`);
        }
        prop.context[prop] = val;
        return prop;
    }
    declare(key, type = null, value = undefined, isGlobal = false) {
        if (key === 'this')
            throw new SyntaxError('"this" cannot be declared');
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        if (type === 'var' && this.functionThis === undefined && this.parent !== null) {
            return this.parent.declare(key, type, value, isGlobal);
        }
        else if ((this[type].has(key) && type !== 'const' && !this.globals.has(key)) || !(key in this.allVars)) {
            if (isGlobal) {
                this.globals.add(key);
            }
            this[type].add(key);
            this.allVars[key] = value;
        }
        else {
            throw new SandboxError(`Identifier '${key}' has already been declared`);
        }
        return new Prop(this.allVars, key, this.const.has(key), isGlobal);
    }
}
export class SandboxError extends Error {
}
export function sandboxFunction(context) {
    return SandboxFunction;
    function SandboxFunction(...params) {
        let code = params.pop() || "";
        let parsed = parse(code);
        return createFunction(params, parsed.tree, {
            ctx: context,
            constants: parsed.constants
        }, undefined, 'anonymous');
    }
}
const sandboxedFunctions = new WeakSet();
export function createFunction(argNames, parsed, context, scope, name) {
    let func = function sandboxedObject(...args) {
        const vars = {};
        argNames.forEach((arg, i) => {
            if (arg.startsWith('...')) {
                vars[arg.substring(3)] = args.slice(i);
            }
            else {
                vars[arg] = args[i];
            }
        });
        const res = executeTree(context, parsed, scope === undefined ? [] : [new Scope(scope, vars, name === undefined ? undefined : this)]);
        return res.result;
    };
    sandboxedFunctions.add(func);
    return func;
}
export function createFunctionAsync(argNames, parsed, context, scope, name) {
    let func = async function sandboxedObject(...args) {
        const vars = {};
        argNames.forEach((arg, i) => {
            if (arg.startsWith('...')) {
                vars[arg.substring(3)] = args.slice(i);
            }
            else {
                vars[arg] = args[i];
            }
        });
        const res = await executeTreeAsync(context, parsed, scope === undefined ? [] : [new Scope(scope, vars, name === undefined ? undefined : this)]);
        return res.result;
    };
    sandboxedFunctions.add(func);
    return func;
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
function assignCheck(obj, context, op = 'assign') {
    var _a, _b, _c, _d;
    if (obj.context === undefined) {
        throw new ReferenceError(`Cannot ${op} value to undefined.`);
    }
    if (typeof obj.context !== 'object' && typeof obj.context !== 'function') {
        throw new SyntaxError(`Cannot ${op} value to a primitive.`);
    }
    if (obj.isConst) {
        throw new TypeError(`Cannot set value to const variable '${obj.prop}'`);
    }
    if (obj.isGlobal) {
        throw new SandboxError(`Cannot ${op} property '${obj.prop}' of a global object`);
    }
    if (typeof obj.context[obj.prop] === 'function' && !obj.context.hasOwnProperty(obj.prop)) {
        throw new SandboxError(`Override prototype property '${obj.prop}' not allowed`);
    }
    if (op === "delete") {
        if (obj.context.hasOwnProperty(obj.prop)) {
            (_a = context.ctx.changeSubscriptions.get(obj.context)) === null || _a === void 0 ? void 0 : _a.forEach((cb) => cb({ type: "delete", prop: obj.prop }));
        }
    }
    else if (obj.context.hasOwnProperty(obj.prop)) {
        (_c = (_b = context.ctx.setSubscriptions.get(obj.context)) === null || _b === void 0 ? void 0 : _b.get(obj.prop)) === null || _c === void 0 ? void 0 : _c.forEach((cb) => cb({
            type: "replace"
        }));
    }
    else {
        (_d = context.ctx.changeSubscriptions.get(obj.context)) === null || _d === void 0 ? void 0 : _d.forEach((cb) => cb({ type: "create", prop: obj.prop }));
    }
}
const arrayChange = new Set([
    [].push,
    [].pop,
    [].shift,
    [].unshift,
    [].splice,
    [].reverse,
    [].sort,
    [].copyWithin
]);
const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
let ops2 = {
    'prop': (exec, done, a, b, obj, context, scope) => {
        if (a === null) {
            throw new TypeError(`Cannot get property ${b} of null`);
        }
        const type = typeof a;
        if (type === 'undefined' && obj === undefined) {
            let prop = scope.get(b);
            if (prop.context === undefined)
                throw new ReferenceError(`${b} is not defined`);
            if (prop.context === context.ctx.sandboxGlobal) {
                if (context.ctx.options.audit) {
                    context.ctx.auditReport.globalsAccess.add(b);
                }
                const rep = context.ctx.globalsWhitelist.has(context.ctx.sandboxGlobal[b]) ? context.ctx.evals.get(context.ctx.sandboxGlobal[b]) : undefined;
                if (rep) {
                    done(undefined, rep);
                    return;
                }
            }
            if (prop.context && prop.context[b] === globalThis) {
                done(undefined, context.ctx.globalScope.get('this'));
                return;
            }
            context.ctx.getSubscriptions.forEach((cb) => cb(prop.context, prop.prop));
            done(undefined, prop);
            return;
        }
        else if (a === undefined) {
            throw new SandboxError("Cannot get property '" + b + "' of undefined");
        }
        if (type !== 'object') {
            if (type === 'number') {
                a = new Number(a);
            }
            else if (type === 'string') {
                a = new String(a);
            }
            else if (type === 'boolean') {
                a = new Boolean(a);
            }
        }
        else if (typeof a.hasOwnProperty === 'undefined') {
            done(undefined, new Prop(undefined, b));
            return;
        }
        const isFunction = type === 'function';
        let prototypeAccess = isFunction || !(a.hasOwnProperty(b) || typeof b === 'number');
        if (context.ctx.options.audit && prototypeAccess) {
            if (typeof b === 'string') {
                let prot = a.constructor.prototype;
                do {
                    if (prot.hasOwnProperty(b)) {
                        if (!context.ctx.auditReport.prototypeAccess[prot.constructor.name]) {
                            context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
                        }
                        context.ctx.auditReport.prototypeAccess[prot.constructor.name].add(b);
                    }
                } while (prot = Object.getPrototypeOf(prot));
            }
        }
        if (prototypeAccess) {
            if (isFunction) {
                if (!['name', 'length', 'constructor'].includes(b) && a.hasOwnProperty(b)) {
                    const whitelist = context.ctx.options.prototypeWhitelist.get(a);
                    const replace = context.ctx.options.prototypeReplacements.get(a);
                    if (replace) {
                        done(undefined, new Prop(replace(a, true), b));
                        return;
                    }
                    if (whitelist && (!whitelist.size || whitelist.has(b))) {
                    }
                    else {
                        throw new SandboxError(`Static method or property access not permitted: ${a.name}.${b}`);
                    }
                }
            }
            else if (b !== 'constructor') {
                let prot = a.constructor.prototype;
                do {
                    if (prot.hasOwnProperty(b)) {
                        const whitelist = context.ctx.options.prototypeWhitelist.get(prot.constructor);
                        const replace = context.ctx.options.prototypeReplacements.get(prot.constuctor);
                        if (replace) {
                            done(undefined, new Prop(replace(a, false), b));
                            return;
                        }
                        if (whitelist && (!whitelist.size || whitelist.has(b))) {
                            break;
                        }
                        throw new SandboxError(`Method or property access not permitted: ${prot.constructor.name}.${b}`);
                    }
                } while (prot = Object.getPrototypeOf(prot));
            }
        }
        const rep = context.ctx.globalsWhitelist.has(a[b]) ? context.ctx.evals.get(a[b]) : undefined;
        if (rep) {
            done(undefined, rep);
            return;
        }
        if (a[b] === globalThis) {
            done(undefined, context.ctx.globalScope.get('this'));
            return;
        }
        let g = obj.isGlobal || (isFunction && !sandboxedFunctions.has(a)) || context.ctx.globalsWhitelist.has(a);
        if (!g) {
            context.ctx.getSubscriptions.forEach((cb) => cb(a, b));
        }
        done(undefined, new Prop(a, b, false, g));
    },
    'call': (exec, done, a, b, obj, context, scope) => {
        if (context.ctx.options.forbidMethodCalls)
            throw new SandboxError("Method calls are not allowed");
        if (typeof a !== 'function') {
            throw new TypeError(`${obj.prop} is not a function`);
        }
        const args = b.map((item) => {
            if (item instanceof SpreadArray) {
                return [...item.item];
            }
            else {
                return [item];
            }
        }).flat();
        execMany(exec, args, (err, vals) => {
            var _a;
            if (err) {
                done(err);
                return;
            }
            if (typeof obj === 'function') {
                done(undefined, obj(...vals));
                return;
            }
            if (obj.context[obj.prop] === JSON.stringify && context.ctx.getSubscriptions.size) {
                const cache = new Set();
                const recurse = (x) => {
                    if (!x || !(typeof x === 'object') || cache.has(x))
                        return;
                    cache.add(x);
                    for (let y in x) {
                        context.ctx.getSubscriptions.forEach((cb) => cb(x, y));
                        recurse(x[y]);
                    }
                };
                recurse(vals[0]);
            }
            if (obj.context instanceof Array && arrayChange.has(obj.context[obj.prop]) && context.ctx.changeSubscriptions.get(obj.context)) {
                let change;
                let changed = false;
                if (obj.prop === "push") {
                    change = {
                        type: "push",
                        added: vals
                    };
                    changed = !!vals.length;
                }
                else if (obj.prop === "pop") {
                    change = {
                        type: "pop",
                        removed: obj.context.slice(-1)
                    };
                    changed = !!change.removed.length;
                }
                else if (obj.prop === "shift") {
                    change = {
                        type: "shift",
                        removed: obj.context.slice(0, 1)
                    };
                    changed = !!change.removed.length;
                }
                else if (obj.prop === "unshift") {
                    change = {
                        type: "unshift",
                        added: vals
                    };
                    changed = !!vals.length;
                }
                else if (obj.prop === "splice") {
                    change = {
                        type: "splice",
                        startIndex: vals[0],
                        deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
                        added: vals.slice(2),
                        removed: obj.context.slice(vals[0], vals[1] === undefined ? undefined : vals[0] + vals[1])
                    };
                    changed = !!change.added.length || !!change.removed.length;
                }
                else if (obj.prop === "reverse" || obj.prop === "sort") {
                    change = { type: obj.prop };
                    changed = !!obj.context.length;
                }
                else if (obj.prop === "copyWithin") {
                    let len = vals[2] === undefined ? obj.context.length - vals[1] : Math.min(obj.context.length, vals[2] - vals[1]);
                    change = {
                        type: "copyWithin",
                        startIndex: vals[0],
                        endIndex: vals[0] + len,
                        added: obj.context.slice(vals[1], vals[1] + len),
                        removed: obj.context.slice(vals[0], vals[0] + len)
                    };
                    changed = !!change.added.length || !!change.removed.length;
                }
                if (changed) {
                    (_a = context.ctx.changeSubscriptions.get(obj.context)) === null || _a === void 0 ? void 0 : _a.forEach((cb) => cb(change));
                }
            }
            done(undefined, obj.context[obj.prop](...vals));
        }, scope, context);
    },
    'createObject': (exec, done, a, b, obj, context, scope) => {
        let res = {};
        for (let item of b) {
            if (item instanceof SpreadObject) {
                res = { ...res, ...item.item };
            }
            else {
                res[item.key] = item.val;
            }
        }
        done(undefined, res);
    },
    'keyVal': (exec, done, a, b) => done(undefined, new KeyVal(a, b)),
    'createArray': (exec, done, a, b, obj, context, scope) => {
        const items = b.map((item) => {
            if (item instanceof SpreadArray) {
                return [...item.item];
            }
            else {
                return [item];
            }
        }).flat();
        execMany(exec, items, done, scope, context);
    },
    'group': (exec, done, a, b) => done(undefined, b),
    'string': (exec, done, a, b, obj, context) => done(undefined, context.constants.strings[b]),
    'regex': (exec, done, a, b, obj, context) => {
        const reg = context.constants.regexes[b];
        if (!context.ctx.globalsWhitelist.has(RegExp)) {
            throw new SandboxError("Regex not permitted");
        }
        else {
            done(undefined, new RegExp(reg.regex, reg.flags));
        }
    },
    'literal': (exec, done, a, b, obj, context, scope) => {
        let name = context.constants.literals[b].a;
        let found = [];
        let f;
        let resnums = [];
        while (f = literalRegex.exec(name)) {
            if (!f[2]) {
                found.push(context.constants.literals[b].b[parseInt(f[3], 10)]);
                resnums.push(f[3]);
            }
        }
        execMany(exec, found, (err, processed) => {
            const reses = {};
            if (err) {
                done(err);
                return;
            }
            for (let i in resnums) {
                const num = resnums[i];
                reses[num] = processed[i];
            }
            done(undefined, name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
                if ($)
                    return match;
                let res = reses[num];
                res = res instanceof Prop ? res.context[res.prop] : res;
                return ($$ ? $$ : '') + `${res}`;
            }));
        }, scope, context);
    },
    'spreadArray': (exec, done, a, b, obj, context, scope) => {
        exec(b, scope, context, (err, res) => {
            if (err) {
                done(err);
                return;
            }
            done(undefined, new SpreadArray(res));
        });
    },
    'spreadObject': (exec, done, a, b, obj, context, scope) => {
        exec(b, scope, context, (err, res) => {
            if (err) {
                done(err);
                return;
            }
            done(undefined, new SpreadObject(res));
        });
    },
    '!': (exec, done, a, b) => done(undefined, !b),
    '~': (exec, done, a, b) => done(undefined, ~b),
    '++$': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, ++obj.context[obj.prop]);
    },
    '$++': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop]++);
    },
    '--$': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, --obj.context[obj.prop]);
    },
    '$--': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop]--);
    },
    '=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        obj.context[obj.prop] = b;
        done(undefined, new Prop(obj.context, obj.prop, false, obj.isGlobal));
    },
    '+=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] += b);
    },
    '-=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] -= b);
    },
    '/=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] /= b);
    },
    '*=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] *= b);
    },
    '**=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] **= b);
    },
    '%=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] %= b);
    },
    '^=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] ^= b);
    },
    '&=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] &= b);
    },
    '|=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] |= b);
    },
    '<<=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] <<= b);
    },
    '>>=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] >>= b);
    },
    '>>>=': (exec, done, a, b, obj, context) => {
        assignCheck(obj, context);
        done(undefined, obj.context[obj.prop] >>= b);
    },
    '?': (exec, done, a, b) => {
        if (!(b instanceof If)) {
            throw new SyntaxError('Invalid inline if');
        }
        done(undefined, a ? b.t : b.f);
    },
    '>': (exec, done, a, b) => done(undefined, a > b),
    '<': (exec, done, a, b) => done(undefined, a < b),
    '>=': (exec, done, a, b) => done(undefined, a >= b),
    '<=': (exec, done, a, b) => done(undefined, a <= b),
    '==': (exec, done, a, b) => done(undefined, a == b),
    '===': (exec, done, a, b) => done(undefined, a === b),
    '!=': (exec, done, a, b) => done(undefined, a != b),
    '!==': (exec, done, a, b) => done(undefined, a !== b),
    '&&': (exec, done, a, b) => done(undefined, a && b),
    '||': (exec, done, a, b) => done(undefined, a || b),
    '&': (exec, done, a, b) => done(undefined, a & b),
    '|': (exec, done, a, b) => done(undefined, a | b),
    ':': (exec, done, a, b) => done(undefined, new If(a, b)),
    '+': (exec, done, a, b) => done(undefined, a + b),
    '-': (exec, done, a, b) => done(undefined, a - b),
    '$+': (exec, done, a, b) => done(undefined, +b),
    '$-': (exec, done, a, b) => done(undefined, -b),
    '/': (exec, done, a, b) => done(undefined, a / b),
    '^': (exec, done, a, b) => done(undefined, a ^ b),
    '*': (exec, done, a, b) => done(undefined, a * b),
    '%': (exec, done, a, b) => done(undefined, a % b),
    '<<': (exec, done, a, b) => done(undefined, a << b),
    '>>': (exec, done, a, b) => done(undefined, a >> b),
    '>>>': (exec, done, a, b) => done(undefined, a >>> b),
    'typeof': (exec, done, a, b) => done(undefined, typeof b),
    'instanceof': (exec, done, a, b) => done(undefined, a instanceof b),
    'in': (exec, done, a, b) => done(undefined, a in b),
    'delete': (exec, done, a, b, obj, context, scope, bobj) => {
        if (bobj.context === undefined) {
            done(undefined, true);
            return;
        }
        assignCheck(bobj, context, 'delete');
        if (bobj.isVariable) {
            done(undefined, false);
            return;
        }
        done(undefined, delete bobj.context[bobj.prop]);
    },
    'return': (exec, done, a, b, obj, context) => done(undefined, b),
    'var': (exec, done, a, b, obj, context, scope, bobj) => {
        exec(b, scope, context, (err, res) => {
            if (err) {
                done(err);
                return;
            }
            done(undefined, scope.declare(a, VarType.var, res));
        });
    },
    'let': (exec, done, a, b, obj, context, scope, bobj) => {
        exec(b, scope, context, (err, res) => {
            if (err) {
                done(err);
                return;
            }
            done(undefined, scope.declare(a, VarType.let, res, bobj && bobj.isGlobal));
        });
    },
    'const': (exec, done, a, b, obj, context, scope, bobj) => {
        exec(b, scope, context, (err, res) => {
            if (err) {
                done(err);
                return;
            }
            done(undefined, scope.declare(a, VarType.const, res));
        });
    },
    'arrowFunc': (exec, done, a, b, obj, context, scope) => {
        if (a.shift()) {
            done(undefined, createFunctionAsync(a, b, context, scope));
        }
        else {
            done(undefined, createFunction(a, b, context, scope));
        }
    },
    'function': (exec, done, a, b, obj, context, scope) => {
        let isAsync = a.shift();
        let name = a.shift();
        let func;
        if (isAsync) {
            func = createFunctionAsync(a, b, context, scope, name);
        }
        else {
            func = createFunction(a, b, context, scope, name);
        }
        if (name) {
            scope.declare(name, VarType.var, func);
        }
        done(undefined, func);
    },
    'inlineFunction': (exec, done, a, b, obj, context, scope) => {
        let isAsync = a.shift();
        let name = a.shift();
        if (name) {
            scope = new Scope(scope, {});
        }
        let func;
        if (isAsync) {
            func = createFunctionAsync(a, b, context, scope, name);
        }
        else {
            func = createFunction(a, b, context, scope, name);
        }
        if (name) {
            scope.declare(name, VarType.let, func);
        }
        done(undefined, func);
    },
    'loop': (exec, done, a, b, obj, context, scope) => {
        const [checkFirst, startInternal, startStep, step, condition, beforeStep] = a;
        let loop = true;
        const loopScope = new Scope(scope, {});
        const interalScope = new Scope(loopScope, {});
        if (exec === execAsync) {
            (async () => {
                await asyncDone((d) => exec(startStep, loopScope, context, d));
                await asyncDone((d) => exec(startInternal, interalScope, context, d));
                if (checkFirst)
                    loop = (await asyncDone((d) => exec(condition, interalScope, context, d))).result;
                while (loop) {
                    let innerLoopVars = {};
                    await asyncDone((d) => exec(beforeStep, new Scope(interalScope, innerLoopVars), context, d));
                    let res = await executeTreeAsync(context, b, [new Scope(loopScope, innerLoopVars)], "loop");
                    if (res instanceof ExecReturn && res.returned) {
                        done(undefined, res);
                        return;
                    }
                    if (res instanceof ExecReturn && res.breakLoop) {
                        break;
                    }
                    await asyncDone((d) => exec(step, interalScope, context, d));
                    loop = (await asyncDone((d) => exec(condition, interalScope, context, d))).result;
                }
                done();
            })().catch(done);
        }
        else {
            syncDone((d) => exec(startStep, loopScope, context, d));
            syncDone((d) => exec(startInternal, interalScope, context, d));
            if (checkFirst)
                loop = (syncDone((d) => exec(condition, interalScope, context, d))).result;
            while (loop) {
                let innerLoopVars = {};
                syncDone((d) => exec(beforeStep, new Scope(interalScope, innerLoopVars), context, d));
                let res = executeTree(context, b, [new Scope(loopScope, innerLoopVars)], "loop");
                if (res instanceof ExecReturn && res.returned) {
                    done(undefined, res);
                    return;
                }
                if (res instanceof ExecReturn && res.breakLoop) {
                    break;
                }
                syncDone((d) => exec(step, interalScope, context, d));
                loop = (syncDone((d) => exec(condition, interalScope, context, d))).result;
            }
            done();
        }
    },
    'loopAction': (exec, done, a, b, obj, context, scope) => {
        if ((context.inLoopOrSwitch === "switch" && a === "continue") || !context.inLoopOrSwitch) {
            throw new SandboxError("Illegal " + a + " statement");
        }
        done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false, a === "break", a === "continue"));
    },
    'if': (exec, done, a, b, obj, context, scope) => {
        if (!(b instanceof If)) {
            throw new SyntaxError('Invalid if');
        }
        exec(a, scope, context, (err, res) => {
            if (err) {
                done(err);
                return;
            }
            executeTreeWithDone(exec, done, context, res ? b.t : b.f, [new Scope(scope)], context.inLoopOrSwitch);
        });
    },
    'switch': (exec, done, a, b, obj, context, scope) => {
        exec(a, scope, context, (err, toTest) => {
            if (err) {
                done(err);
                return;
            }
            if (exec === execSync) {
                let res;
                let isTrue = false;
                for (let caseItem of b) {
                    if (isTrue || (isTrue = !caseItem.a || toTest === valueOrProp((syncDone((d) => exec(caseItem.a, scope, context, d))).result))) {
                        if (!caseItem.b)
                            continue;
                        res = executeTree(context, caseItem.b, [scope], "switch");
                        if (res.breakLoop)
                            break;
                        if (res.returned) {
                            done(undefined, res);
                            return;
                        }
                        if (!caseItem.a) { // default case
                            break;
                        }
                    }
                }
                done();
            }
            else {
                (async () => {
                    let res;
                    let isTrue = false;
                    for (let caseItem of b) {
                        if (isTrue || (isTrue = !caseItem.a || toTest === valueOrProp((await asyncDone((d) => exec(caseItem.a, scope, context, d))).result))) {
                            if (!caseItem.b)
                                continue;
                            res = await executeTreeAsync(context, caseItem.b, [scope], "switch");
                            if (res.breakLoop)
                                break;
                            if (res.returned) {
                                done(undefined, res);
                                return;
                            }
                            if (!caseItem.a) { // default case
                                break;
                            }
                        }
                    }
                    done();
                })().catch(done);
            }
        });
    },
    'try': (exec, done, a, b, obj, context, scope) => {
        const [exception, catchBody, finallyBody] = b;
        executeTreeWithDone(exec, (err, res) => {
            executeTreeWithDone(exec, (e) => {
                if (e)
                    done(e);
                else if (err) {
                    let sc = {};
                    if (exception)
                        sc[exception] = err;
                    executeTreeWithDone(exec, done, context, catchBody, [new Scope(scope)], context.inLoopOrSwitch);
                }
                else {
                    done(undefined, res);
                }
            }, context, finallyBody, [new Scope(scope, {})]);
        }, context, a, [new Scope(scope)], context.inLoopOrSwitch);
    },
    'void': (exec, done, a) => { done(); },
    'new': (exec, done, a, b, obj, context) => {
        if (!context.ctx.globalsWhitelist.has(a) && !sandboxedFunctions.has(a)) {
            throw new SandboxError(`Object construction not allowed: ${a.constructor.name}`);
        }
        done(undefined, new a(...b));
    },
    'throw': (exec, done, a) => { done(a); },
    'multi': (exec, done, a, b, obj, context, scope) => done(undefined, a.pop())
};
let ops = new Map();
for (let op in ops2) {
    ops.set(op, ops2[op]);
}
function valueOrProp(a) {
    if (a instanceof Prop)
        return a.context[a.prop];
    return a;
}
function execMany(exec, tree, done, scope, context) {
    let ret = [];
    let i = 0;
    if (!tree.length) {
        done(undefined, []);
        return;
    }
    const next = (err, res) => {
        if (err) {
            done(err);
            return;
        }
        ret.push(res);
        if (++i < tree.length) {
            exec(tree[i], scope, context, next);
        }
        else {
            done(undefined, ret);
        }
    };
    exec(tree[i], scope, context, next);
}
function asyncDone(callback) {
    return new Promise((resolve, reject) => {
        callback((err, result) => {
            if (err)
                reject(err);
            else
                resolve({ result });
        });
    });
}
function syncDone(callback) {
    let result;
    let err;
    callback((e, r) => {
        err = e;
        result = r;
    });
    // console.log(result);
    if (err)
        throw err;
    return { result };
}
async function execAsync(tree, scope, context, done) {
    let result;
    try {
        if (tree instanceof Prop) {
            result = tree.context[tree.prop];
        }
        else if (Array.isArray(tree)) {
            let res = [];
            for (let item of tree) {
                const ret = (await asyncDone((done) => execAsync(item, scope, context, done))).result;
                if (ret instanceof ExecReturn) {
                    res.push(ret.result);
                    if (ret.returned || ret.breakLoop || ret.continueLoop) {
                        res = ret;
                        break;
                    }
                }
                else {
                    res.push(ret);
                }
            }
            result = res;
        }
        else if (!(tree instanceof Lisp)) {
            result = tree;
        }
        else if (['arrowFunc', 'function', 'inlineFunction', 'loop', 'try', 'switch', 'if'].includes(tree.op)) {
            result = (await asyncDone((d) => ops.get(tree.op)(execAsync, d, tree.a, tree.b, undefined, context, scope))).result;
        }
        else if (tree.op === 'await') {
            result = await (await asyncDone((done) => execAsync(tree.a, scope, context, done))).result;
        }
        else {
            let obj = (await asyncDone((done) => execAsync(tree.a, scope, context, done))).result;
            let a = obj instanceof Prop ? (obj.context ? obj.context[obj.prop] : undefined) : obj;
            let bobj = (await asyncDone((done) => execAsync(tree.b, scope, context, done))).result;
            let b = bobj instanceof Prop ? (bobj.context ? bobj.context[bobj.prop] : undefined) : bobj;
            if (ops.has(tree.op)) {
                result = (await asyncDone((d) => ops.get(tree.op)(execAsync, d, a, b, obj, context, scope, bobj))).result;
            }
            else {
                throw new SyntaxError('Unknown operator: ' + tree.op);
            }
        }
        done(undefined, result);
    }
    catch (err) {
        done(err);
    }
}
function syncDoneExec(tree, scope, context) {
    let result;
    let err;
    execSync(tree, scope, context, (e, r) => {
        err = e;
        result = r;
    });
    if (err)
        throw err;
    return { result };
}
function syncDoneOp(op, a, b, obj, context, scope, bobj) {
    let result;
    let err;
    ops.get(op)(execSync, (e, r) => {
        err = e;
        result = r;
    }, a, b, obj, context, scope, bobj);
    if (err)
        throw err;
    return { result };
}
function execSync(tree, scope, context, done) {
    let result;
    if (tree instanceof Prop) {
        result = tree.context[tree.prop];
    }
    else if (Array.isArray(tree)) {
        let res = [];
        for (let item of tree) {
            const ret = syncDoneExec(item, scope, context).result;
            if (ret instanceof ExecReturn) {
                res.push(ret.result);
                if (ret.returned || ret.breakLoop || ret.continueLoop) {
                    res = ret;
                    break;
                }
            }
            else {
                res.push(ret);
            }
        }
        result = res;
    }
    else if (!(tree instanceof Lisp)) {
        result = tree;
    }
    else if (['arrowFunc', 'function', 'inlineFunction', 'loop', 'try', 'switch', 'if'].includes(tree.op)) {
        result = syncDoneOp(tree.op, tree.a, tree.b, undefined, context, scope).result;
    }
    else if (tree.op === 'await') {
        throw new SandboxError("Illegal use of 'await', must be inside async function");
    }
    else {
        let obj = syncDoneExec(tree.a, scope, context).result;
        let a = obj instanceof Prop ? (obj.context ? obj.context[obj.prop] : undefined) : obj;
        let bobj = syncDoneExec(tree.b, scope, context).result;
        let b = bobj instanceof Prop ? (bobj.context ? bobj.context[bobj.prop] : undefined) : bobj;
        if (ops.has(tree.op)) {
            result = syncDoneOp(tree.op, a, b, obj, context, scope, bobj).result;
        }
        else {
            throw new SyntaxError('Unknown operator: ' + tree.op);
        }
    }
    done(undefined, result);
}
export function executeTree(context, executionTree, scopes = [], inLoopOrSwitch) {
    return syncDone((done) => executeTreeWithDone(execSync, done, context, executionTree, scopes, inLoopOrSwitch)).result;
}
export async function executeTreeAsync(context, executionTree, scopes = [], inLoopOrSwitch) {
    return (await asyncDone((done) => executeTreeWithDone(execAsync, done, context, executionTree, scopes, inLoopOrSwitch))).result;
}
function executeTreeWithDone(exec, done, context, executionTree, scopes = [], inLoopOrSwitch) {
    if (!executionTree) {
        done();
        return;
    }
    if (!(executionTree instanceof Array))
        throw new SyntaxError('Bad execution tree');
    context = {
        ctx: context.ctx,
        constants: context.constants,
        inLoopOrSwitch
    };
    let scope = context.ctx.globalScope;
    let s;
    while (s = scopes.shift()) {
        if (typeof s !== "object")
            continue;
        if (s instanceof Scope) {
            scope = s;
        }
        else {
            scope = new Scope(scope, s, null);
        }
    }
    if (context.ctx.options.audit && !context.ctx.auditReport) {
        context.ctx.auditReport = {
            globalsAccess: new Set(),
            prototypeAccess: {},
        };
    }
    let i = 0;
    let current = executionTree[i];
    const next = (err, res) => {
        if (err) {
            done(new err.constructor(err.message));
            return;
        }
        if (res instanceof ExecReturn) {
            done(undefined, res);
            return;
        }
        if (current instanceof Lisp && current.op === 'return') {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
        if (++i < executionTree.length) {
            current = executionTree[i];
            try {
                exec(current, scope, context, next);
            }
            catch (e) {
                done(e);
            }
        }
        else {
            done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
        }
    };
    try {
        exec(current, scope, context, next);
    }
    catch (e) {
        done(e);
    }
}
