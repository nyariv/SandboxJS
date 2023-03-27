import { LispItem, Lisp, parse, IRegEx, lispifyFunction, CodeString, LispType, LispFamily, ExtractLispOp, isLisp, SwitchCase } from "./parser.js";
import { IExecContext, Ticks } from "./Sandbox.js";

export type SandboxFunction = (code: string, ...args: unknown[]) => () => unknown;
export type sandboxedEval = (code: string) => unknown;
export type sandboxSetTimeout = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type sandboxSetInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type Done = (err?: unknown, res?: unknown) => void
export class ExecReturn<T> {
  constructor(public auditReport: IAuditReport, public result: T, public returned: boolean, public breakLoop = false, public continueLoop = false) {}
}

export interface IAuditReport {
  globalsAccess: Set<unknown>;
  prototypeAccess: {[name: string]: Set<string>}
}

export interface IGlobals {
  [key: string]: unknown
}

export interface IChange {
  type: string;
}

export interface ICreate extends IChange {
  type: "create";
  prop: number|string;
}

export interface IReplace extends IChange {
  type: "replace";
}

export interface IDelete extends IChange {
  type: "delete";
  prop: number|string;
}

export interface IReverse extends IChange {
  type: "reverse";
}

export interface ISort extends IChange {
  type: "sort";
}

export interface IPush extends IChange {
  type: "push";
  added: unknown[];
}

export interface IPop extends IChange {
  type: "pop";
  removed: unknown[];
}

export interface IShift extends IChange {
  type: "shift";
  removed: unknown[];
}

export interface IUnShift extends IChange {
  type: "unshift";
  added: unknown[];
}

export interface ISplice extends IChange {
  type: "splice";
  startIndex: number;
  deleteCount: number; 
  added: unknown[];
  removed: unknown[];

}

export interface ICopyWithin extends IChange {
  type: "copyWithin";
  startIndex: number;
  endIndex: number;
  added: unknown[];
  removed: unknown[];
}

export type Change = ICreate | IReplace | IDelete | IReverse | ISort | IPush | IPop | IUnShift | IShift | ISplice | ICopyWithin

export class Prop {
  constructor(public context: {[key:string]: any}, public prop: string, public isConst = false, public isGlobal = false, public isVariable = false) {
  }

  get<T = unknown>(context: IExecContext): T {
    if (this.context === undefined) throw new ReferenceError(`${this.prop} is not defined`);
    context.getSubscriptions.forEach((cb) => cb(this.context, this.prop))
    return this.context[this.prop];
  }
}

const optional = {};

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

enum VarType {
  let = "let",
  const = "const",
  var = "var"
}

function keysOnly(obj: unknown): {[key: string]: true} {
  const ret = Object.assign({}, obj);
  for (let key in ret) {
    ret[key] = true;
  }
  return ret;
}

export class Scope {
  parent: Scope;
  const: {[key: string]: true} = {};
  let: {[key: string]: true} = {};
  var: {[key: string]: true} = {};
  globals: {[key: string]: true};
  allVars: {[key:string]: unknown} & Object;
  functionThis?: unknown;
  constructor(parent: Scope, vars = {}, functionThis?: unknown) {
    const isFuncScope = functionThis !== undefined || parent === null;
    this.parent = parent;
    this.allVars = vars;
    this.let = isFuncScope ? this.let : keysOnly(vars);
    this.var = isFuncScope ? keysOnly(vars) : this.var;
    this.globals = parent === null ? keysOnly(vars) : {};
    this.functionThis = functionThis;
  }

  get(key: string, functionScope = false): Prop {
    if (key === 'this' && this.functionThis !== undefined) {
      return new Prop({this: this.functionThis}, key, true, false, true);
    }
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    if (this.parent === null || !functionScope || this.functionThis !== undefined) {
      if (this.globals.hasOwnProperty(key)) {
        return new Prop(this.functionThis, key, false, true, true);
      }
      if (key in this.allVars && (!(key in {}) || this.allVars.hasOwnProperty(key))) {
        return new Prop(this.allVars, key, this.const.hasOwnProperty(key), this.globals.hasOwnProperty(key), true);
      }
      if (this.parent === null) {
        return new Prop(undefined, key);
      }
    }
    return this.parent.get(key, functionScope)
  }

