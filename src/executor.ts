import { SpreadArray, IExecutionTree, LispItem, KeyVal, SpreadObject, If, Lisp, parse } from "./parser";
import { IContext } from "./Sandbox";


export type SandboxFunction = (code: string, ...args: any[]) => () => any;
export type sandboxedEval = (code: string) => any;
export type sandboxSetTimeout = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export type sandboxSetInterval = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;

export class ExecReturn {
  constructor(public auditReport: IAuditReport, public result: any, public returned: boolean, public breakLoop = false, public continueLoop = false) {}
}

export interface IAuditReport {
  globalsAccess: Set<any>;
  prototypeAccess: {[name: string]: Set<string>}
}

export interface IGlobals {
  [key: string]: any
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

export type replacementCallback = (obj: any, isStaticAccess: boolean) => any

export class Prop {
  constructor(public context: {[key:string]: any}, public prop: string, public isConst = false, public isGlobal = false, public isVariable = false) {
  }
}

const reservedWords = new Set([
  'instanceof',
  'typeof',
  'return',
  'try',
  'catch',
  'if',
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
  'function'
]);

enum VarType {
  let = "let",
  const = "const",
  var = "var"
}

export class Scope {
  parent: Scope;
  const = new Set<string>();
  let = new Set<string>();
  var: Set<string>;
  globals: Set<string>;
  allVars: {[key:string]: any} & Object;
  functionThis: any;
  constructor(parent: Scope, vars = {}, functionThis?: any) {
    const isFuncScope = functionThis !== undefined || parent === null;
    this.parent = parent;
    this.allVars = vars;
    this.let = isFuncScope ? this.let : new Set(Object.keys(vars));
    this.var = isFuncScope ? new Set(Object.keys(vars)) : this.var;
    this.globals = parent === null ? new Set(Object.keys(vars)) : new Set();
    this.functionThis = functionThis;
    if (isFuncScope && this.allVars['this'] === undefined) {
      this.var.add('this');
      this.allVars['this'] = functionThis;
    }
  }

  get(key: string, functionScope = false): any {
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
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
    return this.parent.get(key, functionScope)
  }

  set(key: string, val: any) {
    if (key === 'this') throw new SyntaxError('"this" cannot be assigned')
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    let prop = this.get(key);
    if(prop.context === undefined) {
      throw new ReferenceError(`Variable '${key}' was not declared.`);
    }``
    if (prop.isConst) {
      throw new TypeError(`Cannot assign to const variable '${key}'`);
    }
    if (prop.isGlobal) {
      throw new SandboxError(`Cannot override global variable '${key}'`);
    }
    prop.context[prop] = val;
    return prop;
  }

  declare(key: string, type: VarType = null, value: any = undefined, isGlobal = false) {
    if (key === 'this') throw new SyntaxError('"this" cannot be declared');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    if (type === 'var' && this.functionThis === undefined && this.parent !== null) {
      return this.parent.declare(key, type, value, isGlobal)
    } else if ((this[type].has(key) && type !== 'const' && !this.globals.has(key)) || !(key in this.allVars)) {
      if (isGlobal) {
        this.globals.add(key);
      }
      this[type].add(key);
      this.allVars[key] = value;
    } else {
      throw new SandboxError(`Identifier '${key}' has already been declared`);
    }
    return new Prop(this.allVars, key, this.const.has(key), isGlobal);
  }
}

export class SandboxError extends Error {

}

export function sandboxFunction(context: IContext): SandboxFunction {
  return SandboxFunction;
  function SandboxFunction(...params: any[]) {
    let code = params.pop() || "";
    let parsed = parse(code);
    return createFunction(params, parsed, context, undefined, 'anonymous');
  }
}

const sandboxedFunctions = new WeakSet();
export function createFunction(argNames: string[], parsed: IExecutionTree, context: IContext, scope?: Scope, name?: string) {
  let func = function(...args) {
    const vars: any = {};
    argNames.forEach((arg, i) => {
      if (arg.startsWith('...')) {
        vars[arg.substring(3)] = args.slice(i);
      } else {
        vars[arg] = args[i];
      }
    });
    const res = executeTree(context, parsed, scope === undefined ? [] : [new Scope(scope, vars, name === undefined ? undefined : this)])
    return res.result;
  }
  if (name !== undefined) {
    Object.defineProperty(func, 'name', {value: name, writable: false});
  }
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
    return setTimeout(func(handler), args[0]);
  }
}

export function sandboxedSetInterval(func: SandboxFunction): sandboxSetInterval {
  return function sandboxSetInterval(handler, ...args) {
    if (typeof handler !== 'string') return setInterval(handler, ...args);
    return setTimeout(func(handler), args[0]);
  }
}

