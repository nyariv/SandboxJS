import { SpreadArray, IExecutionTree, LispItem, KeyVal, SpreadObject, If, Lisp, parse } from "./parser.js";
import { IContext } from "./Sandbox.js";


export type SandboxFunction = (code: string, ...args: any[]) => () => any;
export type sandboxedEval = (code: string) => any;
export type sandboxSetTimeout = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export type sandboxSetInterval = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export type Done = (err?: any, res?: any) => void
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
  'function',
  'async',
  'await'
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
  let func = function sandboxedObject(...args) {
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
  };
  sandboxedFunctions.add(func);
  return func;
}

export function createFunctionAsync(argNames: string[], parsed: IExecutionTree, context: IContext, scope?: Scope, name?: string) {
  let func = async function(...args) {
    const vars: any = {};
    argNames.forEach((arg, i) => {
      if (arg.startsWith('...')) {
        vars[arg.substring(3)] = args.slice(i);
      } else {
        vars[arg] = args[i];
      }
    });
    const res = await executeTreeAsync(context, parsed, scope === undefined ? [] : [new Scope(scope, vars, name === undefined ? undefined : this)])
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
const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
type OpCallback = (exec: Execution, done: Done, a: LispItem, b: LispItem, obj: Prop|any|undefined, context: IContext, scope: Scope, bobj?: Prop|any|undefined) => void;
let ops2: {[op:string]: OpCallback} = {
  'prop': (exec, done, a: LispItem|any, b: string, obj, context, scope) => {
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
        if (rep) {
          done(undefined, rep);
          return;
        }
      }
      if (prop.context && prop.context[b] === globalThis) {
        done(undefined, context.globalScope.get('this'));
        return;
      }

      context.getSubscriptions.forEach((cb) => cb(prop.context, prop.prop));
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
            done(undefined, new Prop(replace(a, true), b));
            return;
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
              done(undefined, new Prop(replace(a, false), b));
              return;
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
    if (rep) {
      done(undefined, rep);
      return;
    }
    if (a[b] === globalThis) {
      done(undefined, context.globalScope.get('this'));
      return;
    }

    let g = obj.isGlobal || (isFunction && !sandboxedFunctions.has(a)) || context.globalsWhitelist.has(a);

    if (!g) {
      context.getSubscriptions.forEach((cb) => cb(a, b));
    }
    done(undefined, new Prop(a, b, false, g));
  },
  'call': (exec, done, a, b: LispItem[], obj, context, scope) => {
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
    execMany(exec, args, (err, vals) => {
      if (err) {
        done(err);
        return;
      }
      if (typeof obj === 'function') {
        done(undefined, obj(...vals));
        return;
      }
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
      }
      done(undefined, obj.context[obj.prop](...vals));
    }, scope, context);
  },
  'createObject': (exec, done, a, b: (KeyVal|SpreadObject)[], obj, context, scope) => {
    let res = {} as any;
    for (let item of b) {
      if (item instanceof SpreadObject) {
        res = {...res, ...item.item};
      } else {
        res[item.key] = item.val;
      }
    }
    done(undefined, res);
  },
  'keyVal': (exec, done, a: string, b: LispItem) => done(undefined, new KeyVal(a, b)),
  'createArray': (exec, done, a, b: LispItem[], obj, context, scope) => {
    const items = b.map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    }).flat()
    execMany(exec, items, done, scope, context);
  },
  'group': (exec, done, a, b) => done(undefined, b),
  'string': (exec, done, a, b: string, obj, context) => done(undefined, context.strings[b]),
  'literal': (exec, done, a, b: number, obj, context, scope) => {
    let name: string = context.literals[b].a;
    let found = [];
    let f;
    let resnums = [];
    while(f = literalRegex.exec(name)) {
      if (!f[2]) {
        found.push(context.literals[b].b[parseInt(f[3], 10)]);
        resnums.push(f[3]);
      }
    }

    execMany(exec, found, (err, processed) => {
      const reses = {};
      if(err) {
        done(err);
        return;
      }
      for (let i in resnums) {
        const num = resnums[i];
        reses[num] = processed[i];
      }
      done(undefined, name.replace(/(\$\$)*(\$)?\${(\d+)}/g, (match, $$, $, num) => {
        if ($) return match;
        let res = reses[num]
        res =  res instanceof Prop ? res.context[res.prop] : res;
        return ($$ ? $$ : '') + `${res}`.replace(/\$/g, '$$');
      }).replace(/\$\$/g, '$'));
    }, scope, context)
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
  '-=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] -= b);
  },
  '/=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] /= b);
  },
  '*=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] *= b);
  },
  '**=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] **= b);
  },
  '%=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] %= b);
  },
  '^=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] ^= b);
  },
  '&=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] &= b);
  },
  '|=': (exec, done, a, b: number, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] |= b);
  },
  '?': (exec, done, a, b) => {
    if (!(b instanceof If)) {
      throw new SyntaxError('Invalid inline if')
    }
    done(undefined, a ? (b as any).t : (b as any).f);
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
  '&': (exec, done, a: number, b: number) => done(undefined, a & b),
  '|': (exec, done, a: number, b: number) => done(undefined, a | b),
  ':': (exec, done, a, b) => done(undefined, new If(a, b)),
  '+': (exec, done, a: number, b: number) => done(undefined, a + b),
  '-': (exec, done, a: number, b: number) => done(undefined, a - b),
  '$+': (exec, done, a, b) => done(undefined, +b),
  '$-': (exec, done, a, b) => done(undefined, -b),
  '/': (exec, done, a: number, b: number) => done(undefined, a / b),
  '*': (exec, done, a: number, b: number) => done(undefined, a * b),
  '%': (exec, done, a: number, b: number) => done(undefined, a % b),
  'typeof': (exec, done, a, b) => done(undefined, typeof b),
  'instanceof': (exec, done, a, b:  { new(): any }) => done(undefined, a instanceof b),
  'in': (exec, done, a: string, b) => done(undefined, a in b),
  'delete': (exec, done, a, b, obj, context, scope, bobj: Prop) => {
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
  'var': (exec, done, a: string, b, obj, context, scope, bobj) => {
    exec(b, scope, context, (err, res) => {
      if (err) {
        done(err);
        return;
      }
      done(undefined, scope.declare(a, VarType.var, res));
    });
  },
  'let': (exec, done, a: string, b, obj, context, scope, bobj) => {
    exec(b, scope, context, (err, res) => {
      if (err) {
        done(err);
        return;
      }
      done(undefined, scope.declare(a, VarType.let, res, bobj && bobj.isGlobal));
    });
  },
  'const': (exec, done, a: string, b, obj, context, scope, bobj) => {
    exec(b, scope, context, (err, res) => {
      if (err) {
        done(err);
        return;
      }
      done(undefined, scope.declare(a, VarType.const, res));
    });
  },
  'arrowFunc': (exec, done, a: string[], b: IExecutionTree, obj, context, scope) => {
    if (a.shift()) {
      done(undefined, createFunctionAsync(a, b, context, scope));
    } else {
      done(undefined, createFunction(a, b, context, scope));
    }
  },
  'function': (exec, done, a: string[], b: IExecutionTree, obj, context, scope) => {
    let isAsync = a.shift();
    let name = a.shift();
    let func;
    if (isAsync) {
      func = createFunctionAsync(a, b, context, scope, name);
    } else {
      func = createFunction(a, b, context, scope, name);
    }
    if (name) {
      scope.declare(name, VarType.var, func);
    }
    done(undefined, func);
  },
  'inlineFunction': (exec, done, a: string[], b: IExecutionTree, obj, context, scope) => {
    let isAsync = a.shift();
    let name = a.shift();
    if (name) {
      scope = new Scope(scope, {})
    }
    let func;
    if (isAsync) {
      func = createFunctionAsync(a, b, context, scope, name);
    } else {
      func = createFunction(a, b, context, scope, name);
    }
    if (name) {
      scope.declare(name, VarType.let, func);
    }
    done(undefined, func);
  },
  'loop': (exec, done, a: LispItem[], b: IExecutionTree, obj, context, scope) => {
    const [checkFirst, startStep, step, condition, beforeStep] = a;
    let loop = true;
    const outScope = new Scope(scope, {});
    if (exec === execAsync) {
      (async() => {
        await asyncDone((d) => exec(startStep, outScope, context, d));
        if (checkFirst) loop = (await asyncDone((d) => exec(condition, outScope, context, d))).result;
        while (loop) {
          await asyncDone((d) => exec(beforeStep, outScope, context, d));
          let res = await executeTreeAsync(context, b, [new Scope(outScope, {})], true);
          if (res instanceof ExecReturn && res.returned) {
            done(undefined, res);
            return;
          }
          if (res instanceof ExecReturn && res.breakLoop) {
            break;
          }
          await asyncDone((d) => exec(step, outScope, context, d));
          loop = (await asyncDone((d) => exec(condition, outScope, context, d))).result;
        }
        done();
      })();
    } else {
      syncDone((d) => exec(startStep, outScope, context, d));
      if (checkFirst) loop = (syncDone((d) => exec(condition, outScope, context, d))).result;
      while (loop) {
        syncDone((d) => exec(beforeStep, outScope, context, d));
        let res = executeTree(context, b, [new Scope(outScope, {})], true);
        if (res instanceof ExecReturn && res.returned) {
          done(undefined, res);
          return;
        }
        if (res instanceof ExecReturn && res.breakLoop) {
          break;
        }
        syncDone((d) => exec(step, outScope, context, d));
        loop = (syncDone((d) => exec(condition, outScope, context, d))).result;
      }
      done();
    }
  },
  'loopAction': (exec, done, a: LispItem, b: IExecutionTree, obj, context, scope) => {
    if (!context.inLoop) throw new SandboxError("Illegal " + a + " statement");
    done(undefined, new ExecReturn(context.auditReport, undefined, false, a === "break", a === "continue"));
  },
  'if': (exec, done, a: LispItem, b: If, obj, context, scope) => {
    if (!(b instanceof If)) {
      throw new SyntaxError('Invalid inline if')
    }
    exec(a, scope, context, (err, res) => {
      if (err) {
        done(err);
        return
      }
      if (exec === execAsync) {
        (async () => {
          if (res) {
            done(undefined, await executeTreeAsync(context, b.t, [new Scope(scope)]));
          } else {
            done(undefined, b.f ? await executeTreeAsync(context, b.f, [new Scope(scope)]) : undefined);
          }
        })();
      } else {
        if (res) {
          done(undefined, executeTree(context, b.t, [new Scope(scope)]));
        } else {
          done(undefined, b.f ?executeTree(context, b.f, [new Scope(scope)]) : undefined);
        }
      }
    })
  },
  'try': (exec, done, a: IExecutionTree, b: [string, IExecutionTree], obj, context, scope) => {
    const [exception, catchBody] = b;
    if (exec === execAsync) {
      (async () => {
        try {
          done(undefined, await executeTreeAsync(context, a, [new Scope(scope)], context.inLoop));
        } catch (e) {
          let sc = {};
          if (exception) sc[exception] = e;
          done(undefined, await executeTreeAsync(context, catchBody, [new Scope(scope, sc)], context.inLoop));
        }
      })();
    } else {
      try {
        done(undefined, executeTree(context, a, [new Scope(scope)], context.inLoop));
      } catch (e) {
        let sc = {};
        if (exception) sc[exception] = e;
        done(undefined, executeTree(context, catchBody, [new Scope(scope, sc)], context.inLoop))
      }
    }
  },
  'void': (exec, done, a) => {done()},
  'new': (exec, done, a: new (...args: any[]) => any, b: any[]) => {
    done(undefined, new a(...b))
  }
}

let ops = new Map<string, OpCallback>();
for (let op in ops2) {
  ops.set(op, ops2[op]);
}

function execMany(exec: Execution, tree: LispItem[], done: Done, scope: Scope, context: IContext) {
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
    } else {
      done(undefined, ret);
    }
  }
  exec(tree[i], scope, context, next);
}