  set(key: string, val: unknown) {
    if (key === 'this') throw new SyntaxError('"this" cannot be assigned')
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    let prop = this.get(key);
    if(prop.context === undefined) {
      throw new ReferenceError(`Variable '${key}' was not declared.`);
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

  declare(key: string, type: VarType = null, value: unknown = undefined, isGlobal = false): Prop {
    if (key === 'this') throw new SyntaxError('"this" cannot be declared');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    if (type === 'var' && this.functionThis === undefined && this.parent !== null) {
      return this.parent.declare(key, type, value, isGlobal)
    } else if ((this[type].hasOwnProperty(key) && type !== 'const' && !this.globals.hasOwnProperty(key)) || !(key in this.allVars)) {
      if (isGlobal) {
        this.globals[key] = true;
      }
      this[type][key] = true;
      this.allVars[key] = value;
    } else {
      throw new SandboxError(`Identifier '${key}' has already been declared`);
    }
    return new Prop(this.allVars, key, this.const.hasOwnProperty(key), isGlobal);
  }
}

export interface IScope {
  [key: string]: any;
}

export class FunctionScope implements IScope {}

export class LocalScope implements IScope {}

export class SandboxError extends Error {}

let currentTicks: Ticks;

export function sandboxFunction(context: IExecContext, ticks?: Ticks): SandboxFunction {
  return SandboxFunction;
  function SandboxFunction(...params: string[]) {
    let code = params.pop() || "";
    let parsed = parse(code);
    return createFunction(params, parsed.tree, ticks || currentTicks, {
      ...context,
      constants: parsed.constants,
      tree: parsed.tree
    }, undefined, 'anonymous');
  }
}

function generateArgs(argNames: string[], args: unknown[]) {
  const vars: unknown = {};
  argNames.forEach((arg, i) => {
    if (arg.startsWith('...')) {
      vars[arg.substring(3)] = args.slice(i);
    } else {
      vars[arg] = args[i];
    }
  });
  return vars;
}

const sandboxedFunctions = new WeakSet();
export function createFunction(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxError("Function creation is forbidden");
  }
  let func;
  if (name === undefined) {
    func = (...args) => {
      const vars = generateArgs(argNames, args);
      const res = executeTree(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars)])
      return res.result;
    }
  } else {
    func = function sandboxedObject(...args) {
      const vars = generateArgs(argNames, args);
      const res = executeTree(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars, this)])
      return res.result;
    }
  }
  context.registerSandboxFunction(func);
  sandboxedFunctions.add(func);
  return func;
}

export function createFunctionAsync(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxError("Function creation is forbidden");
  }
  if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
    throw new SandboxError("Async/await not permitted");
  }
  let func;
  if (name === undefined) {
    func = async (...args) => {
      const vars = generateArgs(argNames, args);
      const res = await executeTreeAsync(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars)])
      return res.result;
    }
  } else {
    func = async function sandboxedObject(...args) {
      const vars = generateArgs(argNames, args);
      const res = await executeTreeAsync(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars, this)])
      return res.result;
    }
  }
  context.registerSandboxFunction(func);
  sandboxedFunctions.add(func);
  return func;
}

export function sandboxedEval(func: SandboxFunction): sandboxedEval {
  return sandboxEval;
  function sandboxEval(code: string) {
    return func(code)();
  }
}

export function sandboxedSetTimeout(func: SandboxFunction): sandboxSetTimeout {
  return function sandboxSetTimeout(handler, ...args) {
    if (typeof handler !== 'string') return setTimeout(handler, ...args);
    return setTimeout(func(handler), ...args);
  }
}

export function sandboxedSetInterval(func: SandboxFunction): sandboxSetInterval {
  return function sandboxSetInterval(handler, ...args) {
    if (typeof handler !== 'string') return setInterval(handler, ...args);
    return setInterval(func(handler), ...args);
  }
}

export function assignCheck(obj: Prop, context: IExecContext, op = 'assign') {
  if(obj.context === undefined) {
    throw new ReferenceError(`Cannot ${op} value to undefined.`)
  }
  if(typeof obj.context !== 'object' && typeof obj.context !== 'function') {
    throw new SyntaxError(`Cannot ${op} value to a primitive.`)
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
      context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({type: "delete", prop: obj.prop}));
      context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({type: "delete", prop: obj.prop}));
    }
  } else if (obj.context.hasOwnProperty(obj.prop)) {
    context.setSubscriptions.get(obj.context)?.get(obj.prop)?.forEach((cb) => cb({
      type: "replace"
    }));
    context.setSubscriptionsGlobal.get(obj.context)?.get(obj.prop)?.forEach((cb) => cb({
      type: "replace"
    }));
  } else {
    context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({type: "create", prop: obj.prop}));
    context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({type: "create", prop: obj.prop}));
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

export class KeyVal {
  constructor(public key: string|SpreadObject, public val: unknown) {}
}

export class SpreadObject {
  constructor(public item: {[key: string]: unknown}) {}
}

export class SpreadArray {
  constructor(public item: unknown[]) {}
}

export class If {
  constructor(public t: Lisp, public f: Lisp) {}
}

const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
type OpCallback = (exec: Execution, done: Done, ticks: Ticks, a: any, b: any, obj: any, context: IExecContext, scope: Scope, bobj?: any, inLoopOrSwitch?: string) => void;

export const ops = new Map<LispType, OpCallback>();
export function addOps<Type extends LispFamily>(type: ExtractLispOp<Type>, cb: OpCallback) {
  ops.set(type, cb);
}