function assignCheck(obj: Prop, context: IContext, op = 'assign') {
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
    }
  } else if (obj.context.hasOwnProperty(obj.prop)) {
    context.setSubscriptions.get(obj.context)?.get(obj.prop)?.forEach((cb) => cb({
      type: "replace"
    }));
  } else {
    context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({type: "create", prop: obj.prop}));
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
let ops2: {[op:string]: (a: LispItem, b: LispItem, obj: Prop|any|undefined, context: IContext, scope: Scope, bobj: Prop|any|undefined) => any} = {
  'prop': (a: LispItem|any, b: string, obj, context, scope) => {
    if(a === null) {
      throw new TypeError(`Cannot get property ${b} of null`);
    }
    const type = typeof a;
    if (type === 'undefined' && obj === undefined) {
      let prop = scope.get(b);
      if (prop.context === undefined) throw new ReferenceError(`${b} is not defined`);
      if (prop.context === context.sandboxGlobal) {
        if (context.options.audit) {
          context.auditReport.globalsAccess.add(b);
        }
        const rep = context.evals.get(context.sandboxGlobal[b]);
        if (rep) return rep;
      }
      if (prop.context && prop.context[b] === globalThis) {
        return context.globalScope.get('this');
      }

      context.getSubscriptions.forEach((cb) => cb(prop.context, prop.prop));
      return prop;
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
      return new Prop(undefined, b);
    }

    const isFunction = type === 'function';
    let prototypeAccess = isFunction || !(a.hasOwnProperty(b) || typeof b === 'number');

    if (context.options.audit && prototypeAccess) {
      if (typeof b === 'string') {
        let prot = a.constructor.prototype;
        do {
          if (prot.hasOwnProperty(b)) {
            if(!context.auditReport.prototypeAccess[prot.constructor.name]) {
              context.auditReport.prototypeAccess[prot.constructor.name] = new Set();
            }
            context.auditReport.prototypeAccess[prot.constructor.name].add(b);
          }
        } while(prot = Object.getPrototypeOf(prot))
      }
    }

    if (prototypeAccess) {
      if (isFunction) {
        if (!['name', 'length', 'constructor'].includes(b) && a.hasOwnProperty(b)) {
          const whitelist = context.prototypeWhitelist.get(a);
          const replace = context.prototypeReplacements.get(a);
          if (replace) {
            return new Prop(replace(a, true), b)
          }
          if (whitelist && (!whitelist.size || whitelist.has(b))) {
          } else {
            throw new SandboxError(`Static method or property access not permitted: ${a.name}.${b}`);
          }
        }
      } else if (b !== 'constructor') {
        let prot = a.constructor.prototype;
        do {
          if (prot.hasOwnProperty(b)) {
            const whitelist = context.prototypeWhitelist.get(prot.constructor);
            const replace = context.prototypeReplacements.get(prot.constuctor);
            if (replace) {
              return new Prop(replace(a, false), b)
            }
            if (whitelist && (!whitelist.size || whitelist.has(b))) {
              break;
            }
            throw new SandboxError(`Method or property access not permitted: ${prot.constructor.name}.${b}`);
          }
        } while(prot = Object.getPrototypeOf(prot));
      }
    }

    const rep = context.evals.get(a[b]);
    if (rep) return rep;
    if (a[b] === globalThis) {
      return context.globalScope.get('this');
    }

    let g = obj.isGlobal || (isFunction && !sandboxedFunctions.has(a)) || context.globalsWhitelist.has(a);

    if (!g) {
      context.getSubscriptions.forEach((cb) => cb(a, b));
    }

    return new Prop(a, b, false, g);
  },
  'call': (a, b: LispItem[], obj, context, scope) => {
    if (context.options.forbidMethodCalls) throw new SandboxError("Method calls are not allowed");
    if (typeof a !== 'function') {
      throw new TypeError(`${obj.prop} is not a function`);
    }
    const args = b.map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    }).flat();
    if (typeof obj === 'function') {
      return obj(...args.map((item: any) => exec(item, scope, context)));
    }
    const vals = args.map((item: any) => exec(item, scope, context));
    if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
      const cache = new Set<any>();
      const recurse = (x: any) => {
        if (!x || !(typeof x === 'object') || cache.has(x)) return;
        cache.add(x);
        for (let y in x) {
          context.getSubscriptions.forEach((cb) => cb(x, y));
          recurse(x[y]);
        }
      };
      recurse(vals[0]);
    }

    if (obj.context instanceof Array && arrayChange.has(obj.context[obj.prop]) && context.changeSubscriptions.get(obj.context)) {
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
      }
      return obj.context[obj.prop](...vals);
    }
    return obj.context[obj.prop](...args.map((item: any) => exec(item, scope, context)));
  },
  'createObject': (a, b: (KeyVal|SpreadObject)[], obj, context, scope) => {
    let res = {} as any;
    for (let item of b) {
      if (item instanceof SpreadObject) {
        res = {...res, ...item.item};
      } else {
        res[item.key] = item.val;
      }
    }
    return res;
  },
  'keyVal': (a: string, b: LispItem) => new KeyVal(a, b),
  'createArray': (a, b: LispItem[], obj, context, scope) => {
    return b.map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    }).flat().map((item) => exec(item, scope, context));
  },
  'group': (a, b) => b,
  'string': (a, b: string, obj, context) => context.strings[b],
  'literal': (a, b: number, obj, context, scope) => {
    let name: string = context.literals[b].a;
    return name.replace(/(\$\$)*(\$)?\${(\d+)}/g, (match, $$, $, num) => {
      if ($) return match;
      let res = exec(context.literals[b].b[parseInt(num, 10)], scope, context);
      res =  res instanceof Prop ? res.context[res.prop] : res;
      return ($$ ? $$ : '') + `${res}`.replace(/\$/g, '$$');
    }).replace(/\$\$/g, '$');
  },
  'spreadArray': (a, b, obj, context, scope) => {
    return new SpreadArray(exec(b, scope, context));
  },
  'spreadObject': (a, b, obj, context, scope) => {
    return new SpreadObject(exec(b, scope, context));
  },
  '!': (a, b) => !b,
  '~': (a, b) => ~b,
  '++$': (a, b, obj, context) => {
    assignCheck(obj, context);
    return ++obj.context[obj.prop];
  },
  '$++': (a, b, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop]++;
  },
  '--$': (a, b, obj, context) => {
    assignCheck(obj, context);
    return --obj.context[obj.prop];
  },
  '$--': (a, b, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop]--;
  },
  '=': (a, b, obj, context) => {
    assignCheck(obj, context);
    obj.context[obj.prop] = b;
    return new Prop(obj.context, obj.prop, false, obj.isGlobal);
  },
  '+=': (a, b, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] += b;
  },
  '-=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] -= b;
  },
  '/=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] /= b;
  },
  '*=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] *= b;
  },
  '**=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] **= b;
  },
  '%=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] %= b;
  },
  '^=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] ^= b;
  },
  '&=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] &= b;
  },
  '|=': (a, b: number, obj, context) => {
    assignCheck(obj, context);
    return obj.context[obj.prop] |= b;
  },
  '?': (a, b) => {
    if (!(b instanceof If)) {
      throw new SyntaxError('Invalid inline if')
    }
    return a ? (b as any).t : (b as any).f;
  },
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a == b,
  '===': (a, b) => a === b,
  '!=': (a, b) => a != b,
  '!==': (a, b) => a !== b,
  '&&': (a, b) => a && b,
  '||': (a, b) => a || b,
  '&': (a: number, b: number) => a & b,
  '|': (a: number, b: number) => a | b,
  ':': (a, b) => new If(a, b),
  '+': (a: number, b: number) => a + b,
  '-': (a: number, b: number) => a - b,
  '$+': (a, b) => +b,
  '$-': (a, b) => -b,
  '/': (a: number, b: number) => a / b,
  '*': (a: number, b: number) => a * b,
  '%': (a: number, b: number) => a % b,
  'typeof': (a, b) => typeof b,
  'instanceof': (a, b:  { new(): any }) => a instanceof b,
  'in': (a: string, b) => a in b,
  'delete': (a, b, obj, context, scope, bobj: Prop) => {
    if (bobj.context === undefined) {
      return true;
    }
    assignCheck(bobj, context, 'delete');
    if (bobj.isVariable) return false;
    return delete bobj.context[bobj.prop];
  },
  'return': (a, b, obj, context) => b,
  'var': (a: string, b, obj, context, scope, bobj) => {
    return scope.declare(a, VarType.var, exec(b, scope, context));
  },
  'let': (a: string, b, obj, context, scope, bobj) => {
    return scope.declare(a, VarType.let, exec(b, scope, context), bobj && bobj.isGlobal);
  },
  'const': (a: string, b, obj, context, scope, bobj) => {
    return scope.declare(a, VarType.const, exec(b, scope, context));
  },
  'arrowFunc': (a: string[], b: IExecutionTree, obj, context, scope) => {
    return createFunction(a, b, context, scope);
  },
  'function': (a: string[], b: IExecutionTree, obj, context, scope) => {
    let name = a.shift();
    let func = createFunction(a, b, context, scope, name);
    if (name) {
      scope.declare(name, VarType.var, func);
    }
    return func;
  },
  'inlineFunction': (a: string[], b: IExecutionTree, obj, context, scope) => {
    let name = a.shift();
    if (name) {
      scope = new Scope(scope, {})
    }
    const func = createFunction(a, b, context, scope, name);
    if (name) {
      scope.declare(name, VarType.let, func);
    }
    return func;
  },
  'loop': (a: LispItem[], b: IExecutionTree, obj, context, scope) => {
    const [checkFirst, startStep, step, condition, beforeStep] = a;
    let loop = true;
    const outScope = new Scope(scope, {});
    exec(startStep, outScope, context);
    if (checkFirst) loop = exec(condition, outScope, context);
    while (loop) {
      exec(beforeStep, outScope, context);
      let res = executeTree(context, b, [new Scope(outScope, {})], true);
      if (res.returned) {
        return res;
      }
      if (res.breakLoop) {
        break;
      }
      exec(step, outScope, context);
      loop = exec(condition, outScope, context);
    }
  },
  'loopAction': (a: LispItem, b: IExecutionTree, obj, context, scope) => {
    if (!context.inLoop) throw new SandboxError("Illegal " + a + " statement");
    return new ExecReturn(context.auditReport, undefined, false, a === "break", a === "continue")
  },
  'if': (a: LispItem, b: If, obj, context, scope) => {
    if (!(b instanceof If)) {
      throw new SyntaxError('Invalid inline if')
    }
    if (exec(a, scope, context)) {
      return executeTree(context, b.t, [new Scope(scope)]);
    } else {
      return executeTree(context, b.f, [new Scope(scope)]);
    }
  },
  'try': (a: IExecutionTree, b: [string, IExecutionTree], obj, context, scope) => {
    const [exception, catchBody] = b;
    try {
      return executeTree(context, a, [new Scope(scope)], context.inLoop);
    } catch (e) {
      let sc = {};
      if (exception) sc[exception] = e;
      return executeTree(context, catchBody, [new Scope(scope, sc)], context.inLoop)
    }
  },
  'void': (a) => {}
}

