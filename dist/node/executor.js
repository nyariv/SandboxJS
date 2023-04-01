'use strict';

var utils = require('./utils.js');

class ExecReturn {
    constructor(auditReport, result, returned, breakLoop = false, continueLoop = false) {
        this.auditReport = auditReport;
        this.result = result;
        this.returned = returned;
        this.breakLoop = breakLoop;
        this.continueLoop = continueLoop;
    }
}
const optional = {};
function generateArgs(argNames, args) {
    const vars = {};
    argNames.forEach((arg, i) => {
        if (arg.startsWith('...')) {
            vars[arg.substring(3)] = args.slice(i);
        }
        else {
            vars[arg] = args[i];
        }
    });
    return vars;
}
const sandboxedFunctions = new WeakSet();
function createFunction(argNames, parsed, ticks, context, scope, name) {
    if (context.ctx.options.forbidFunctionCreation) {
        throw new utils.SandboxError('Function creation is forbidden');
    }
    let func;
    if (name === undefined) {
        func = (...args) => {
            const vars = generateArgs(argNames, args);
            const res = executeTree(ticks, context, parsed, scope === undefined ? [] : [new utils.Scope(scope, vars)]);
            return res.result;
        };
    }
    else {
        func = function sandboxedObject(...args) {
            const vars = generateArgs(argNames, args);
            const res = executeTree(ticks, context, parsed, scope === undefined ? [] : [new utils.Scope(scope, vars, this)]);
            return res.result;
        };
    }
    context.registerSandboxFunction(func);
    sandboxedFunctions.add(func);
    return func;
}
function createFunctionAsync(argNames, parsed, ticks, context, scope, name) {
    if (context.ctx.options.forbidFunctionCreation) {
        throw new utils.SandboxError('Function creation is forbidden');
    }
    if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
        throw new utils.SandboxError('Async/await not permitted');
    }
    let func;
    if (name === undefined) {
        func = async (...args) => {
            const vars = generateArgs(argNames, args);
            const res = await executeTreeAsync(ticks, context, parsed, scope === undefined ? [] : [new utils.Scope(scope, vars)]);
            return res.result;
        };
    }
    else {
        func = async function sandboxedObject(...args) {
            const vars = generateArgs(argNames, args);
            const res = await executeTreeAsync(ticks, context, parsed, scope === undefined ? [] : [new utils.Scope(scope, vars, this)]);
            return res.result;
        };
    }
    context.registerSandboxFunction(func);
    sandboxedFunctions.add(func);
    return func;
}
function assignCheck(obj, context, op = 'assign') {
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
        throw new utils.SandboxError(`Cannot ${op} property '${obj.prop}' of a global object`);
    }
    if (obj.context === null) {
        throw new TypeError('Cannot set properties of null');
    }
    if (typeof obj.context[obj.prop] === 'function' && !obj.context.hasOwnProperty(obj.prop)) {
        throw new utils.SandboxError(`Override prototype property '${obj.prop}' not allowed`);
    }
    if (op === 'delete') {
        if (obj.context.hasOwnProperty(obj.prop)) {
            context.changeSubscriptions
                .get(obj.context)
                ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop }));
            context.changeSubscriptionsGlobal
                .get(obj.context)
                ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop }));
        }
    }
    else if (obj.context.hasOwnProperty(obj.prop)) {
        context.setSubscriptions
            .get(obj.context)
            ?.get(obj.prop)
            ?.forEach((cb) => cb({
            type: 'replace',
        }));
        context.setSubscriptionsGlobal
            .get(obj.context)
            ?.get(obj.prop)
            ?.forEach((cb) => cb({
            type: 'replace',
        }));
    }
    else {
        context.changeSubscriptions
            .get(obj.context)
            ?.forEach((cb) => cb({ type: 'create', prop: obj.prop }));
        context.changeSubscriptionsGlobal
            .get(obj.context)
            ?.forEach((cb) => cb({ type: 'create', prop: obj.prop }));
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
    [].copyWithin,
]);
class KeyVal {
    constructor(key, val) {
        this.key = key;
        this.val = val;
    }
}
class SpreadObject {
    constructor(item) {
        this.item = item;
    }
}
class SpreadArray {
    constructor(item) {
        this.item = item;
    }
}
class If {
    constructor(t, f) {
        this.t = t;
        this.f = f;
    }
}
const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
const ops = new Map();
function addOps(type, cb) {
    ops.set(type, cb);
}
addOps(1 /* LispType.Prop */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (a === null) {
        throw new TypeError(`Cannot get property ${b} of null`);
    }
    const type = typeof a;
    if (type === 'undefined' && obj === undefined) {
        const prop = scope.get(b);
        if (prop.context === context.ctx.sandboxGlobal) {
            if (context.ctx.options.audit) {
                context.ctx.auditReport?.globalsAccess.add(b);
            }
            const rep = context.ctx.globalsWhitelist.has(context.ctx.sandboxGlobal[b])
                ? context.evals.get(context.ctx.sandboxGlobal[b])
                : undefined;
            if (rep) {
                done(undefined, rep);
                return;
            }
        }
        if (prop.context && prop.context[b] === globalThis) {
            done(undefined, context.ctx.globalScope.get('this'));
            return;
        }
        done(undefined, prop);
        return;
    }
    else if (a === undefined) {
        throw new utils.SandboxError("Cannot get property '" + b + "' of undefined");
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
        done(undefined, new utils.Prop(undefined, b));
        return;
    }
    const isFunction = type === 'function';
    const prototypeAccess = isFunction || !(a.hasOwnProperty(b) || typeof b === 'number');
    if (context.ctx.options.audit && prototypeAccess) {
        if (typeof b === 'string') {
            let prot = Object.getPrototypeOf(a);
            do {
                if (prot.hasOwnProperty(b)) {
                    if (context.ctx.auditReport &&
                        !context.ctx.auditReport.prototypeAccess[prot.constructor.name]) {
                        context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
                    }
                    context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
                }
            } while ((prot = Object.getPrototypeOf(prot)));
        }
    }
    if (prototypeAccess) {
        if (isFunction) {
            if (!['name', 'length', 'constructor'].includes(b) && a.hasOwnProperty(b)) {
                const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
                const replace = context.ctx.options.prototypeReplacements.get(a);
                if (replace) {
                    done(undefined, new utils.Prop(replace(a, true), b));
                    return;
                }
                if (!(whitelist && (!whitelist.size || whitelist.has(b)))) {
                    throw new utils.SandboxError(`Static method or property access not permitted: ${a.name}.${b}`);
                }
            }
        }
        else if (b !== 'constructor') {
            let prot = a;
            while ((prot = Object.getPrototypeOf(prot))) {
                if (prot.hasOwnProperty(b)) {
                    const whitelist = context.ctx.prototypeWhitelist.get(prot);
                    const replace = context.ctx.options.prototypeReplacements.get(prot.constuctor);
                    if (replace) {
                        done(undefined, new utils.Prop(replace(a, false), b));
                        return;
                    }
                    if (whitelist && (!whitelist.size || whitelist.has(b))) {
                        break;
                    }
                    throw new utils.SandboxError(`Method or property access not permitted: ${prot.constructor.name}.${b}`);
                }
            }
        }
    }
    if (context.evals.has(a[b])) {
        done(undefined, context.evals.get(a[b]));
        return;
    }
    if (a[b] === globalThis) {
        done(undefined, context.ctx.globalScope.get('this'));
        return;
    }
    const g = obj.isGlobal ||
        (isFunction && !sandboxedFunctions.has(a)) ||
        context.ctx.globalsWhitelist.has(a);
    done(undefined, new utils.Prop(a, b, false, g));
});
addOps(5 /* LispType.Call */, (exec, done, ticks, a, b, obj, context) => {
    if (context.ctx.options.forbidFunctionCalls)
        throw new utils.SandboxError('Function invocations are not allowed');
    if (typeof a !== 'function') {
        throw new TypeError(`${typeof obj.prop === 'symbol' ? 'Symbol' : obj.prop} is not a function`);
    }
    const vals = b
        .map((item) => {
        if (item instanceof SpreadArray) {
            return [...item.item];
        }
        else {
            return [item];
        }
    })
        .flat()
        .map((item) => valueOrProp(item, context));
    if (typeof obj === 'function') {
        done(undefined, obj(...vals));
        return;
    }
    if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
        const cache = new Set();
        const recurse = (x) => {
            if (!x || !(typeof x === 'object') || cache.has(x))
                return;
            cache.add(x);
            for (const y of Object.keys(x)) {
                context.getSubscriptions.forEach((cb) => cb(x, y));
                recurse(x[y]);
            }
        };
        recurse(vals[0]);
    }
    if (obj.context instanceof Array &&
        arrayChange.has(obj.context[obj.prop]) &&
        (context.changeSubscriptions.get(obj.context) ||
            context.changeSubscriptionsGlobal.get(obj.context))) {
        let change;
        let changed = false;
        if (obj.prop === 'push') {
            change = {
                type: 'push',
                added: vals,
            };
            changed = !!vals.length;
        }
        else if (obj.prop === 'pop') {
            change = {
                type: 'pop',
                removed: obj.context.slice(-1),
            };
            changed = !!change.removed.length;
        }
        else if (obj.prop === 'shift') {
            change = {
                type: 'shift',
                removed: obj.context.slice(0, 1),
            };
            changed = !!change.removed.length;
        }
        else if (obj.prop === 'unshift') {
            change = {
                type: 'unshift',
                added: vals,
            };
            changed = !!vals.length;
        }
        else if (obj.prop === 'splice') {
            change = {
                type: 'splice',
                startIndex: vals[0],
                deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
                added: vals.slice(2),
                removed: obj.context.slice(vals[0], vals[1] === undefined ? undefined : vals[0] + vals[1]),
            };
            changed = !!change.added.length || !!change.removed.length;
        }
        else if (obj.prop === 'reverse' || obj.prop === 'sort') {
            change = { type: obj.prop };
            changed = !!obj.context.length;
        }
        else if (obj.prop === 'copyWithin') {
            const len = vals[2] === undefined
                ? obj.context.length - vals[1]
                : Math.min(obj.context.length, vals[2] - vals[1]);
            change = {
                type: 'copyWithin',
                startIndex: vals[0],
                endIndex: vals[0] + len,
                added: obj.context.slice(vals[1], vals[1] + len),
                removed: obj.context.slice(vals[0], vals[0] + len),
            };
            changed = !!change.added.length || !!change.removed.length;
        }
        if (changed) {
            context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb(change));
            context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb(change));
        }
    }
    obj.get(context);
    done(undefined, obj.context[obj.prop](...vals));
});
addOps(22 /* LispType.CreateObject */, (exec, done, ticks, a, b) => {
    let res = {};
    for (const item of b) {
        if (item.key instanceof SpreadObject) {
            res = { ...res, ...item.key.item };
        }
        else {
            res[item.key] = item.val;
        }
    }
    done(undefined, res);
});
addOps(6 /* LispType.KeyVal */, (exec, done, ticks, a, b) => done(undefined, new KeyVal(a, b)));
addOps(12 /* LispType.CreateArray */, (exec, done, ticks, a, b, obj, context) => {
    const items = b
        .map((item) => {
        if (item instanceof SpreadArray) {
            return [...item.item];
        }
        else {
            return [item];
        }
    })
        .flat()
        .map((item) => valueOrProp(item, context));
    done(undefined, items);
});
addOps(23 /* LispType.Group */, (exec, done, ticks, a, b) => done(undefined, b));
addOps(35 /* LispType.GlobalSymbol */, (exec, done, ticks, a, b) => {
    switch (b) {
        case 'true':
            return done(undefined, true);
        case 'false':
            return done(undefined, false);
        case 'null':
            return done(undefined, null);
        case 'undefined':
            return done(undefined, undefined);
        case 'NaN':
            return done(undefined, NaN);
        case 'Infinity':
            return done(undefined, Infinity);
    }
    done(new Error('Unknown symbol: ' + b));
});
addOps(7 /* LispType.Number */, (exec, done, ticks, a, b) => done(undefined, Number(b)));
addOps(83 /* LispType.BigInt */, (exec, done, ticks, a, b) => done(undefined, BigInt(b)));
addOps(2 /* LispType.StringIndex */, (exec, done, ticks, a, b, obj, context) => done(undefined, context.constants.strings[parseInt(b)]));
addOps(85 /* LispType.RegexIndex */, (exec, done, ticks, a, b, obj, context) => {
    const reg = context.constants.regexes[parseInt(b)];
    if (!context.ctx.globalsWhitelist.has(RegExp)) {
        throw new utils.SandboxError('Regex not permitted');
    }
    else {
        done(undefined, new RegExp(reg.regex, reg.flags));
    }
});
addOps(84 /* LispType.LiteralIndex */, (exec, done, ticks, a, b, obj, context, scope) => {
    const item = context.constants.literals[parseInt(b)];
    const [, name, js] = item;
    const found = [];
    let f;
    const resnums = [];
    while ((f = literalRegex.exec(name))) {
        if (!f[2]) {
            found.push(js[parseInt(f[3], 10)]);
            resnums.push(f[3]);
        }
    }
    exec(ticks, found, scope, context, (err, processed) => {
        const reses = {};
        if (err) {
            done(err);
            return;
        }
        for (const i of Object.keys(processed)) {
            const num = resnums[i];
            reses[num] = processed[i];
        }
        done(undefined, name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
            if ($)
                return match;
            const res = reses[num];
            return ($$ ? $$ : '') + `${valueOrProp(res, context)}`;
        }));
    });
});
addOps(18 /* LispType.SpreadArray */, (exec, done, ticks, a, b) => {
    done(undefined, new SpreadArray(b));
});
addOps(17 /* LispType.SpreadObject */, (exec, done, ticks, a, b) => {
    done(undefined, new SpreadObject(b));
});
addOps(24 /* LispType.Not */, (exec, done, ticks, a, b) => done(undefined, !b));
addOps(64 /* LispType.Inverse */, (exec, done, ticks, a, b) => done(undefined, ~b));
addOps(25 /* LispType.IncrementBefore */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, ++obj.context[obj.prop]);
});
addOps(26 /* LispType.IncrementAfter */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop]++);
});
addOps(27 /* LispType.DecrementBefore */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, --obj.context[obj.prop]);
});
addOps(28 /* LispType.DecrementAfter */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop]--);
});
addOps(9 /* LispType.Assign */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] = b));
});
addOps(66 /* LispType.AddEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] += b));
});
addOps(65 /* LispType.SubractEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] -= b));
});
addOps(67 /* LispType.DivideEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] /= b));
});
addOps(69 /* LispType.MultiplyEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] *= b));
});
addOps(68 /* LispType.PowerEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] **= b));
});
addOps(70 /* LispType.ModulusEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] %= b));
});
addOps(71 /* LispType.BitNegateEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] ^= b));
});
addOps(72 /* LispType.BitAndEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] &= b));
});
addOps(73 /* LispType.BitOrEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] |= b));
});
addOps(76 /* LispType.ShiftLeftEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] <<= b));
});
addOps(75 /* LispType.ShiftRightEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>= b));
});
addOps(74 /* LispType.UnsignedShiftRightEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>= b));
});
addOps(57 /* LispType.LargerThan */, (exec, done, ticks, a, b) => done(undefined, a > b));
addOps(56 /* LispType.SmallerThan */, (exec, done, ticks, a, b) => done(undefined, a < b));
addOps(55 /* LispType.LargerEqualThan */, (exec, done, ticks, a, b) => done(undefined, a >= b));
addOps(54 /* LispType.SmallerEqualThan */, (exec, done, ticks, a, b) => done(undefined, a <= b));
addOps(52 /* LispType.Equal */, (exec, done, ticks, a, b) => done(undefined, a == b));
addOps(32 /* LispType.StrictEqual */, (exec, done, ticks, a, b) => done(undefined, a === b));
addOps(53 /* LispType.NotEqual */, (exec, done, ticks, a, b) => done(undefined, a != b));
addOps(31 /* LispType.StrictNotEqual */, (exec, done, ticks, a, b) => done(undefined, a !== b));
addOps(29 /* LispType.And */, (exec, done, ticks, a, b) => done(undefined, a && b));
addOps(30 /* LispType.Or */, (exec, done, ticks, a, b) => done(undefined, a || b));
addOps(77 /* LispType.BitAnd */, (exec, done, ticks, a, b) => done(undefined, a & b));
addOps(78 /* LispType.BitOr */, (exec, done, ticks, a, b) => done(undefined, a | b));
addOps(33 /* LispType.Plus */, (exec, done, ticks, a, b) => done(undefined, a + b));
addOps(47 /* LispType.Minus */, (exec, done, ticks, a, b) => done(undefined, a - b));
addOps(59 /* LispType.Positive */, (exec, done, ticks, a, b) => done(undefined, +b));
addOps(58 /* LispType.Negative */, (exec, done, ticks, a, b) => done(undefined, -b));
addOps(48 /* LispType.Divide */, (exec, done, ticks, a, b) => done(undefined, a / b));
addOps(79 /* LispType.BitNegate */, (exec, done, ticks, a, b) => done(undefined, a ^ b));
addOps(50 /* LispType.Multiply */, (exec, done, ticks, a, b) => done(undefined, a * b));
addOps(51 /* LispType.Modulus */, (exec, done, ticks, a, b) => done(undefined, a % b));
addOps(80 /* LispType.BitShiftLeft */, (exec, done, ticks, a, b) => done(undefined, a << b));
addOps(81 /* LispType.BitShiftRight */, (exec, done, ticks, a, b) => done(undefined, a >> b));
addOps(82 /* LispType.BitUnsignedShiftRight */, (exec, done, ticks, a, b) => done(undefined, a >>> b));
addOps(60 /* LispType.Typeof */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, b, scope, context, (e, prop) => {
        done(undefined, typeof valueOrProp(prop, context));
    });
});
addOps(62 /* LispType.Instanceof */, (exec, done, ticks, a, b) => done(undefined, a instanceof b));
addOps(63 /* LispType.In */, (exec, done, ticks, a, b) => done(undefined, a in b));
addOps(61 /* LispType.Delete */, (exec, done, ticks, a, b, obj, context, scope, bobj) => {
    if (bobj.context === undefined) {
        done(undefined, true);
        return;
    }
    assignCheck(bobj, context, 'delete');
    if (bobj.isVariable) {
        done(undefined, false);
        return;
    }
    done(undefined, delete bobj.context?.[bobj.prop]);
});
addOps(8 /* LispType.Return */, (exec, done, ticks, a, b) => done(undefined, b));
addOps(34 /* LispType.Var */, (exec, done, ticks, a, b, obj, context, scope) => {
    done(undefined, scope.declare(a, "var" /* VarType.var */, b));
});
addOps(3 /* LispType.Let */, (exec, done, ticks, a, b, obj, context, scope, bobj) => {
    done(undefined, scope.declare(a, "let" /* VarType.let */, b, bobj && bobj.isGlobal));
});
addOps(4 /* LispType.Const */, (exec, done, ticks, a, b, obj, context, scope) => {
    done(undefined, scope.declare(a, "const" /* VarType.const */, b));
});
addOps(11 /* LispType.ArrowFunction */, (exec, done, ticks, a, b, obj, context, scope) => {
    a = [...a];
    if (typeof obj[2] === 'string' || obj[2] instanceof utils.CodeString) {
        if (context.allowJit && context.evalContext) {
            obj[2] = b = context.evalContext.lispifyFunction(new utils.CodeString(obj[2]), context.constants);
        }
        else {
            throw new utils.SandboxError('Unevaluated code detected, JIT not allowed');
        }
    }
    if (a.shift()) {
        done(undefined, createFunctionAsync(a, b, ticks, context, scope));
    }
    else {
        done(undefined, createFunction(a, b, ticks, context, scope));
    }
});
addOps(37 /* LispType.Function */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof utils.CodeString) {
        if (context.allowJit && context.evalContext) {
            obj[2] = b = context.evalContext.lispifyFunction(new utils.CodeString(obj[2]), context.constants);
        }
        else {
            throw new utils.SandboxError('Unevaluated code detected, JIT not allowed');
        }
    }
    const isAsync = a.shift();
    const name = a.shift();
    let func;
    if (isAsync === 88 /* LispType.True */) {
        func = createFunctionAsync(a, b, ticks, context, scope, name);
    }
    else {
        func = createFunction(a, b, ticks, context, scope, name);
    }
    if (name) {
        scope.declare(name, "var" /* VarType.var */, func);
    }
    done(undefined, func);
});
addOps(10 /* LispType.InlineFunction */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof utils.CodeString) {
        if (context.allowJit && context.evalContext) {
            obj[2] = b = context.evalContext.lispifyFunction(new utils.CodeString(obj[2]), context.constants);
        }
        else {
            throw new utils.SandboxError('Unevaluated code detected, JIT not allowed');
        }
    }
    const isAsync = a.shift();
    const name = a.shift();
    if (name) {
        scope = new utils.Scope(scope, {});
    }
    let func;
    if (isAsync === 88 /* LispType.True */) {
        func = createFunctionAsync(a, b, ticks, context, scope, name);
    }
    else {
        func = createFunction(a, b, ticks, context, scope, name);
    }
    if (name) {
        scope.declare(name, "let" /* VarType.let */, func);
    }
    done(undefined, func);
});
addOps(38 /* LispType.Loop */, (exec, done, ticks, a, b, obj, context, scope) => {
    const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep] = a;
    let loop = true;
    const loopScope = new utils.Scope(scope, {});
    const internalVars = {
        $$obj: undefined,
    };
    const interalScope = new utils.Scope(loopScope, internalVars);
    if (exec === execAsync) {
        (async () => {
            let ad;
            ad = asyncDone((d) => exec(ticks, startStep, loopScope, context, d));
            internalVars['$$obj'] =
                (ad = asyncDone((d) => exec(ticks, getIterator, loopScope, context, d))).isInstant === true
                    ? ad.instant
                    : (await ad.p).result;
            ad = asyncDone((d) => exec(ticks, startInternal, interalScope, context, d));
            if (checkFirst)
                loop =
                    (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant ===
                        true
                        ? ad.instant
                        : (await ad.p).result;
            while (loop) {
                const innerLoopVars = {};
                ad = asyncDone((d) => exec(ticks, beforeStep, new utils.Scope(interalScope, innerLoopVars), context, d));
                ad.isInstant === true ? ad.instant : (await ad.p).result;
                const res = await executeTreeAsync(ticks, context, b, [new utils.Scope(loopScope, innerLoopVars)], 'loop');
                if (res instanceof ExecReturn && res.returned) {
                    done(undefined, res);
                    return;
                }
                if (res instanceof ExecReturn && res.breakLoop) {
                    break;
                }
                ad = asyncDone((d) => exec(ticks, step, interalScope, context, d));
                loop =
                    (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant ===
                        true
                        ? ad.instant
                        : (await ad.p).result;
            }
            done();
        })().catch(done);
    }
    else {
        syncDone((d) => exec(ticks, startStep, loopScope, context, d));
        internalVars['$$obj'] = syncDone((d) => exec(ticks, getIterator, loopScope, context, d)).result;
        syncDone((d) => exec(ticks, startInternal, interalScope, context, d));
        if (checkFirst)
            loop = syncDone((d) => exec(ticks, condition, interalScope, context, d)).result;
        while (loop) {
            const innerLoopVars = {};
            syncDone((d) => exec(ticks, beforeStep, new utils.Scope(interalScope, innerLoopVars), context, d));
            const res = executeTree(ticks, context, b, [new utils.Scope(loopScope, innerLoopVars)], 'loop');
            if (res instanceof ExecReturn && res.returned) {
                done(undefined, res);
                return;
            }
            if (res instanceof ExecReturn && res.breakLoop) {
                break;
            }
            syncDone((d) => exec(ticks, step, interalScope, context, d));
            loop = syncDone((d) => exec(ticks, condition, interalScope, context, d)).result;
        }
        done();
    }
});
addOps(86 /* LispType.LoopAction */, (exec, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch) => {
    if ((inLoopOrSwitch === 'switch' && a === 'continue') || !inLoopOrSwitch) {
        throw new utils.SandboxError('Illegal ' + a + ' statement');
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false, a === 'break', a === 'continue'));
});
addOps(13 /* LispType.If */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done);
});
addOps(15 /* LispType.InlineIf */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done);
});
addOps(16 /* LispType.InlineIfCase */, (exec, done, ticks, a, b) => done(undefined, new If(a, b)));
addOps(14 /* LispType.IfCase */, (exec, done, ticks, a, b) => done(undefined, new If(a, b)));
addOps(40 /* LispType.Switch */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, a, scope, context, (err, toTest) => {
        if (err) {
            done(err);
            return;
        }
        toTest = valueOrProp(toTest, context);
        if (exec === execSync) {
            let res;
            let isTrue = false;
            for (const caseItem of b) {
                if (isTrue ||
                    (isTrue =
                        !caseItem[1] ||
                            toTest ===
                                valueOrProp(syncDone((d) => exec(ticks, caseItem[1], scope, context, d)).result, context))) {
                    if (!caseItem[2])
                        continue;
                    res = executeTree(ticks, context, caseItem[2], [scope], 'switch');
                    if (res.breakLoop)
                        break;
                    if (res.returned) {
                        done(undefined, res);
                        return;
                    }
                    if (!caseItem[1]) {
                        // default case
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
                for (const caseItem of b) {
                    let ad;
                    if (isTrue ||
                        (isTrue =
                            !caseItem[1] ||
                                toTest ===
                                    valueOrProp((ad = asyncDone((d) => exec(ticks, caseItem[1], scope, context, d))).isInstant ===
                                        true
                                        ? ad.instant
                                        : (await ad.p).result, context))) {
                        if (!caseItem[2])
                            continue;
                        res = await executeTreeAsync(ticks, context, caseItem[2], [scope], 'switch');
                        if (res.breakLoop)
                            break;
                        if (res.returned) {
                            done(undefined, res);
                            return;
                        }
                        if (!caseItem[1]) {
                            // default case
                            break;
                        }
                    }
                }
                done();
            })().catch(done);
        }
    });
});
addOps(39 /* LispType.Try */, (exec, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch) => {
    const [exception, catchBody, finallyBody] = b;
    executeTreeWithDone(exec, (err, res) => {
        executeTreeWithDone(exec, (e) => {
            if (e)
                done(e);
            else if (err) {
                executeTreeWithDone(exec, done, ticks, context, catchBody, [new utils.Scope(scope)], inLoopOrSwitch);
            }
            else {
                done(undefined, res);
            }
        }, ticks, context, finallyBody, [new utils.Scope(scope, {})]);
    }, ticks, context, a, [new utils.Scope(scope)], inLoopOrSwitch);
});
addOps(87 /* LispType.Void */, (exec, done) => {
    done();
});
addOps(45 /* LispType.New */, (exec, done, ticks, a, b, obj, context) => {
    if (!context.ctx.globalsWhitelist.has(a) && !sandboxedFunctions.has(a)) {
        throw new utils.SandboxError(`Object construction not allowed: ${a.constructor.name}`);
    }
    done(undefined, new a(...b));
});
addOps(46 /* LispType.Throw */, (exec, done, ticks, a, b) => {
    done(b);
});
addOps(43 /* LispType.Expression */, (exec, done, ticks, a) => done(undefined, a.pop()));
addOps(0 /* LispType.None */, (exec, done) => done());
function valueOrProp(a, context) {
    if (a instanceof utils.Prop)
        return a.get(context);
    if (a === optional)
        return undefined;
    return a;
}
function execMany(ticks, exec, tree, done, scope, context, inLoopOrSwitch) {
    if (exec === execSync) {
        _execManySync(ticks, tree, done, scope, context, inLoopOrSwitch);
    }
    else {
        _execManyAsync(ticks, tree, done, scope, context, inLoopOrSwitch).catch(done);
    }
}
function _execManySync(ticks, tree, done, scope, context, inLoopOrSwitch) {
    const ret = [];
    for (let i = 0; i < tree.length; i++) {
        let res;
        try {
            res = syncDone((d) => execSync(ticks, tree[i], scope, context, d, inLoopOrSwitch)).result;
        }
        catch (e) {
            done(e);
            return;
        }
        if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
            done(undefined, res);
            return;
        }
        if (utils.isLisp(tree[i]) && tree[i][0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
        ret.push(res);
    }
    done(undefined, ret);
}
async function _execManyAsync(ticks, tree, done, scope, context, inLoopOrSwitch) {
    const ret = [];
    for (let i = 0; i < tree.length; i++) {
        let res;
        try {
            let ad;
            res =
                (ad = asyncDone((d) => execAsync(ticks, tree[i], scope, context, d, inLoopOrSwitch)))
                    .isInstant === true
                    ? ad.instant
                    : (await ad.p).result;
        }
        catch (e) {
            done(e);
            return;
        }
        if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
            done(undefined, res);
            return;
        }
        if (utils.isLisp(tree[i]) && tree[i][0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
        ret.push(res);
    }
    done(undefined, ret);
}
function asyncDone(callback) {
    let isInstant = false;
    let instant;
    const p = new Promise((resolve, reject) => {
        callback((err, result) => {
            if (err)
                reject(err);
            else {
                isInstant = true;
                instant = result;
                resolve({ result });
            }
        });
    });
    return {
        isInstant,
        instant,
        p,
    };
}
function syncDone(callback) {
    let result;
    let err;
    callback((e, r) => {
        err = e;
        result = r;
    });
    if (err)
        throw err;
    return { result };
}
async function execAsync(ticks, tree, scope, context, doneOriginal, inLoopOrSwitch) {
    let done = doneOriginal;
    const p = new Promise((resolve) => {
        done = (e, r) => {
            doneOriginal(e, r);
            resolve();
        };
    });
    if (!_execNoneRecurse(ticks, tree, scope, context, done, true, inLoopOrSwitch) && utils.isLisp(tree)) {
        let op = tree[0];
        let obj;
        try {
            let ad;
            obj =
                (ad = asyncDone((d) => execAsync(ticks, tree[1], scope, context, d, inLoopOrSwitch)))
                    .isInstant === true
                    ? ad.instant
                    : (await ad.p).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let a = obj;
        try {
            a = obj instanceof utils.Prop ? obj.get(context) : obj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (op === 20 /* LispType.PropOptional */ || op === 21 /* LispType.CallOptional */) {
            if (a === undefined || a === null) {
                done(undefined, optional);
                return;
            }
            op = op === 20 /* LispType.PropOptional */ ? 1 /* LispType.Prop */ : 5 /* LispType.Call */;
        }
        if (a === optional) {
            if (op === 1 /* LispType.Prop */ || op === 5 /* LispType.Call */) {
                done(undefined, a);
                return;
            }
            else {
                a = undefined;
            }
        }
        let bobj;
        try {
            let ad;
            bobj =
                (ad = asyncDone((d) => execAsync(ticks, tree[2], scope, context, d, inLoopOrSwitch)))
                    .isInstant === true
                    ? ad.instant
                    : (await ad.p).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let b = bobj;
        try {
            b = bobj instanceof utils.Prop ? bobj.get(context) : bobj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (b === optional) {
            b = undefined;
        }
        if (ops.has(op)) {
            try {
                ops.get(op)?.(execAsync, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch);
            }
            catch (err) {
                done(err);
            }
        }
        else {
            done(new SyntaxError('Unknown operator: ' + op));
        }
    }
    await p;
}
function execSync(ticks, tree, scope, context, done, inLoopOrSwitch) {
    if (!_execNoneRecurse(ticks, tree, scope, context, done, false, inLoopOrSwitch) && utils.isLisp(tree)) {
        let op = tree[0];
        let obj;
        try {
            obj = syncDone((d) => execSync(ticks, tree[1], scope, context, d, inLoopOrSwitch)).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let a = obj;
        try {
            a = obj instanceof utils.Prop ? obj.get(context) : obj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (op === 20 /* LispType.PropOptional */ || op === 21 /* LispType.CallOptional */) {
            if (a === undefined || a === null) {
                done(undefined, optional);
                return;
            }
            op = op === 20 /* LispType.PropOptional */ ? 1 /* LispType.Prop */ : 5 /* LispType.Call */;
        }
        if (a === optional) {
            if (op === 1 /* LispType.Prop */ || op === 5 /* LispType.Call */) {
                done(undefined, a);
                return;
            }
            else {
                a = undefined;
            }
        }
        let bobj;
        try {
            bobj = syncDone((d) => execSync(ticks, tree[2], scope, context, d, inLoopOrSwitch)).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let b = bobj;
        try {
            b = bobj instanceof utils.Prop ? bobj.get(context) : bobj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (b === optional) {
            b = undefined;
        }
        if (ops.has(op)) {
            try {
                ops.get(op)?.(execSync, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch);
            }
            catch (err) {
                done(err);
            }
        }
        else {
            done(new SyntaxError('Unknown operator: ' + op));
        }
    }
}
const unexecTypes = new Set([
    11 /* LispType.ArrowFunction */,
    37 /* LispType.Function */,
    10 /* LispType.InlineFunction */,
    38 /* LispType.Loop */,
    39 /* LispType.Try */,
    40 /* LispType.Switch */,
    14 /* LispType.IfCase */,
    16 /* LispType.InlineIfCase */,
    60 /* LispType.Typeof */,
]);
const currentTicks = { current: { ticks: BigInt(0) } };
function _execNoneRecurse(ticks, tree, scope, context, done, isAsync, inLoopOrSwitch) {
    const exec = isAsync ? execAsync : execSync;
    if (context.ctx.options.executionQuota && context.ctx.options.executionQuota <= ticks.ticks) {
        if (!(typeof context.ctx.options.onExecutionQuotaReached === 'function' &&
            context.ctx.options.onExecutionQuotaReached(ticks, scope, context, tree))) {
            done(new utils.SandboxError('Execution quota exceeded'));
            return true;
        }
    }
    ticks.ticks++;
    currentTicks.current = ticks;
    if (tree instanceof utils.Prop) {
        try {
            done(undefined, tree.get(context));
        }
        catch (err) {
            done(err);
        }
    }
    else if (tree === optional) {
        done();
    }
    else if (Array.isArray(tree) && !utils.isLisp(tree)) {
        if (tree[0] === 0 /* LispType.None */) {
            done();
        }
        else {
            execMany(ticks, exec, tree, done, scope, context, inLoopOrSwitch);
        }
    }
    else if (!utils.isLisp(tree)) {
        done(undefined, tree);
    }
    else if (tree[0] === 42 /* LispType.Block */) {
        execMany(ticks, exec, tree[1], done, scope, context, inLoopOrSwitch);
    }
    else if (tree[0] === 44 /* LispType.Await */) {
        if (!isAsync) {
            done(new utils.SandboxError("Illegal use of 'await', must be inside async function"));
        }
        else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
            execAsync(ticks, tree[1], scope, context, async (e, r) => {
                if (e)
                    done(e);
                else
                    try {
                        done(undefined, await valueOrProp(r, context));
                    }
                    catch (err) {
                        done(err);
                    }
            }, inLoopOrSwitch).catch(done);
        }
        else {
            done(new utils.SandboxError('Async/await is not permitted'));
        }
    }
    else if (unexecTypes.has(tree[0])) {
        try {
            ops.get(tree[0])?.(exec, done, ticks, tree[1], tree[2], tree, context, scope, undefined, inLoopOrSwitch);
        }
        catch (err) {
            done(err);
        }
    }
    else {
        return false;
    }
    return true;
}
function executeTree(ticks, context, executionTree, scopes = [], inLoopOrSwitch) {
    return syncDone((done) => executeTreeWithDone(execSync, done, ticks, context, executionTree, scopes, inLoopOrSwitch)).result;
}
async function executeTreeAsync(ticks, context, executionTree, scopes = [], inLoopOrSwitch) {
    let ad;
    return (ad = asyncDone((done) => executeTreeWithDone(execAsync, done, ticks, context, executionTree, scopes, inLoopOrSwitch))).isInstant === true
        ? ad.instant
        : (await ad.p).result;
}
function executeTreeWithDone(exec, done, ticks, context, executionTree, scopes = [], inLoopOrSwitch) {
    if (!executionTree) {
        done();
        return;
    }
    if (!(executionTree instanceof Array)) {
        throw new SyntaxError('Bad execution tree');
    }
    let scope = context.ctx.globalScope;
    let s;
    while ((s = scopes.shift())) {
        if (typeof s !== 'object')
            continue;
        if (s instanceof utils.Scope) {
            scope = s;
        }
        else {
            scope = new utils.Scope(scope, s, s instanceof utils.LocalScope ? undefined : null);
        }
    }
    if (context.ctx.options.audit && !context.ctx.auditReport) {
        context.ctx.auditReport = {
            globalsAccess: new Set(),
            prototypeAccess: {},
        };
    }
    if (exec === execSync) {
        _executeWithDoneSync(done, ticks, context, executionTree, scope, inLoopOrSwitch);
    }
    else {
        _executeWithDoneAsync(done, ticks, context, executionTree, scope, inLoopOrSwitch).catch(done);
    }
}
function _executeWithDoneSync(done, ticks, context, executionTree, scope, inLoopOrSwitch) {
    if (!(executionTree instanceof Array))
        throw new SyntaxError('Bad execution tree');
    let i = 0;
    for (i = 0; i < executionTree.length; i++) {
        let res;
        let err;
        const current = executionTree[i];
        try {
            execSync(ticks, current, scope, context, (e, r) => {
                err = e;
                res = r;
            }, inLoopOrSwitch);
        }
        catch (e) {
            err = e;
        }
        if (err) {
            done(err);
            return;
        }
        if (res instanceof ExecReturn) {
            done(undefined, res);
            return;
        }
        if (utils.isLisp(current) && current[0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}
async function _executeWithDoneAsync(done, ticks, context, executionTree, scope, inLoopOrSwitch) {
    if (!(executionTree instanceof Array))
        throw new SyntaxError('Bad execution tree');
    let i = 0;
    for (i = 0; i < executionTree.length; i++) {
        let res;
        let err;
        const current = executionTree[i];
        try {
            await execAsync(ticks, current, scope, context, (e, r) => {
                err = e;
                res = r;
            }, inLoopOrSwitch);
        }
        catch (e) {
            err = e;
        }
        if (err) {
            done(err);
            return;
        }
        if (res instanceof ExecReturn) {
            done(undefined, res);
            return;
        }
        if (utils.isLisp(current) && current[0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}

exports.ExecReturn = ExecReturn;
exports.If = If;
exports.KeyVal = KeyVal;
exports.SpreadArray = SpreadArray;
exports.SpreadObject = SpreadObject;
exports.addOps = addOps;
exports.assignCheck = assignCheck;
exports.asyncDone = asyncDone;
exports.createFunction = createFunction;
exports.createFunctionAsync = createFunctionAsync;
exports.currentTicks = currentTicks;
exports.execAsync = execAsync;
exports.execMany = execMany;
exports.execSync = execSync;
exports.executeTree = executeTree;
exports.executeTreeAsync = executeTreeAsync;
exports.ops = ops;
exports.sandboxedFunctions = sandboxedFunctions;
exports.syncDone = syncDone;