addOps(LispType.Prop, (exec, done, ticks, a, b: string, obj, context, scope) => {
    if(a === null) {
      throw new TypeError(`Cannot get property ${b} of null`);
    }
    const type = typeof a;
    if (type === 'undefined' && obj === undefined) {
      let prop = scope.get(b);
      if (prop.context === context.ctx.sandboxGlobal) {
        if (context.ctx.options.audit) {
          context.ctx.auditReport.globalsAccess.add(b);
        }
        const rep = context.ctx.globalsWhitelist.has(context.ctx.sandboxGlobal[b]) ? context.evals.get(context.ctx.sandboxGlobal[b]) : undefined;
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
    } else if (a === undefined) {
      throw new SandboxError("Cannot get property '" + b + "' of undefined")
    }

    if (type !== 'object') {
      if(type === 'number') {
        a = new Number(a);
      } else if(type === 'string') {
        a = new String(a);
      } else if(type === 'boolean') {
        a = new Boolean(a);
      }
    } else if (typeof a.hasOwnProperty === 'undefined') {
      done(undefined, new Prop(undefined, b));
      return;
    }

    const isFunction = type === 'function';
    let prototypeAccess = isFunction || !(a.hasOwnProperty(b) || typeof b === 'number');

    if (context.ctx.options.audit && prototypeAccess) {
      if (typeof b === 'string') {
        let prot = Object.getPrototypeOf(a);
        do {
          if (prot.hasOwnProperty(b)) {
            if(!context.ctx.auditReport.prototypeAccess[prot.constructor.name]) {
              context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
            }
            context.ctx.auditReport.prototypeAccess[prot.constructor.name].add(b);
          }
        } while(prot = Object.getPrototypeOf(prot))
      }
    }

    if (prototypeAccess) {
      if (isFunction) {
        if (!['name', 'length', 'constructor'].includes(b) && a.hasOwnProperty(b)) {
          const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
          const replace = context.ctx.options.prototypeReplacements.get(a);
          if (replace) {
            done(undefined, new Prop(replace(a, true), b));
            return;
          }
          if (whitelist && (!whitelist.size || whitelist.has(b))) {
          } else {
            throw new SandboxError(`Static method or property access not permitted: ${a.name}.${b}`);
          }
        }
      } else if (b !== 'constructor') {
        let prot = a;
        while(prot = Object.getPrototypeOf(prot)) {
          if (prot.hasOwnProperty(b)) {
            const whitelist = context.ctx.prototypeWhitelist.get(prot);
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
        };
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

    let g = obj.isGlobal || (isFunction && !sandboxedFunctions.has(a)) || context.ctx.globalsWhitelist.has(a);

    done(undefined, new Prop(a, b, false, g));
  });

addOps(LispType.Call, (exec, done, ticks, a, b: Lisp[], obj, context, scope) => {
  if (context.ctx.options.forbidFunctionCalls) throw new SandboxError("Function invocations are not allowed");
  if (typeof a !== 'function') {
    throw new TypeError(`${typeof obj.prop === 'symbol' ? 'Symbol' : obj.prop} is not a function`);
  }
  const vals = b.map((item) => {
    if (item instanceof SpreadArray) {
      return [...item.item];
    } else {
      return [item];
    }
  }).flat().map((item) => valueOrProp(item, context));

  if (typeof obj === 'function') {
    done(undefined, obj(...vals));
    return;
  }
  if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
    const cache = new Set<any>();
    const recurse = (x: unknown) => {
      if (!x || !(typeof x === 'object') || cache.has(x)) return;
      cache.add(x);
      for (let y in x) {
        context.getSubscriptions.forEach((cb) => cb(x, y));
        recurse(x[y]);
      }
    };
    recurse(vals[0]);
  }

  if (obj.context instanceof Array && arrayChange.has(obj.context[obj.prop]) && (context.changeSubscriptions.get(obj.context) || context.changeSubscriptionsGlobal.get(obj.context))) {
    let change: Change;
    let changed = false;
    if (obj.prop === "push") {
      change = {
        type: "push",
        added: vals
      }
      changed = !!vals.length;
    } else if (obj.prop === "pop") {
      change = {
        type: "pop",
        removed: obj.context.slice(-1)
      }
      changed = !!change.removed.length;
    }  else if (obj.prop === "shift") {
      change = {
        type: "shift",
        removed: obj.context.slice(0, 1)
      }
      changed = !!change.removed.length;
    } else if (obj.prop === "unshift") {
      change = {
        type: "unshift",
        added: vals
      }
      changed = !!vals.length;
    } else if (obj.prop === "splice") {
      change = {
        type: "splice",
        startIndex: vals[0],
        deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
        added: vals.slice(2),
        removed: obj.context.slice(vals[0], vals[1] === undefined ? undefined : vals[0] + vals[1])
      }
      changed = !!change.added.length || !!change.removed.length;
    } else if (obj.prop === "reverse" || obj.prop === "sort") {
      change = {type: obj.prop}
      changed = !!obj.context.length;
    } else if (obj.prop === "copyWithin") {
      let len = vals[2] === undefined ? obj.context.length - vals[1] : Math.min(obj.context.length, vals[2] - vals[1]);
      change = {
        type: "copyWithin",
        startIndex: vals[0],
        endIndex: vals[0] + len,
        added: obj.context.slice(vals[1], vals[1] + len),
        removed: obj.context.slice(vals[0], vals[0] + len)
      }
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

addOps(LispType.CreateObject, (exec, done, ticks, a, b: KeyVal[], obj, context, scope) => {
  let res = {} as any;
  for (let item of b) {
    if (item.key instanceof SpreadObject) {
      res = {...res, ...item.key.item};
    } else {
      res[item.key] = item.val;
    }
  }
  done(undefined, res);
});

addOps(LispType.KeyVal, (exec, done, ticks, a: string, b: LispItem) => done(undefined, new KeyVal(a, b)));

addOps(LispType.CreateArray, (exec, done, ticks, a, b: Lisp[], obj, context, scope) => {
  const items = b.map((item) => {
    if (item instanceof SpreadArray) {
      return [...item.item];
    } else {
      return [item];
    }
  }).flat().map((item) => valueOrProp(item, context))
  done(undefined, items)
});

addOps(LispType.Group, (exec, done, ticks, a, b) => done(undefined, b));

addOps(LispType.GlobalSymbol, (exec, done, ticks, a, b: string) => {
  switch (b) {
    case 'true': return done(undefined, true);
    case 'false': return done(undefined, false);
    case 'null': return done(undefined, null);
    case 'undefined': return done(undefined, undefined);
    case 'NaN': return done(undefined, NaN);
    case 'Infinity': return done(undefined, Infinity);
  }
  done(new Error('Unknown symbol: ' + b))
})

addOps(LispType.Number, (exec, done, ticks, a, b) => done(undefined, Number(b)));
addOps(LispType.BigInt, (exec, done, ticks, a, b) => done(undefined, BigInt(b)));
addOps(LispType.StringIndex, (exec, done, ticks, a, b: string, obj, context) => done(undefined, context.constants.strings[parseInt(b)]));

addOps(LispType.RegexIndex, (exec, done, ticks, a, b: string, obj, context) => {
  const reg: IRegEx = context.constants.regexes[parseInt(b)];
  if (!context.ctx.globalsWhitelist.has(RegExp)) {
    throw new SandboxError("Regex not permitted");
  } else {
    done(undefined, new RegExp(reg.regex, reg.flags));
  }
});

addOps(LispType.LiteralIndex, (exec, done, ticks, a, b: string, obj, context, scope) => {
  let item = context.constants.literals[parseInt(b)];
  const [,name,js] = item;
  let found: Lisp[] = [];
  let f: RegExpExecArray;
  let resnums: string[] = [];
  while(f = literalRegex.exec(name)) {
    if (!f[2]) {
      found.push(js[parseInt(f[3], 10)]);
      resnums.push(f[3]);
    }
  }

  exec(ticks, found, scope, context, (err, processed) => {
    const reses = {};
    if(err) {
      done(err);
      return;
    }
    for (let i in resnums) {
      const num = resnums[i];
      reses[num] = processed[i];
    }
    done(undefined, name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
      if ($) return match;
      let res = reses[num];
      return ($$ ? $$ : '') + `${valueOrProp(res, context)}`;
    }));
  })
});

addOps(LispType.SpreadArray, (exec, done, ticks, a, b, obj, context, scope) => {
  done(undefined, new SpreadArray(b));
});

addOps(LispType.SpreadObject, (exec, done, ticks, a, b, obj, context, scope) => {
  done(undefined, new SpreadObject(b));
});

addOps(LispType.Not, (exec, done, ticks, a, b) => done(undefined, !b));
addOps(LispType.Inverse, (exec, done, ticks, a, b) => done(undefined, ~b));

addOps(LispType.IncrementBefore, (exec, done, ticks, a, b, obj, context) => {
  assignCheck(obj, context);
  done(undefined, ++obj.context[obj.prop]);
});

addOps(LispType.IncrementAfter, (exec, done, ticks, a, b, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]++);
});

addOps(LispType.DecrementBefore, (exec, done, ticks, a, b, obj, context) => {
  assignCheck(obj, context);
  done(undefined, --obj.context[obj.prop]);
});

addOps(LispType.DecrementAfter, (exec, done, ticks, a, b, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]--);
});

addOps(LispType.Assign, (exec, done, ticks, a, b, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] = b);
});