let ops = new Map();
for (let op in ops2) {
  ops.set(op, ops2[op]);
}

export function exec(tree: LispItem, scope: Scope, context: IContext): any {
  if (tree instanceof Prop) {
    return tree.context[tree.prop];
  }
  if (Array.isArray(tree)) {
    let res: any[]|ExecReturn = [];
    for (let item of tree) {
      const ret = exec(item, scope, context);
      if (ret instanceof ExecReturn) {
        res.push(ret.result);
        if (ret.returned || ret.breakLoop || ret.continueLoop) {
          res = ret;
          break;
        }
      } else {
        res.push(ret);
      }
    }
    return res;
  }
  if (!(tree instanceof Lisp)) {
    return tree;
  }
  if (tree.op === 'arrowFunc' || tree.op === 'function' || tree.op === 'loop' || tree.op === 'try') {
    return ops.get(tree.op)(tree.a, tree.b, undefined, context, scope);
  }
  if (tree.op === 'if') {
    return ops.get(tree.op)(tree.a, exec(tree.b, scope, context), undefined, context, scope);
  }
  let obj = exec(tree.a, scope, context);
  let a = obj instanceof Prop ? (obj.context ? obj.context[obj.prop] : undefined) : obj;
  let bobj = exec(tree.b, scope, context);
  let b = bobj instanceof Prop ? (bobj.context ? bobj.context[bobj.prop] : undefined) : bobj;
  if (ops.has(tree.op)) {
    let res = ops.get(tree.op)(a, b, obj, context, scope, bobj);
    return res;
  }
  throw new SyntaxError('Unknown operator: ' + tree.op);
}