type Execution = (tree: LispItem, scope: Scope, context: IContext, done: Done) => void

function asyncDone(callback: (done: Done) => void): Promise<{result: any}> {
  return new Promise((resolve, reject) => {
    callback((err, result) => {
      if (err) reject(err);
      else resolve({result});
    });
  });
}

function syncDone(callback: (done: Done) => void): {result: any} {
  let result;
  let err;
  callback((e, r) => {
    err = e;
    result = r;
  });
  // console.log(result);
  if (err) throw err;
  return {result};
}

async function execAsync(tree: LispItem, scope: Scope, context: IContext, done: Done): Promise<any> {
  let result;
  try {
    if (tree instanceof Prop) {
      result = tree.context[tree.prop];
    } else if (Array.isArray(tree)) {
      let res: any[]|ExecReturn = [];
      for (let item of tree) {
        const ret = (await asyncDone((done) => execAsync(item, scope, context, done))).result;
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
      result =  res;
    } else if (!(tree instanceof Lisp)) {
      result = tree;
    } else if (tree.op === 'arrowFunc' || tree.op === 'function' || tree.op === 'loop' || tree.op === 'try') {
      result = (await asyncDone((d) => ops.get(tree.op)(execAsync, d, tree.a, tree.b, undefined, context, scope))).result;
    } else if (tree.op === 'if') {
      result = (await asyncDone(async (d) => ops.get(tree.op)(execAsync, d, tree.a, (await asyncDone((done) => execAsync(tree.b, scope, context, done))).result, undefined, context, scope))).result;
    } else if (tree.op === 'await') {
      result = await (await asyncDone((done) => execAsync(tree.a, scope, context, done))).result;
    } else {
      let obj = (await asyncDone((done) => execAsync(tree.a, scope, context, done))).result;
      let a = obj instanceof Prop ? (obj.context ? obj.context[obj.prop] : undefined) : obj;
      let bobj = (await asyncDone((done) => execAsync(tree.b, scope, context, done))).result;
      let b = bobj instanceof Prop ? (bobj.context ? bobj.context[bobj.prop] : undefined) : bobj;
      if (ops.has(tree.op)) {
        result = (await asyncDone((d) => ops.get(tree.op)(execAsync, d, a, b, obj, context, scope, bobj))).result;
      } else {
        throw new SyntaxError('Unknown operator: ' + tree.op);
      }
    }
    done(undefined, result);
  } catch (err) {
    done(err);
  }
}

function syncDoneExec(tree: LispItem, scope: Scope, context: IContext) {
  let result;
  let err;
  execSync(tree, scope, context, (e, r) => {
    err = e;
    result = r;
  });
  if (err) throw err;
  return {result}
}

function syncDoneOp(op: string, a: LispItem, b: LispItem, obj: Prop|any|undefined, context: IContext, scope: Scope, bobj?: Prop|any|undefined) {
  let result;
  let err;
  ops.get(op)(execSync, (e, r) => {
    err = e;
    result = r;
  }, a, b , obj, context, scope, bobj);
  if (err) throw err;
  return {result}
}

function execSync(tree: LispItem, scope: Scope, context: IContext, done: Done): any {
  let result;
  if (tree instanceof Prop) {
    result = tree.context[tree.prop];
  } else if (Array.isArray(tree)) {
    let res: any[]|ExecReturn = [];
    for (let item of tree) {
      const ret = syncDoneExec(item, scope, context).result;
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
    result =  res;
  } else if (!(tree instanceof Lisp)) {
    result = tree;
  } else if (tree.op === 'arrowFunc' || tree.op === 'function' || tree.op === 'loop' || tree.op === 'try') {
    result = syncDoneOp(tree.op, tree.a, tree.b, undefined, context, scope).result;
  } else if (tree.op === 'if') {
    result = syncDoneOp(tree.op, tree.a, syncDoneExec(tree.b, scope, context).result, undefined, context, scope).result;
  } else if (tree.op === 'await') {
      throw new SandboxError("Illegal use of 'await', must be inside async function");
  } else {
    let obj = syncDoneExec(tree.a, scope, context).result;
    let a = obj instanceof Prop ? (obj.context ? obj.context[obj.prop] : undefined) : obj;
    let bobj = syncDoneExec(tree.b, scope, context).result;
    let b = bobj instanceof Prop ? (bobj.context ? bobj.context[bobj.prop] : undefined) : bobj;
    if (ops.has(tree.op)) {
      result = syncDoneOp(tree.op, a, b, obj, context, scope, bobj).result;
    } else {
      throw new SyntaxError('Unknown operator: ' + tree.op);
    }
  }
  done(undefined, result);
}

export function executeTree(context: IContext, executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = [], inLoop = false): ExecReturn {
  return syncDone((done) => executeTreeWithDone(execSync, done, context, executionTree, scopes, inLoop)).result;
}

export async function executeTreeAsync(context: IContext, executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = [], inLoop = false): Promise<ExecReturn> {
  return (await asyncDone((done) => executeTreeWithDone(execAsync, done, context, executionTree, scopes, inLoop))).result;
}

function executeTreeWithDone(exec: Execution, done: Done, context: IContext, executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = [], inLoop = false) {
  const execTree = executionTree.tree;
  if (!(execTree instanceof Array)) throw new SyntaxError('Bad execution tree')
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
  let i = 0;
  let current = execTree[i];
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
      done(undefined, new ExecReturn (context.auditReport, res, true))
      return;
    }
    if (++i < execTree.length) {
      current = execTree[i];
      exec(current, scope, context, next);
    } else {
      done(undefined, new ExecReturn (context.auditReport, undefined, false));
    }
  }
  exec(current, scope, context, next);
}