addOps(LispType.AddEquals, (exec, done, ticks, a, b, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] += b);
});

addOps(LispType.SubractEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] -= b);
});

addOps(LispType.DivideEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] /= b);
});

addOps(LispType.MultiplyEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] *= b);
});

addOps(LispType.PowerEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] **= b);
});

addOps(LispType.ModulusEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] %= b);
});

addOps(LispType.BitNegateEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] ^= b);
});

addOps(LispType.BitAndEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] &= b);
});

addOps(LispType.BitOrEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] |= b);
});

addOps(LispType.ShiftLeftEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] <<= b);
});

addOps(LispType.ShiftRightEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] >>= b);
});

addOps(LispType.UnsignedShiftRightEquals, (exec, done, ticks, a, b: number, obj, context) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop] >>= b);
});

addOps(LispType.LargerThan, (exec, done, ticks, a, b) => done(undefined, a > b));
addOps(LispType.SmallerThan, (exec, done, ticks, a, b) => done(undefined, a < b));
addOps(LispType.LargerEqualThan, (exec, done, ticks, a, b) => done(undefined, a >= b));
addOps(LispType.SmallerEqualThan, (exec, done, ticks, a, b) => done(undefined, a <= b));
addOps(LispType.Equal, (exec, done, ticks, a, b) => done(undefined, a == b));
addOps(LispType.StrictEqual, (exec, done, ticks, a, b) => done(undefined, a === b));
addOps(LispType.NotEqual, (exec, done, ticks, a, b) => done(undefined, a != b));
addOps(LispType.StrictNotEqual, (exec, done, ticks, a, b) => done(undefined, a !== b));
addOps(LispType.And, (exec, done, ticks, a, b) => done(undefined, a && b));
addOps(LispType.Or, (exec, done, ticks, a, b) => done(undefined, a || b));
addOps(LispType.BitAnd, (exec, done, ticks, a: number, b: number) => done(undefined, a & b));
addOps(LispType.BitOr, (exec, done, ticks, a: number, b: number) => done(undefined, a | b));
addOps(LispType.Plus, (exec, done, ticks, a: number, b: number) => done(undefined, a + b));
addOps(LispType.Minus, (exec, done, ticks, a: number, b: number) => done(undefined, a - b));
addOps(LispType.Positive, (exec, done, ticks, a, b) => done(undefined, +b));
addOps(LispType.Negative, (exec, done, ticks, a, b) => done(undefined, -b));
addOps(LispType.Divide, (exec, done, ticks, a: number, b: number) => done(undefined, a / b));
addOps(LispType.BitNegate, (exec, done, ticks, a: number, b: number) => done(undefined, a ^ b));
addOps(LispType.Multiply, (exec, done, ticks, a: number, b: number) => done(undefined, a * b));
addOps(LispType.Modulus, (exec, done, ticks, a: number, b: number) => done(undefined, a % b));
addOps(LispType.BitShiftLeft, (exec, done, ticks, a: number, b: number) => done(undefined, a << b));
addOps(LispType.BitShiftRight, (exec, done, ticks, a: number, b: number) => done(undefined, a >> b));
addOps(LispType.BitUnsignedShiftRight, (exec, done, ticks, a: number, b: number) => done(undefined, a >>> b));
addOps(LispType.Typeof, (exec, done, ticks, a, b: LispItem, obj, context, scope) => {
    exec(ticks, b, scope, context, (e, prop) => {
      done(undefined, typeof valueOrProp(prop, context));
    });
  });