export function executeTree(context: IContext, executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = [], inLoop = false): ExecReturn {
  const execTree = executionTree.tree;
  context = {...context, strings: executionTree.strings, literals: executionTree.literals, inLoop};
  let scope = context.globalScope;
  let s;
  while (s = scopes.shift()) {
    if (typeof s !== "object") continue;
    if (s instanceof Scope) {
      scope = s;
    } else {
      scope = new Scope(scope, s, null);
    }
  }
  if (context.options.audit) {
    context.auditReport = {
      globalsAccess: new Set(),
      prototypeAccess: {},
    }
  }
  
  let returned = false;
  let isBreak = false;
  let isContinue = false;
  let res;
  if (!(execTree instanceof Array)) throw new SyntaxError('Bad execution tree');
  for (let tree of execTree) {
    let r
    try {
      r = exec(tree, scope, context);
      if (r instanceof ExecReturn) {
        res = r;
        break;
      }
    } catch (e) {
      // throw e;
      throw new e.constructor(e.message);
    }
    if (tree instanceof Lisp && tree.op === 'return') {
      returned = true;
      res = r;
    }
  }
  res =  res instanceof Prop ? res.context[res.prop] : res;
  return res instanceof ExecReturn ? res : new ExecReturn (context.auditReport, res, returned, isBreak, isContinue); 
}