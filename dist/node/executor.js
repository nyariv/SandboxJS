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
        throw new utils.SandboxCapabilityError('Function creation is forbidden');
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
        throw new utils.SandboxCapabilityError('Function creation is forbidden');
    }
    if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
        throw new utils.SandboxCapabilityError('Async/await not permitted');
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
    if (obj.isConst) {
        throw new TypeError(`Assignment to constant variable.`);
    }
    if (obj.isGlobal) {
        throw new utils.SandboxAccessError(`Cannot ${op} property '${obj.prop.toString()}' of a global object`);
    }
    if (obj.context === null) {
        throw new TypeError('Cannot set properties of null');
    }
    if (typeof obj.context[obj.prop] === 'function' &&
        !utils.hasOwnProperty(obj.context, obj.prop)) {
        throw new utils.SandboxAccessError(`Override prototype property '${obj.prop.toString()}' not allowed`);
    }
    if (op === 'delete') {
        if (utils.hasOwnProperty(obj.context, obj.prop)) {
            context.changeSubscriptions
                .get(obj.context)
                ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop.toString() }));
            context.changeSubscriptionsGlobal
                .get(obj.context)
                ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop.toString() }));
        }
    }
    else if (utils.hasOwnProperty(obj.context, obj.prop)) {
        context.setSubscriptions
            .get(obj.context)
            ?.get(obj.prop.toString())
            ?.forEach((cb) => cb({
            type: 'replace',
        }));
        context.setSubscriptionsGlobal
            .get(obj.context)
            ?.get(obj.prop.toString())
            ?.forEach((cb) => cb({
            type: 'replace',
        }));
    }
    else {
        context.changeSubscriptions
            .get(obj.context)
            ?.forEach((cb) => cb({ type: 'create', prop: obj.prop.toString() }));
        context.changeSubscriptionsGlobal
            .get(obj.context)
            ?.forEach((cb) => cb({ type: 'create', prop: obj.prop.toString() }));
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
function isPropertyKey(val) {
    return ['string', 'number', 'symbol'].includes(typeof val);
}
function hasPossibleProperties(val) {
    return val !== null && val !== undefined;
}
addOps(1 /* LispType.Prop */, ({ done, a, b, obj, context, scope }) => {
    if (a === null) {
        throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
    }
    if (!isPropertyKey(b)) {
        try {
            b = `${b}`;
        }
        catch (e) {
            done(e);
            return;
        }
    }
    if (a === undefined && obj === undefined && typeof b === 'string') {
        // is variable access
        const prop = scope.get(b);
        if (prop.context === context.ctx.sandboxGlobal) {
            if (context.ctx.options.audit) {
                context.ctx.auditReport?.globalsAccess.add(b);
            }
        }
        const val = prop.context ? prop.context[prop.prop] : undefined;
        if (val === globalThis) {
            done(undefined, new utils.Prop({
                [prop.prop]: context.ctx.sandboxGlobal,
            }, prop.prop, prop.isConst, false, prop.isVariable));
            return;
        }
        const e = typeof val === 'function' && context.evals.get(val);
        if (e) {
            done(undefined, new utils.Prop({
                [prop.prop]: e,
            }, prop.prop, prop.isConst, true, prop.isVariable));
            return;
        }
        done(undefined, prop);
        return;
    }
    else if (a === undefined) {
        throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
    }
    if (!hasPossibleProperties(a)) {
        done(undefined, new utils.Prop(undefined, b));
        return;
    }
    const prototypeAccess = typeof a === 'function' || !utils.hasOwnProperty(a, b);
    if (context.ctx.options.audit && prototypeAccess) {
        let prot = Object.getPrototypeOf(a);
        do {
            if (utils.hasOwnProperty(prot, b)) {
                if (context.ctx.auditReport &&
                    !context.ctx.auditReport.prototypeAccess[prot.constructor.name]) {
                    context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
                }
                context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
            }
        } while ((prot = Object.getPrototypeOf(prot)));
    }
    if (prototypeAccess) {
        if (typeof a === 'function') {
            if (utils.hasOwnProperty(a, b)) {
                const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
                const replace = context.ctx.options.prototypeReplacements.get(a);
                if (replace) {
                    done(undefined, new utils.Prop(replace(a, true), b));
                    return;
                }
                if (!(whitelist && (!whitelist.size || whitelist.has(b)))) {
                    throw new utils.SandboxAccessError(`Static method or property access not permitted: ${a.name}.${b.toString()}`);
                }
            }
        }
        let prot = a;
        while ((prot = Object.getPrototypeOf(prot))) {
            if (utils.hasOwnProperty(prot, b)) {
                const whitelist = context.ctx.prototypeWhitelist.get(prot);
                const replace = context.ctx.options.prototypeReplacements.get(prot.constructor);
                if (replace) {
                    done(undefined, new utils.Prop(replace(a, false), b));
                    return;
                }
                if (whitelist && (!whitelist.size || whitelist.has(b))) {
                    break;
                }
                throw new utils.SandboxAccessError(`Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`);
            }
        }
    }
    const e = typeof a[b] === 'function' && context.evals.get(a[b]);
    if (e) {
        done(undefined, new utils.Prop({
            [b]: e,
        }, b, false, true, false));
        return;
    }
    if (a[b] === globalThis) {
        done(undefined, new utils.Prop({
            [b]: context.ctx.sandboxGlobal,
        }, b, false, false, false));
        return;
    }
    const g = (obj instanceof utils.Prop && obj.isGlobal) ||
        (typeof a === 'function' && !sandboxedFunctions.has(a)) ||
        context.ctx.globalsWhitelist.has(a);
    done(undefined, new utils.Prop(a, b, false, g, false));
});
addOps(5 /* LispType.Call */, ({ done, a, b, obj, context }) => {
    if (context.ctx.options.forbidFunctionCalls)
        throw new utils.SandboxCapabilityError('Function invocations are not allowed');
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
        let ret = obj(...vals);
        if (ret instanceof Promise) {
            ret = checkHaltAsync(context, ret);
        }
        done(undefined, ret);
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
    let ret = obj.context[obj.prop](...vals);
    if (typeof ret === 'function') {
        ret = context.evals.get(ret) || ret;
    }
    if (ret === globalThis) {
        ret = context.ctx.sandboxGlobal;
    }
    if (ret instanceof Promise) {
        ret = checkHaltAsync(context, ret);
    }
    done(undefined, ret);
});
addOps(22 /* LispType.CreateObject */, ({ done, b }) => {
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
addOps(6 /* LispType.KeyVal */, ({ done, a, b }) => done(undefined, new KeyVal(a, b)));
addOps(12 /* LispType.CreateArray */, ({ done, b, context }) => {
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
addOps(23 /* LispType.Group */, ({ done, b }) => done(undefined, b));
addOps(35 /* LispType.GlobalSymbol */, ({ done, b }) => {
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
addOps(7 /* LispType.Number */, ({ done, b }) => done(undefined, Number(b.replace(/_/g, ''))));
addOps(83 /* LispType.BigInt */, ({ done, b }) => done(undefined, BigInt(b.replace(/_/g, ''))));
addOps(2 /* LispType.StringIndex */, ({ done, b, context }) => done(undefined, context.constants.strings[parseInt(b)]));
addOps(85 /* LispType.RegexIndex */, ({ done, b, context }) => {
    const reg = context.constants.regexes[parseInt(b)];
    if (!context.ctx.globalsWhitelist.has(RegExp)) {
        throw new utils.SandboxCapabilityError('Regex not permitted');
    }
    else {
        done(undefined, new RegExp(reg.regex, reg.flags));
    }
});
addOps(84 /* LispType.LiteralIndex */, ({ exec, done, ticks, b, context, scope }) => {
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
addOps(18 /* LispType.SpreadArray */, ({ done, b }) => {
    done(undefined, new SpreadArray(b));
});
addOps(17 /* LispType.SpreadObject */, ({ done, b }) => {
    done(undefined, new SpreadObject(b));
});
addOps(24 /* LispType.Not */, ({ done, b }) => done(undefined, !b));
addOps(64 /* LispType.Inverse */, ({ done, b }) => done(undefined, ~b));
addOps(25 /* LispType.IncrementBefore */, ({ done, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, ++obj.context[obj.prop]);
});
addOps(26 /* LispType.IncrementAfter */, ({ done, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop]++);
});
addOps(27 /* LispType.DecrementBefore */, ({ done, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, --obj.context[obj.prop]);
});
addOps(28 /* LispType.DecrementAfter */, ({ done, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop]--);
});
addOps(9 /* LispType.Assign */, ({ done, b, obj, context, scope, bobj }) => {
    assignCheck(obj, context);
    obj.isGlobal = bobj?.isGlobal || false;
    if (obj.isVariable) {
        const s = scope.getWhereValScope(obj.prop, obj.prop === 'this');
        if (s === null) {
            throw new ReferenceError(`Cannot assign to undeclared variable '${obj.prop.toString()}'`);
        }
        s.set(obj.prop, b);
        if (obj.isGlobal) {
            s.globals[obj.prop.toString()] = true;
        }
        else {
            delete s.globals[obj.prop.toString()];
        }
        done(undefined, b);
        return;
    }
    done(undefined, (obj.context[obj.prop] = b));
});
addOps(66 /* LispType.AddEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] += b));
});
addOps(65 /* LispType.SubractEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] -= b));
});
addOps(67 /* LispType.DivideEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] /= b));
});
addOps(69 /* LispType.MultiplyEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] *= b));
});
addOps(68 /* LispType.PowerEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] **= b));
});
addOps(70 /* LispType.ModulusEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] %= b));
});
addOps(71 /* LispType.BitNegateEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] ^= b));
});
addOps(72 /* LispType.BitAndEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] &= b));
});
addOps(73 /* LispType.BitOrEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] |= b));
});
addOps(76 /* LispType.ShiftLeftEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] <<= b));
});
addOps(75 /* LispType.ShiftRightEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>= b));
});
addOps(74 /* LispType.UnsignedShiftRightEquals */, ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>>= b));
});
addOps(57 /* LispType.LargerThan */, ({ done, a, b }) => done(undefined, a > b));
addOps(56 /* LispType.SmallerThan */, ({ done, a, b }) => done(undefined, a < b));
addOps(55 /* LispType.LargerEqualThan */, ({ done, a, b }) => done(undefined, a >= b));
addOps(54 /* LispType.SmallerEqualThan */, ({ done, a, b }) => done(undefined, a <= b));
addOps(52 /* LispType.Equal */, ({ done, a, b }) => done(undefined, a == b));
addOps(32 /* LispType.StrictEqual */, ({ done, a, b }) => done(undefined, a === b));
addOps(53 /* LispType.NotEqual */, ({ done, a, b }) => done(undefined, a != b));
addOps(31 /* LispType.StrictNotEqual */, ({ done, a, b }) => done(undefined, a !== b));
addOps(29 /* LispType.And */, ({ done, a, b }) => done(undefined, a && b));
addOps(30 /* LispType.Or */, ({ done, a, b }) => done(undefined, a || b));
addOps(89 /* LispType.NullishCoalescing */, ({ done, a, b }) => done(undefined, a ?? b));
addOps(77 /* LispType.BitAnd */, ({ done, a, b }) => done(undefined, a & b));
addOps(78 /* LispType.BitOr */, ({ done, a, b }) => done(undefined, a | b));
addOps(33 /* LispType.Plus */, ({ done, a, b }) => done(undefined, a + b));
addOps(47 /* LispType.Minus */, ({ done, a, b }) => done(undefined, a - b));
addOps(59 /* LispType.Positive */, ({ done, b }) => done(undefined, +b));
addOps(58 /* LispType.Negative */, ({ done, b }) => done(undefined, -b));
addOps(48 /* LispType.Divide */, ({ done, a, b }) => done(undefined, a / b));
addOps(49 /* LispType.Power */, ({ done, a, b }) => done(undefined, a ** b));
addOps(79 /* LispType.BitNegate */, ({ done, a, b }) => done(undefined, a ^ b));
addOps(50 /* LispType.Multiply */, ({ done, a, b }) => done(undefined, a * b));
addOps(51 /* LispType.Modulus */, ({ done, a, b }) => done(undefined, a % b));
addOps(80 /* LispType.BitShiftLeft */, ({ done, a, b }) => done(undefined, a << b));
addOps(81 /* LispType.BitShiftRight */, ({ done, a, b }) => done(undefined, a >> b));
addOps(82 /* LispType.BitUnsignedShiftRight */, ({ done, a, b }) => done(undefined, a >>> b));
addOps(60 /* LispType.Typeof */, ({ exec, done, ticks, b, context, scope }) => {
    exec(ticks, b, scope, context, (e, prop) => {
        done(undefined, typeof valueOrProp(prop, context));
    });
});
addOps(62 /* LispType.Instanceof */, ({ done, a, b }) => done(undefined, a instanceof b));
addOps(63 /* LispType.In */, ({ done, a, b }) => done(undefined, a in b));
addOps(61 /* LispType.Delete */, ({ done, context, bobj }) => {
    if (!(bobj instanceof utils.Prop)) {
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
addOps(8 /* LispType.Return */, ({ done, b }) => done(undefined, b));
addOps(34 /* LispType.Var */, ({ done, a, b, scope, bobj }) => {
    done(undefined, scope.declare(a, "var" /* VarType.var */, b, bobj?.isGlobal || false));
});
addOps(3 /* LispType.Let */, ({ done, a, b, scope, bobj }) => {
    done(undefined, scope.declare(a, "let" /* VarType.let */, b, bobj?.isGlobal || false));
});
addOps(4 /* LispType.Const */, ({ done, a, b, scope, bobj }) => {
    done(undefined, scope.declare(a, "const" /* VarType.const */, b, bobj?.isGlobal || false));
});
addOps(11 /* LispType.ArrowFunction */, ({ done, ticks, a, b, obj, context, scope }) => {
    a = [...a];
    if (typeof obj[2] === 'string' || obj[2] instanceof utils.CodeString) {
        if (context.allowJit && context.evalContext) {
            obj[2] = b = context.evalContext.lispifyFunction(new utils.CodeString(obj[2]), context.constants);
        }
        else {
            throw new utils.SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
        }
    }
    if (a.shift()) {
        done(undefined, createFunctionAsync(a, b, ticks, context, scope));
    }
    else {
        done(undefined, createFunction(a, b, ticks, context, scope));
    }
});
addOps(37 /* LispType.Function */, ({ done, ticks, a, b, obj, context, scope }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof utils.CodeString) {
        if (context.allowJit && context.evalContext) {
            obj[2] = b = context.evalContext.lispifyFunction(new utils.CodeString(obj[2]), context.constants);
        }
        else {
            throw new utils.SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
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
addOps(10 /* LispType.InlineFunction */, ({ done, ticks, a, b, obj, context, scope }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof utils.CodeString) {
        if (context.allowJit && context.evalContext) {
            obj[2] = b = context.evalContext.lispifyFunction(new utils.CodeString(obj[2]), context.constants);
        }
        else {
            throw new utils.SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
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
addOps(38 /* LispType.Loop */, ({ exec, done, ticks, a, b, context, scope }) => {
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
addOps(86 /* LispType.LoopAction */, ({ done, a, context, inLoopOrSwitch }) => {
    if ((inLoopOrSwitch === 'switch' && a === 'continue') || !inLoopOrSwitch) {
        throw new TypeError('Illegal ' + a + ' statement');
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false, a === 'break', a === 'continue'));
});
addOps(13 /* LispType.If */, ({ exec, done, ticks, a, b, context, scope, inLoopOrSwitch }) => {
    exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done, inLoopOrSwitch);
});
addOps(15 /* LispType.InlineIf */, ({ exec, done, ticks, a, b, context, scope }) => {
    exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done, undefined);
});
addOps(16 /* LispType.InlineIfCase */, ({ done, a, b }) => done(undefined, new If(a, b)));
addOps(14 /* LispType.IfCase */, ({ done, a, b }) => done(undefined, new If(a, b)));
addOps(40 /* LispType.Switch */, ({ exec, done, ticks, a, b, context, scope }) => {
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
addOps(39 /* LispType.Try */, ({ exec, done, ticks, a, b, context, scope, inLoopOrSwitch }) => {
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
addOps(87 /* LispType.Void */, ({ done }) => {
    done();
});
addOps(45 /* LispType.New */, ({ done, a, b, context }) => {
    if (!context.ctx.globalsWhitelist.has(a) && !sandboxedFunctions.has(a)) {
        throw new utils.SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
    }
    done(undefined, new a(...b));
});
addOps(46 /* LispType.Throw */, ({ done, b }) => {
    done(b);
});
addOps(43 /* LispType.Expression */, ({ done, a }) => done(undefined, a.pop()));
addOps(0 /* LispType.None */, ({ done }) => done());
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
        // Short-circuit for nullish coalescing: if a is not null/undefined, return a without evaluating b
        if (op === 89 /* LispType.NullishCoalescing */ && a !== undefined && a !== null) {
            done(undefined, a);
            return;
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
        performOp({
            op,
            exec: execAsync,
            done,
            ticks,
            a,
            b,
            obj,
            context,
            scope,
            bobj,
            inLoopOrSwitch,
            tree,
        });
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
        // Short-circuit for nullish coalescing: if a is not null/undefined, return a without evaluating b
        if (op === 89 /* LispType.NullishCoalescing */ && a !== undefined && a !== null) {
            done(undefined, a);
            return;
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
        performOp({
            op,
            exec: execSync,
            done,
            ticks,
            a,
            b,
            obj,
            context,
            scope,
            bobj,
            inLoopOrSwitch,
            tree,
        });
    }
}
async function checkHaltAsync(context, promise) {
    if (!(promise instanceof Promise))
        return promise;
    let done = false;
    let halted = context.ctx.sandbox.halted;
    let doResolve = () => { };
    let subres;
    let subhalt;
    const interupted = new Promise((resolve) => {
        doResolve = () => {
            subhalt.unsubscribe();
            subres.unsubscribe();
            resolve();
        };
        subhalt = context.ctx.sandbox.subscribeHalt(() => {
            halted = true;
        });
        subres = context.ctx.sandbox.subscribeResume(() => {
            halted = false;
            if (done)
                doResolve();
        });
    });
    promise.finally(() => {
        done = true;
        if (!halted) {
            doResolve();
        }
    });
    await Promise.allSettled([promise, interupted]);
    return promise;
}
function checkHaltExpectedTicks(params, expectTicks = 0) {
    const sandbox = params.context.ctx.sandbox;
    const options = params.context.ctx.options;
    const { ticks, scope, context, done, op } = params;
    if (sandbox.halted) {
        const sub = sandbox.subscribeResume(() => {
            sub.unsubscribe();
            try {
                const o = ops.get(op);
                if (!o) {
                    done(new SyntaxError('Unknown operator: ' + op));
                    return;
                }
                o(params);
            }
            catch (err) {
                if (options.haltOnSandboxError && err instanceof utils.SandboxError) {
                    const sub = sandbox.subscribeResume(() => {
                        sub.unsubscribe();
                        done(err);
                    });
                    sandbox.haltExecution({
                        error: err,
                        ticks,
                        scope,
                        context,
                    });
                }
                else {
                    done(err);
                }
            }
        });
        return true;
    }
    else if (ticks.tickLimit && ticks.tickLimit <= ticks.ticks + BigInt(expectTicks)) {
        const sub = sandbox.subscribeResume(() => {
            sub.unsubscribe();
            try {
                const o = ops.get(op);
                if (!o) {
                    done(new SyntaxError('Unknown operator: ' + op));
                    return;
                }
                o(params);
            }
            catch (err) {
                if (context.ctx.options.haltOnSandboxError && err instanceof utils.SandboxError) {
                    const sub = sandbox.subscribeResume(() => {
                        sub.unsubscribe();
                        done(err);
                    });
                    sandbox.haltExecution({
                        error: err,
                        ticks,
                        scope,
                        context,
                    });
                }
                else {
                    done(err);
                }
            }
        });
        const error = new utils.SandboxExecutionQuotaExceededError('Execution quota exceeded');
        sandbox.haltExecution({
            error,
            ticks,
            scope: scope,
            context,
        });
        return true;
    }
    return false;
}
function performOp(params) {
    const { done, op, ticks, context, scope } = params;
    ticks.ticks++;
    const sandbox = context.ctx.sandbox;
    if (checkHaltExpectedTicks(params)) {
        return;
    }
    try {
        const o = ops.get(op);
        if (!o) {
            done(new utils.SandboxExecutionTreeError('Unknown operator: ' + op));
            return;
        }
        o(params);
    }
    catch (err) {
        if (context.ctx.options.haltOnSandboxError && err instanceof utils.SandboxError) {
            const sub = sandbox.subscribeResume(() => {
                sub.unsubscribe();
                done(err);
            });
            sandbox.haltExecution({
                error: err,
                ticks,
                scope,
                context,
            });
        }
        else {
            done(err);
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
            done(new SyntaxError("Illegal use of 'await', must be inside async function"));
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
            done(new utils.SandboxCapabilityError('Async/await is not permitted'));
        }
    }
    else if (unexecTypes.has(tree[0])) {
        performOp({
            op: tree[0],
            exec,
            done,
            ticks,
            a: tree[1],
            b: tree[2],
            obj: tree,
            tree,
            context,
            scope,
            bobj: undefined,
            inLoopOrSwitch,
        });
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