addOps(LispType.Instanceof, (exec, done, ticks, a, b:  { new(): unknown }) => done(undefined, a instanceof b));
addOps(LispType.In, (exec, done, ticks, a: string, b) => done(undefined, a in b));

addOps(LispType.Delete, (exec, done, ticks, a, b, obj, context, scope, bobj: Prop) => {
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
});

addOps(LispType.Return, (exec, done, ticks, a, b, obj, context) => done(undefined, b));

addOps(LispType.Var, (exec, done, ticks, a: string, b: LispItem, obj, context, scope, bobj) => {
  done(undefined, scope.declare(a, VarType.var, b));
});

addOps(LispType.Let, (exec, done, ticks, a: string, b: LispItem, obj, context, scope, bobj) => {
  done(undefined, scope.declare(a, VarType.let, b, bobj && bobj.isGlobal));
});

addOps(LispType.Const, (exec, done, ticks, a: string, b: LispItem, obj, context, scope, bobj) => {
  done(undefined, scope.declare(a, VarType.const, b));
});

addOps(LispType.ArrowFunction, (exec, done, ticks, a: string[], b: Lisp[], obj: Lisp, context, scope) => {
  a = [...a];
    if (typeof obj[2] === "string" || obj[2] instanceof CodeString) {
      obj[2] = b = lispifyFunction(new CodeString(obj[2]), context.constants);
    }
    if (a.shift()) {
      done(undefined, createFunctionAsync(a, b, ticks, context, scope));
    } else {
      done(undefined, createFunction(a, b, ticks, context, scope));
    }
});

addOps(LispType.Function, (exec, done, ticks, a: (string|LispType)[], b: Lisp[], obj: Lisp, context, scope) => {   
  if (typeof obj[2] === "string" || obj[2] instanceof CodeString) {
    obj[2] = b = lispifyFunction(new CodeString(obj[2]), context.constants);
  }
  let isAsync = a.shift();
  let name = a.shift() as string;
  let func;
  if (isAsync === LispType.True) {
    func = createFunctionAsync(a as string[], b, ticks, context, scope, name);
  } else {
    func = createFunction(a as string[], b, ticks, context, scope, name);
  }
  if (name) {
    scope.declare(name, VarType.var, func);
  }
  done(undefined, func);
});

addOps(LispType.InlineFunction, (exec, done, ticks, a: (string|LispType)[], b: Lisp[], obj: Lisp, context, scope) => {
  if (typeof obj[2] === "string" || obj[2] instanceof CodeString) {
    obj[2] = b = lispifyFunction(new CodeString(obj[2]), context.constants);
  }
  let isAsync = a.shift();
  let name = a.shift() as string;
  if (name) {
    scope = new Scope(scope, {})
  }
  let func;
  if (isAsync === LispType.True) {
    func = createFunctionAsync(a as string[], b, ticks, context, scope, name);
  } else {
    func = createFunction(a as string[], b, ticks, context, scope, name);
  }
  if (name) {
    scope.declare(name, VarType.let, func);
  }
  done(undefined, func);
});

addOps(LispType.Loop, (exec, done, ticks, a: Lisp[], b: Lisp[], obj, context, scope) => {
  const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep] = a;
  let loop = true;
  const loopScope = new Scope(scope, {});
  let internalVars = {
    '$$obj': undefined
  };
  const interalScope = new Scope(loopScope, internalVars);
  if (exec === execAsync) {
    (async() => {
      let ad: AsyncDoneRet;
      ad = asyncDone((d) => exec(ticks, startStep, loopScope, context, d));
      internalVars['$$obj'] = (ad = asyncDone((d) => exec(ticks, getIterator, loopScope, context, d))).isInstant === true ? ad.instant : (await ad.p).result;
      ad = asyncDone((d) => exec(ticks, startInternal, interalScope, context, d));
      if (checkFirst) loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant === true ? ad.instant : (await ad.p).result;
      while (loop) {
        let innerLoopVars = {};
        ad = asyncDone((d) => exec(ticks, beforeStep, new Scope(interalScope, innerLoopVars), context, d));
        ad.isInstant === true ? ad.instant : (await ad.p).result;
        let res = await executeTreeAsync(ticks, context, b, [new Scope(loopScope, innerLoopVars)], "loop");
        if (res instanceof ExecReturn && res.returned) {
          done(undefined, res);
          return;
        }
        if (res instanceof ExecReturn && res.breakLoop) {
          break;
        }
        ad = asyncDone((d) => exec(ticks, step, interalScope, context, d));
        loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant === true ? ad.instant : (await ad.p).result;
      }
      done();
    })().catch(done);
  } else {
    syncDone((d) => exec(ticks, startStep, loopScope, context, d));
    internalVars['$$obj'] = syncDone((d) => exec(ticks, getIterator, loopScope, context, d)).result;
    syncDone((d) => exec(ticks, startInternal, interalScope, context, d));
    if (checkFirst) loop = (syncDone((d) => exec(ticks, condition, interalScope, context, d))).result;
    while (loop) {
      let innerLoopVars = {};
      syncDone((d) => exec(ticks, beforeStep, new Scope(interalScope, innerLoopVars), context, d));
      let res = executeTree(ticks, context, b, [new Scope(loopScope, innerLoopVars)], "loop");
      if (res instanceof ExecReturn && res.returned) {
        done(undefined, res);
        return;
      }
      if (res instanceof ExecReturn && res.breakLoop) {
        break;
      }
      syncDone((d) => exec(ticks, step, interalScope, context, d));
      loop = (syncDone((d) => exec(ticks, condition, interalScope, context, d))).result;
    }
    done();
  }
});

addOps(LispType.LoopAction, (exec, done, ticks, a: LispItem, b: LispItem, obj, context, scope, bobj, inLoopOrSwitch) => {
  if ((inLoopOrSwitch === "switch" && a === "continue") || !inLoopOrSwitch) {
    throw new SandboxError("Illegal " + a + " statement");
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false, a === "break", a === "continue"));
});

addOps(LispType.If, (exec, done, ticks, a: LispItem, b:If, obj, context, scope, bobj, inLoopOrSwitch) => {
  exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done);
});

addOps(LispType.InlineIf, (exec, done, ticks, a: LispItem, b: If, obj, context, scope) => {
  exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done);
});
addOps(LispType.InlineIfCase, (exec, done, ticks, a, b) => done(undefined, new If(a, b)));
addOps(LispType.IfCase, (exec, done, ticks, a, b) => done(undefined, new If(a, b)));

addOps(LispType.Switch, (exec, done, ticks, a: LispItem, b: SwitchCase[], obj, context, scope) => {
  exec(ticks, a, scope, context, (err, toTest) => {
    if (err) {
      done(err);
      return;
    }
    toTest = valueOrProp(toTest, context);
    if (exec === execSync) {
      let res: ExecReturn<unknown>;
      let isTrue = false;
      for (let caseItem of b) {
        if (isTrue || (isTrue = !caseItem[1] || toTest === valueOrProp((syncDone((d) => exec(ticks, caseItem[1], scope, context, d))).result, context))) {
          if (!caseItem[2]) continue;
          res = executeTree(ticks, context, caseItem[2], [scope], "switch");
          if (res.breakLoop) break;
          if (res.returned) {
            done(undefined, res);
            return;
          }
          if (!caseItem[1]) { // default case
            break;
          }
        }
      }
      done();
    } else {
      (async () => {
        let res: ExecReturn<unknown>;
        let isTrue = false;
        for (let caseItem of b) {
          let ad: AsyncDoneRet;
          if (isTrue || (isTrue = !caseItem[1] || toTest === valueOrProp((ad = asyncDone((d) => exec(ticks, caseItem[1], scope, context, d))).isInstant === true ? ad.instant : (await ad.p).result, context))) {
            if (!caseItem[2]) continue;
            res = await executeTreeAsync(ticks, context, caseItem[2], [scope], "switch");
            if (res.breakLoop) break;
            if (res.returned) {
              done(undefined, res);
              return;
            }
            if (!caseItem[1]) { // default case
              break;
            }
          }
        }
        done();
      })().catch(done)
    }
  });
});

addOps(LispType.Try, (exec, done, ticks, a: Lisp[], b: [string, Lisp[], Lisp[]], obj, context, scope, bobj, inLoopOrSwitch) => {
  const [exception, catchBody, finallyBody] = b;
  executeTreeWithDone(exec, (err, res) => {
    executeTreeWithDone(exec, (e) => {
      if (e) done(e);
      else  if (err) {
        let sc = {};
        if (exception) sc[exception] = err;
        executeTreeWithDone(exec, done, ticks, context, catchBody, [new Scope(scope)], inLoopOrSwitch);
      } else {
        done(undefined, res);
      }
    }, ticks, context, finallyBody, [new Scope(scope, {})]);
  }, ticks, context, a, [new Scope(scope)], inLoopOrSwitch);
});

addOps(LispType.Void, (exec, done, ticks, a) => {done()});
addOps(LispType.New, (exec, done, ticks, a: new (...args: unknown[]) => unknown, b: unknown[], obj, context) => {
  if (!context.ctx.globalsWhitelist.has(a) && !sandboxedFunctions.has(a)) {
    throw new SandboxError(`Object construction not allowed: ${a.constructor.name}`)
  }
  done(undefined, new a(...b))
});

addOps(LispType.Throw, (exec, done, ticks, a, b) => { done(b) });
addOps(LispType.Expression, (exec, done, ticks, a: unknown[]) => done(undefined, a.pop()));
addOps(LispType.None, (exec, done, ticks, a: unknown[]) => done());

function valueOrProp(a: unknown, context: IExecContext): any {
  if (a instanceof Prop) return a.get(context);
  if (a === optional) return undefined;
  return a;
}

export function execMany(ticks: Ticks, exec: Execution, tree: Lisp[], done: Done, scope: Scope, context: IExecContext, inLoopOrSwitch?: string) {
  if (exec === execSync) {
    _execManySync(ticks, tree, done, scope, context, inLoopOrSwitch);
  } else {
    _execManyAsync(ticks, tree, done, scope, context, inLoopOrSwitch).catch(done);
  }
}

function _execManySync(ticks: Ticks, tree: Lisp[], done: Done, scope: Scope, context: IExecContext, inLoopOrSwitch?: string) {
  let ret = [];
  for (let i = 0; i < tree.length; i++) {
    let res;
    try {
      res = syncDone((d) => execSync(ticks, tree[i], scope, context, d, inLoopOrSwitch)).result;
    } catch(e) {
      done(e);
      return;
    }
    if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
      done(undefined, res);
      return;
    }
    if (isLisp(tree[i]) && tree[i][0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true))
      return;
    }
    ret.push(res);
  }
  done(undefined, ret);
}

async function _execManyAsync(ticks: Ticks, tree: Lisp[], done: Done, scope: Scope, context: IExecContext, inLoopOrSwitch?: string) {
  let ret = [];
  for (let i = 0; i < tree.length; i++) {
    let res;
    try {
      let ad: AsyncDoneRet;
      res = (ad = asyncDone((d) => execAsync(ticks, tree[i], scope, context, d, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
    } catch(e) {
      done(e);
      return;
    }
    if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
      done(undefined, res);
      return;
    }
    if (isLisp(tree[i]) && tree[i][0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true))
      return;
    }
    ret.push(res);
  }
  done(undefined, ret);
}

type Execution = (ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string) => void

export interface AsyncDoneRet {
  isInstant: boolean,
  instant: any,
  p: Promise<{result: any}>
}

export function asyncDone(callback: (done: Done) => void): AsyncDoneRet {
  let isInstant = false;
  let instant: unknown;
  const p = new Promise<any>((resolve, reject) => {
    callback((err, result) => {
      if (err) reject(err);
      else {
        isInstant = true;
        instant = result;
        resolve({result})
      };
    });
  });
  return {
    isInstant,
    instant,
    p
  }
}

export function syncDone(callback: (done: Done) => void): {result: any} {
  let result;
  let err;
  callback((e, r) => {
    err = e;
    result = r;
  });
  if (err) throw err;
  return {result};
}

export async function execAsync(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, doneOriginal: Done, inLoopOrSwitch?: string): Promise<void> {
  let done: Done = doneOriginal;
  const p = new Promise<void>((resolve) => {
    done = (e, r?) => {
      doneOriginal(e, r);
      resolve();
    }
  });
  if(_execNoneRecurse(ticks, tree, scope, context, done, true, inLoopOrSwitch)) {
  } else if (isLisp(tree)) {
    let op = tree[0];
    let obj;
    try {
      let ad: AsyncDoneRet;
      obj = (ad = asyncDone((d) => execAsync(ticks, tree[1], scope, context, d, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    let a = obj;
    try {
      a = obj instanceof Prop ? obj.get(context) : obj;
    } catch (e) {
      done(e);
      return;
    }
    if (op === LispType.PropOptional || op === LispType.CallOptional) {
      if (a === undefined || a === null) {
        done(undefined, optional);
        return;
      }
      op = op === LispType.PropOptional ? LispType.Prop : LispType.Call;
    }
    if (a === optional) {
      if (op === LispType.Prop || op === LispType.Call) {
        done(undefined, a);
        return;
      } else {
        a = undefined;
      }
    }
    let bobj;
    try {
      let ad: AsyncDoneRet;
      bobj = (ad = asyncDone((d) => execAsync(ticks, tree[2], scope, context, d, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    let b = bobj;
    try {
      b = bobj instanceof Prop ? bobj.get(context) : bobj;
    } catch (e) {
      done(e);
      return;
    }
    if (b === optional) {
      b = undefined;
    }
    if (ops.has(op)) {
      try {
        ops.get(op)(execAsync, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch);
      } catch (err) {
        done(err);
      }
    } else {
      done(new SyntaxError('Unknown operator: ' + op));
    }
  }
  await p;
}


export function execSync(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string) {
  if(_execNoneRecurse(ticks, tree, scope, context, done, false, inLoopOrSwitch)) {
  } else if (isLisp(tree)) {
    let op = tree[0];
    let obj;
    try {
      obj = syncDone((d) => execSync(ticks, tree[1], scope, context, d, inLoopOrSwitch)).result;
    } catch (e) {
      done(e);
      return;
    }
    let a = obj;
    try {
      a = obj instanceof Prop ? obj.get(context) : obj;
    } catch (e) {
      done(e);
      return;
    }
    if (op === LispType.PropOptional || op === LispType.CallOptional) {
      if (a === undefined || a === null) {
        done(undefined, optional);
        return;
      }
      op = op === LispType.PropOptional ? LispType.Prop : LispType.Call;
    }
    if (a === optional) {
      if (op === LispType.Prop || op === LispType.Call) {
        done(undefined, a);
        return;
      } else {
        a = undefined;
      }
    }
    let bobj;
    try {
      bobj = syncDone((d) => execSync(ticks, tree[2], scope, context, d, inLoopOrSwitch)).result;
    } catch (e) {
      done(e);
      return;
    }
    let b = bobj;
    try {
      b = bobj instanceof Prop ? bobj.get(context) : bobj;
    } catch (e) {
      done(e);
      return;
    }
    if (b === optional) {
      b = undefined;
    }
    if (ops.has(op)) {
      try {
        ops.get(op)(execSync, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch);
      } catch (err) {
        done(err);
      }
    } else {
      done(new SyntaxError('Unknown operator: ' + op));
    }
  }
}

const unexecTypes = new Set([
  LispType.ArrowFunction,
  LispType.Function,
  LispType.InlineFunction,
  LispType.Loop,
  LispType.Try,
  LispType.Switch,
  LispType.IfCase,
  LispType.InlineIfCase,
  LispType.Typeof
]);

function _execNoneRecurse(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, isAsync: boolean, inLoopOrSwitch?: string): boolean {
  const exec = isAsync ? execAsync : execSync;
  if (context.ctx.options.executionQuota <= ticks.ticks) {
    if (typeof context.ctx.options.onExecutionQuotaReached === 'function' && context.ctx.options.onExecutionQuotaReached(ticks, scope, context, tree)) {
    } else {
      done(new SandboxError("Execution quota exceeded"));
      return;
    }
  }
  ticks.ticks++;
  currentTicks = ticks;
  if (tree instanceof Prop) {
    try {
      done(undefined, tree.get(context));
    } catch (err) {
      done(err);
    }
  } else if (tree === optional) {
    done();
  } else if (Array.isArray(tree) && !isLisp(tree)) {
    if (tree[0] === LispType.None) {
      done();
    } else {
      execMany(ticks, exec, tree as Lisp[], done, scope, context, inLoopOrSwitch);
    }
  } else if (!isLisp(tree)) {
    done(undefined, tree);
  } else if (tree[0] === LispType.Block) {
    execMany(ticks, exec, tree[1] as Lisp[], done, scope, context, inLoopOrSwitch);
  } else if (tree[0] === LispType.Await) {
    if (!isAsync) {
      done(new SandboxError("Illegal use of 'await', must be inside async function"));
    } else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
      execAsync(ticks, tree[1], scope, context, async (e, r) => {
        if (e) done(e);
        else try {
          done(undefined, await valueOrProp(r, context));
        } catch(err) {
          done(err);
        }
      }, inLoopOrSwitch).catch(done);
    } else {
      done(new SandboxError('Async/await is not permitted'))
    }
  } else if (unexecTypes.has(tree[0])) {
    try {
      ops.get(tree[0])(exec, done, ticks, tree[1], tree[2], tree, context, scope, undefined, inLoopOrSwitch);
    } catch (err) {
      done(err);
    }
  } else {
    return false;
  }
  return true;
}
export function executeTree<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: (IScope)[] = [], inLoopOrSwitch?: string): ExecReturn<T> {
  return syncDone((done) => executeTreeWithDone(execSync, done, ticks, context, executionTree, scopes, inLoopOrSwitch)).result;
}

export async function executeTreeAsync<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: (IScope)[] = [], inLoopOrSwitch?: string): Promise<ExecReturn<T>> {
  let ad: AsyncDoneRet;
  return (ad = asyncDone((done) => executeTreeWithDone(execAsync, done, ticks, context, executionTree, scopes, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
}

function executeTreeWithDone(exec: Execution, done: Done, ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: (IScope)[] = [], inLoopOrSwitch?: string) {
  if (!executionTree)  {
    done();
    return;
  }
  if (!(executionTree instanceof Array)) {
    throw new SyntaxError('Bad execution tree');
  }
  let scope = context.ctx.globalScope;
  let s;
  while (s = scopes.shift()) {
    if (typeof s !== "object") continue;
    if (s instanceof Scope) {
      scope = s;
    } else {
      scope = new Scope(scope, s, s instanceof LocalScope ? undefined : null);
    }
  }
  if (context.ctx.options.audit && !context.ctx.auditReport) {
    context.ctx.auditReport = {
      globalsAccess: new Set(),
      prototypeAccess: {},
    }
  }
  if (exec === execSync) {
    _executeWithDoneSync(done, ticks, context, executionTree, scope, inLoopOrSwitch);
  } else {
    _executeWithDoneAsync(done, ticks, context, executionTree, scope, inLoopOrSwitch).catch(done);
  }
}

function _executeWithDoneSync(done: Done, ticks: Ticks, context: IExecContext, executionTree: Lisp[], scope: Scope, inLoopOrSwitch?: string) {
  if (!(executionTree instanceof Array)) throw new SyntaxError('Bad execution tree');
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
    } catch (e) {
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
    if (isLisp(current) && current[0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true))
      return;
    }
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}

async function _executeWithDoneAsync(done: Done, ticks: Ticks, context: IExecContext, executionTree: Lisp[], scope: Scope, inLoopOrSwitch?: string) {
  if (!(executionTree instanceof Array)) throw new SyntaxError('Bad execution tree');
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
    } catch (e) {
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
    if (isLisp(current) && current[0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true))
      return;
    }
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}
