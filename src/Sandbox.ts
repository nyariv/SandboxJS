export interface IOptions {
  audit?: boolean;
  forbidMethodCalls?: boolean;
}

export interface IAuditReport {
  globalsAccess: Set<any>;
  prototypeAccess: {[name: string]: Set<string>}
}

export interface IAuditResult {
  auditReport: IAuditReport;
  result: any;
}

export type SandboxFunction = (code: string, ...args: any[]) => () => any;
export type sandboxedEval = (code: string) => any;
export type sandboxSetTimeout = (handler: TimerHandler, timeout?: number, ...args: any[]) => number;
export type sandboxSetInterval = (handler: TimerHandler, timeout?: number, ...args: any[]) => number;
export type LispItem = Lisp|KeyVal|SpreadArray|SpreadObject|ObjectFunc|(LispItem[])|{new(): any }|String|Number|Boolean|null;
export type replacementCallback = (obj: any, isStaticAccess: boolean) => any

export interface ILiteral extends Lisp {
  op: 'literal';
  a: string;
  b: LispItem[];
}

export interface IExecutionTree {
  tree: LispItem;
  strings: string[];
  literals: ILiteral[];
}

export interface IGlobals {
  [key: string]: any
}

interface IContext {
  sandbox: Sandbox;
  globals: IGlobals;
  globalsWhitelist: Set<any>;
  prototypeWhitelist: Map<Function, Set<string>>;
  prototypeReplacements: Map<Function, replacementCallback>;
  globalScope: Scope;
  sandboxGlobal: SandboxGlobal;
  options: IOptions;
  evals: Map<any, any>;
  auditReport?: IAuditReport;
  literals?: ILiteral[];
  strings?: string[];
  functions?: Lisp[];
  getSubscriptions: Set<(obj: object, name: string) => void>;
  setSubscriptions: WeakMap<object, Map<string, Set<() => void>>>;
}

class Prop {
  constructor(public context: {[key:string]: any}, public prop: string, public isConst = false, public isGlobal = false, public isVariable = false) {
  }
}

class Lisp {
  op: string;
  a?: LispItem;
  b?: LispItem;
  constructor (obj: Lisp) {
    this.op = obj.op;
    this.a = obj.a;
    this.b = obj.b;
  }
}

class If {
  constructor(public t: any, public f: any) {}
}

class KeyVal {
  constructor(public key: string, public val: any) {}
}

class ObjectFunc {
  constructor(public key: string, public args: string[], public tree: LispItem) {}
}

class SpreadObject {
  constructor(public item: {[key: string]: any}) {}
}

class SpreadArray {
  constructor(public item: any[]) {}
}

enum VarType {
  let = "let",
  const = "const",
  var = "var"
}

class Scope {
  parent: Scope;
  const = new Set<string>();
  let = new Set<string>();
  var: Set<string>;
  globals: Set<string>;
  allVars: {[key:string]: any};
  functionThis: any;
  constructor(parent: Scope, vars = {}, functionThis: any = undefined) {
    this.parent = parent;
    this.allVars = vars;
    this.var = new Set(Object.keys(vars));
    this.globals = !parent ? new Set(Object.keys(vars)) : new Set();
    this.functionThis = functionThis || !parent;
    if (functionThis) {
      this.declare('this', VarType.var, functionThis);
    }
  }

  get(key: string, functionScope = false): any {
    if (!this.parent || !functionScope || this.functionThis) {
      if (this.globals.has(key)) {
        return new Prop(this.functionThis, key, false, true, true);
      }
      if (this.const.has(key)) {
        return new Prop(this.allVars, key, true, this.globals.has(key), true);
      }
      if (this.var.has(key)) {
        return new Prop(this.allVars, key, false, this.globals.has(key), true);
      }
      if (this.let.has(key)) {
        return new Prop(this.allVars, key, false, this.globals.has(key), true);
      }
      if (!this.parent) {
        return new Prop(undefined, key);
      }
    }
    return this.parent.get(key, functionScope)
  }

  set(key: string, val: any) {
    if (key === 'this') throw new SyntaxError('"this" cannot be a variable')
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
    if (type === 'var' && !this.functionThis && this.parent) {
      return this.parent.declare(key, type, value, isGlobal)
    } else if (!this.var.has(key) || !this.let.has(key) || !this.const.has(key) || !(this.globals.has(key))) {
      if (isGlobal) {
        this.globals.add(key);
      }
      this[type].add(key);
      this.allVars[key] = value;
    } else {
      throw Error(`Variable '${key}' already declared`);
    }
    return new Prop(this.allVars, key, this.const.has(key), isGlobal);
  }
}

class ParseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

class SandboxError extends Error {

}

class SandboxGlobal {
  constructor(globals: IGlobals) {
    if (globals === globalThis) return globalThis;
    for (let i in globals) {
      (this as any)[i] = globals[i];
    }
  }
}

function sandboxFunction(context: IContext): SandboxFunction {
  return SandboxFunction;
  function SandboxFunction(...params: any[]) {
    let code = params.pop();
    let parsed = Sandbox.parse(code);
    return function(...args: any[]) {
      const vars: {[key:string]: any} = {};
      for (let i of params) {
        vars[i] = args.shift();
      }
      const res = context.sandbox.executeTree(parsed);
      if (context.options.audit) {
        for (let key in res.auditReport.globalsAccess) {
          let add = res.auditReport.globalsAccess[key];
          context.auditReport.globalsAccess[key] = context.auditReport.globalsAccess[key] || new Set();
          add.forEach((val) => {
            context.auditReport.globalsAccess[key].add(val);
          });
        }
        for (let Class in res.auditReport.prototypeAccess) {
          let add = res.auditReport.prototypeAccess[Class];
          context.auditReport.prototypeAccess[Class] = context.auditReport.prototypeAccess[Class] || new Set();
          add.forEach((val) => {
            context.auditReport.prototypeAccess[Class].add(val);
          });
        }
      }
      return res.result;
    };
  }
}

function sandboxedEval(func: SandboxFunction): sandboxedEval {
  return sandboxEval;
  function sandboxEval(code: string) {
    return func(code)();
  }
}

function sandboxedSetTimeout(func: SandboxFunction): sandboxSetTimeout {
  return function sandboxSetTimeout(handler, ...args) {
    if (typeof handler !== 'string') return setTimeout(handler, ...args);
    return setTimeout(func(handler), args[0]);
  }
}

function sandboxedSetInterval(func: SandboxFunction): sandboxSetInterval {
  return function sandboxSetInterval(handler, ...args) {
    if (typeof handler !== 'string') return setInterval(handler, ...args);
    return setTimeout(func(handler), args[0]);
  }
}

let expectTypes: {[type:string]: {types: {[type:string]: RegExp}, next: string[]}} = {
  op: {
    types: {op: /^(\/|\*\*(?!\=)|\*(?!\=)|\%(?!\=))/},
    next: [
      'value',
      'prop',
      'exp',
      'modifier',
      'incrementerBefore',
    ]
  },
  splitter: {
    types: {
      split: /^(&&|&|\|\||\||<=|>=|<|>|!==|!=|===|==| instanceof | in |\+(?!\+)|\-(?!\-))(?!\=)/,
    },
    next: [
      'value', 
      'prop', 
      'exp', 
      'modifier',
      'incrementerBefore',
    ]
  },
  if: {
    types: {
      if: /^\?/,
      else: /^:/,
    },
    next: [
      'expEnd'
    ]
  },
  assignment: {
    types: {
      assignModify: /^(\-=|\+=|\/=|\*\*=|\*=|%=|\^=|\&=|\|=)/,
      assign: /^(=)/
    },
    next: [
      'value', 
      'function',
      'prop', 
      'exp', 
      'modifier',
      'incrementerBefore',
    ]
  },
  incrementerBefore: {
    types: {incrementerBefore: /^(\+\+|\-\-)/},
    next: [
      'prop',
    ]
  },
  incrementerAfter: {
    types: {incrementerAfter: /^(\+\+|\-\-)/},
    next: [
      'splitter',
      'op',
      'expEnd'
    ]
  },
  expEdge: {
    types: {
      arrayProp: /^[\[]/,
      call: /^[\(]/,
    },
    next: [
      'splitter',
      'op',
      'expEdge',
      'if',
      'dot',
      'expEnd'
    ]
  },
  modifier: {
    types: {
      not: /^!/,
      inverse: /^~/,
      negative: /^\-(?!\-)/,
      positive: /^\+(?!\+)/,
      typeof: /^ typeof /,
      delete: /^ delete /,
    },
    next: [
      'exp',
      'modifier',
      'value',
      'prop',
      'incrementerBefore',
    ]
  },
  exp: {
    types: {
      createObject: /^\{/,
      createArray: /^\[/,
      group: /^\(/,
    },
    next: [
      'splitter',
      'op',
      'expEdge',
      'if',
      'dot',
      'expEnd'
    ]
  },
  dot: {
    types: {
      dot: /^\.(?!\.)/
    },
    next: [
      'splitter',
      'incrementerAfter',
      'assignment',
      'op',
      'expEdge',
      'if',
      'dot',
      'expEnd'
    ]
  },
  prop: {
    types: {
      prop: /^[a-zA-Z\$_][a-zA-Z\d\$_]*/,
    },
    next: [
      'splitter',
      'incrementerAfter',
      'assignment',
      'op',
      'expEdge',
      'if',
      'dot',
      'expEnd'
    ]
  },
  value: {
    types: {
      number: /^\-?\d+(\.\d+)?/,
      string: /^"(\d+)"/,
      literal: /^`(\d+)`/,
      boolean: /^(true|false)(?![\w$_])/,
      null: /^null(?![\w$_])/,
      und: /^undefined(?![\w$_])/,
      NaN: /^NaN(?![\w$_])/,
      Infinity: /^Infinity(?![\w$_])/,
    },
    next: [
      'splitter',
      'op',
      'if',
      'dot',
      'expEnd'
    ]
  },
  function: {
    types: {
      arrowFunc: /^\(?(((\.\.\.)?[a-zA-Z\$_][a-zA-Z\d\$_]*,?)*)(\))?=>({)?/
    },
    next: [
      'expEnd'
    ]
  },
  initialize: {
    types: {
      initialize: /^ (var|let|const) [a-zA-Z\$_][a-zA-Z\d\$_]*/
    },
    next: [
      'value', 
      'function',
      'prop', 
      'exp', 
      'modifier',
      'incrementerBefore',
      'expEnd'
    ]
  },
  spreadObject: {
    types: {
      spreadObject: /^\.\.\./
    },
    next: [
      'value',
      'exp',
      'prop', 
    ]
  },
  spreadArray: {
    types: {
      spreadArray: /^\.\.\./
    },
    next: [
      'value', 
      'exp',
      'prop', 
    ]
  },
  expEnd: {types: {}, next: []},
  expStart: {
    types: {
      return: /^ return /,
    },
    next: [
      'value', 
      'function',
      'prop', 
      'exp', 
      'modifier', 
      'incrementerBefore',
      'expEnd'
    ]
  }
};

let closings: any = {
  "(": ")",
  "[": "]",
  "{": "}",
  "'": "'",
  '"': '"',
  "`": "`"
}

let closingsRegex: any = {
  "(": /^\)/,
  "[": /^\]/,
  "{": /^\}/,
  "'": /^\'/,
  '"': /^\"/,
  "`": /^\`/
}

const okFirstChars = /^[\+\-~ !]/;
const restOfExp = (part: string, tests?: RegExp[], quote?: string) => {
  let isStart = true;
  tests = tests || [
    expectTypes.op.types.op,
    expectTypes.splitter.types.split,
    expectTypes.if.types.if,
    expectTypes.if.types.else
  ];
  let escape = false;
  let done = false;
  let i;
  for (i = 0; i < part.length && !done; i++) {
    let char = part[i];
    if (quote === '"' || quote === "'" || quote === "`") {
      if (quote === "`" && char === "$" && part[i+1] === "{" && !escape) {
        let skip = restOfExp(part.substring(i+2), [closingsRegex['{']]);
        i += skip.length + 2;
      } else if (char === quote && !escape) {
        return part.substring(0, i);
      }
      escape = char === "\\";
    } else if (closings[char]) {
      let skip = restOfExp(part.substring(i+1), [closingsRegex[quote]], char);
      i += skip.length + 1;
      isStart = false;
    } else if (!quote) {
      let sub = part.substring(i);
      for (let test of tests) {
        done = test.test(sub);
        if (done) break;
      }
      if (isStart) {
        if (okFirstChars.test(sub)) {
          done = false;
        } else {
          isStart = false;
        }
      }
      if (done) break;
    } else if(char === closings[quote]) {
      return part.substring(0, i);
    }
  }
  return part.substring(0, i);
}
restOfExp.next = [
  'splitter',
  'op',
  'expEnd'
];

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
  setTimeout(() => {
    context.setSubscriptions.get(obj.context)?.get(obj.prop)?.forEach((cb) => cb());
  });
}

let ops2: {[op:string]: (a: LispItem, b: LispItem, obj: Prop|any|undefined, context: IContext, scope: Scope, bobj: Prop|any|undefined) => any} = {
  'prop': (a: LispItem|any, b: string, obj, context, scope) => {
    if(a === null) {
      throw new TypeError(`Cannot get property ${b} of null`);
    }
    const type = typeof a;
    if (type === 'undefined') {
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

    let g = obj.isGlobal || (isFunction && a.name !== 'sandboxArrowFunction') || context.globalsWhitelist.has(a);

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
        return item.item;
      } else {
        return [item];
      }
    }).flat();
    if (typeof obj === 'function') {
      return obj(...args.map((item: any) => exec(item, scope, context)));
    }
    return obj.context[obj.prop](...args.map((item: any) => exec(item, scope, context)));
  },
  'createObject': (a, b: (KeyVal|SpreadObject|ObjectFunc)[], obj, context, scope) => {
    let res = {} as any;
    for (let item of b) {
      if (item instanceof SpreadObject) {
        res = {...res, ...item.item};
      } else if (item instanceof ObjectFunc) {
        let f = item;
        res[f.key] = function (...args) {
          const vars: any = {};
          f.args.forEach((arg, i) => {
            vars[arg] = args[i];
          });
          return context.sandbox.executeTree({
            tree: f.tree, 
            strings: context.strings, 
            literals: context.literals,
          }, [new Scope(scope, vars, this)]).result;
        }
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
        return item.item;
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
  ' typeof ': (a, b) => typeof b,
  ' instanceof ': (a, b:  { new(): any }) => a instanceof b,
  ' in ': (a: string, b) => a in b,
  ' delete ': (a, b, obj, context, scope, bobj: Prop) => {
    if (bobj.context === undefined) {
      return true;
    }
    assignCheck(bobj, context, 'delete');
    if (bobj.isVariable) return false;
    return delete bobj.context[bobj.prop];
  },
  'return': (a, b) => b,
  'var': (a: string, b, obj, context, scope, bobj) => {
    return scope.declare(a, VarType.var, exec(b, scope, context));
  },
  'let': (a: string, b, obj, context, scope, bobj) => {
    return scope.declare(a, VarType.let, exec(b, scope, context), bobj && bobj.isGlobal);
  },
  'const': (a: string, b, obj, context, scope, bobj) => {
    return scope.declare(a, VarType.const, exec(b, scope, context));
  },
  'arrowFunc': (a: string[], b, obj, context, scope) => {
    const sandboxArrowFunction = (...args) => {
      const vars: any = {};
      a.forEach((arg, i) => {
        if (arg.startsWith('...')) {
          vars[arg.substring(3)] = args.slice(i);
        } else {
          vars[arg] = args[i];
        }
      });
      return context.sandbox.executeTree({
        tree: b, 
        strings: context.strings, 
        literals: context.literals,
      }, [new Scope(scope, vars)]).result;
    }
    return sandboxArrowFunction;
  }
}

let ops = new Map();
for (let op in ops2) {
  ops.set(op, ops2[op]);
}

type LispCallback = (type: string, parts: string, res: string[], expect: string, ctx: {lispTree: LispItem}) => any

let lispTypes: Map<string, LispCallback> = new Map();

const setLispType = (types: string[], fn: LispCallback) => {
  types.forEach((type) => {
    lispTypes.set(type, fn);
  })
}

const closingsCreate: {[type:string]: RegExp} = {
  'createArray': /^\]/,
  'createObject': /^\}/,
  'group': /^\)/,
  'arrayProp': /^\]/,
  'call': /^\)/
}

setLispType(['createArray', 'createObject', 'group', 'arrayProp','call'], (type, part, res, expect, ctx) => {
  let extract = "";
  let arg: string[] = [];
  let end = false;
  let i = 1;
  while (i < part.length && !end) {
    extract = restOfExp(part.substring(i), [
      closingsCreate[type],
      /^,/
    ]);
    i += extract.length;
    if (extract) {
      arg.push(extract);
    }
    if (part[i] !== ',') {
      end = true;
    } else {
      i++;
    }
  }
  const next = ['value', 'function', 'prop', 'exp', 'modifier', 'incrementerBefore'];
  let l: LispItem;

  let fFound: RegExpExecArray;
  const reg2 = /^([a-zA-Z\$_][a-zA-Z\d\$_]*)\((([a-zA-Z\$_][a-zA-Z\d\$_]*,?)*)\)?{/;
  switch(type) {
    case 'group':
    case 'arrayProp':
      l = lispify(arg.pop());
      break;
    case 'call':
    case 'createArray':
      l = arg.map((e) => lispify(e, [...next, 'spreadArray']));
      break;
    case 'createObject':
      l = arg.map((str) => {
        let value;
        let key;
        fFound = reg2.exec(str);
        if (fFound) {
          let args = fFound[2] ? fFound[2].split(",") : [];
          const func = restOfExp(str.substring(fFound.index + fFound[0].length), [/^}/]);
          return new ObjectFunc(fFound[1], args, Sandbox.parse(func, null).tree);
        } else {
          let extract = restOfExp(str, [/^:/]);
          key = lispify(extract, [...next, 'spreadObject']);
          if (key instanceof Lisp && key.op === 'prop') {
            key = key.b;
          }
          if (extract.length === str.length) return key;
          value = lispify(str.substring(extract.length + 1));
        }
        return new Lisp({
          op: 'keyVal',
          a: key,
          b: value
        });
      })
      break;
  }
  type = type === 'arrayProp' ? 'prop' : type;
  ctx.lispTree = lispify(part.substring(i + 1), expectTypes[expect].next, new Lisp({
    op: type, 
    a: ctx.lispTree, 
    b: l,
  }));
});

setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete', 'op'], (type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(res[0].length));
  ctx.lispTree = lispify(part.substring(extract.length + res[0].length), restOfExp.next, new Lisp({
    op: ['positive', 'negative'].includes(type) ? '$' + res[0] : res[0],
    a: ctx.lispTree, 
    b: lispify(extract, expectTypes[expect].next), 
  }));
});

setLispType(['incrementerBefore'], (type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(2));
  ctx.lispTree = lispify(part.substring(extract.length + 2), restOfExp.next, new Lisp({
    op: res[0] + "$", 
    a: lispify(extract, expectTypes[expect].next), 
  }));
});

setLispType(['incrementerAfter'], (type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, new Lisp({
    op: "$"  + res[0], 
    a: ctx.lispTree, 
  }));
});

setLispType(['assign', 'assignModify'], (type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: res[0], 
    a: ctx.lispTree,
    b: lispify(part.substring(res[0].length), expectTypes[expect].next)
  });
});

setLispType(['split'], (type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(res[0].length),[
    expectTypes.splitter.types.split,
    expectTypes.if.types.if,
    expectTypes.if.types.else
  ]);
  ctx.lispTree = lispify(part.substring(extract.length + res[0].length), restOfExp.next, new Lisp({
    op: res[0],
    a: ctx.lispTree, 
    b: lispify(extract, expectTypes[expect].next), 
  }));
});

setLispType(['if'], (type, part, res, expect, ctx) => {
  let found = false;
  let extract = "";
  let quoteCount = 1;
  while(!found && extract.length < part.length) {
    extract += restOfExp(part.substring(extract.length + 1), [
      expectTypes.if.types.if,
      expectTypes.if.types.else
    ]);
    if (part[extract.length + 1] === '?') {
      quoteCount++
    } else {
      quoteCount--
    }
    if (!quoteCount) {
      found = true;
    } else {
      extract += part[extract.length + 1];
    }
  }
  ctx.lispTree = new Lisp({
    op: '?',
    a: ctx.lispTree, 
    b: new Lisp({
      op: ':',
      a: lispify(extract),
      b: lispify(part.substring(res[0].length + extract.length + 1))
    })
  });
});

setLispType(['dot', 'prop'], (type, part, res, expect, ctx) => {
  let prop = res[0];
  let index = res[0].length;
  if (res[0] === '.') {
    let matches = part.substring(res[0].length).match(expectTypes.prop.types.prop);
    if (matches.length) {
      prop = matches[0];
      index = prop.length + res[0].length
    } else {
      throw Error('Hanging  dot:' + part);
    }
  }
  ctx.lispTree = lispify(part.substring(index), expectTypes[expect].next, new Lisp({
    op: 'prop', 
    a: ctx.lispTree, 
    b: prop
  }));
});

setLispType(['spreadArray', 'spreadObject', 'return'], (type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: type,
    b: lispify(part.substring(res[0].length), expectTypes[expect].next)
  });
});


setLispType(['number', 'boolean', 'null'], (type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, JSON.parse(res[0]));
});

const constants = {
  NaN,
  Infinity,
}
setLispType(['und', 'NaN', 'Infinity'], (type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, constants[type]);
});

setLispType(['string', 'literal'], (type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, new Lisp({
    op: type,
    b: parseInt(JSON.parse(res[1]), 10),
  }));
});

setLispType(['initialize'], (type, part, res, expect, ctx) => {
  const split = res[0].split(/ /g);
  if (part.length === res[0].length) {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, new Lisp({
      op: split[1],
      a: split[2]
    }));
  } else {
    ctx.lispTree = new Lisp({
      op: split[1],
      a: split[2],
      b: lispify(part.substring(res[0].length + 1), expectTypes[expect].next)
    });
  }
});

setLispType(['arrowFunc'], (type, part, res, expect, ctx) => {
  let args = res[1] ? res[1].split(",") : [];
  if (res[4]) {
    if (res[0][0] !== '(') throw new SyntaxError('Unstarted inline function brackets: ' + res[0]);
  } else if (args.length) {
    args = [args.pop()];
  }
  let ended = false;
  args.forEach((arg) => {
    if (ended) throw new SyntaxError('Rest parameter must be last formal parameter');
    if (arg.startsWith('...')) ended = true;
  });
  const func = (res[5] ? '' : ' return ') + restOfExp(part.substring(res[0].length), res[5] ? [/^}/] : [/^[,;\)\}\]]/]);
  ctx.lispTree = lispify(part.substring(res[0].length + func.length + 1), expectTypes[expect].next, new Lisp({
    op: 'arrowFunc',
    a: args,
    b: Sandbox.parse(func, null).tree
  }));
});
let lastType;
function lispify(part: string, expected?: string[], lispTree?: LispItem): LispItem {
  expected = expected || ['initialize', 'expStart', 'value', 'function', 'prop', 'exp', 'modifier', 'incrementerBefore', 'expEnd'];
  if (part === undefined) return lispTree;
  if (!part.length && !expected.includes('expEnd')) {
    throw new SyntaxError("Unexpected end of expression");
  }

  let ctx = {lispTree: lispTree};

  let res: any;
  for (let expect of expected) {
    if (expect === 'expEnd') {
      continue;
    }
    for (let type in expectTypes[expect].types) {
      if (type === 'expEnd') {
        continue;
      }
      if(res = expectTypes[expect].types[type].exec(part)) {
        lastType = type;
        lispTypes.get(type)(type, part, res, expect, ctx);
        break;
      }
    }
    if (res) break; 
  }

  if (!res && part.length) {
    throw Error(`Unexpected token (${lastType}): ${part}`);
  }
  return ctx.lispTree;
}

function exec(tree: LispItem, scope: Scope, context: IContext): any {
  if (tree instanceof Prop) {
    return tree.context[tree.prop];
  }
  if (Array.isArray(tree)){
    return tree.map((item) => exec(item, scope, context));
  }
  if (!(tree instanceof Lisp)) {
    return tree;
  }
  if (tree.op === 'arrowFunc') {
    return ops.get(tree.op)(tree.a, tree.b, undefined, context, scope);
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

export default class Sandbox {
  context: IContext
  constructor(globals: IGlobals = Sandbox.SAFE_GLOBALS, prototypeWhitelist: Map<Function, Set<string>> = Sandbox.SAFE_PROTOTYPES, prototypeReplacements = new Map<Function, replacementCallback>(),  options: IOptions = {audit: false}) {
    const sandboxGlobal = new SandboxGlobal(globals);
    this.context = {
      sandbox: this,
      globals,
      prototypeWhitelist,
      prototypeReplacements,
      globalsWhitelist: new Set(Object.values(globals)),
      options,
      globalScope: new Scope(null, globals, sandboxGlobal),
      sandboxGlobal,
      evals: new Map(),
      getSubscriptions: new Set<(obj: object, name: string) => void>(),
      setSubscriptions: new WeakMap<object, Map<string, Set<() => void>>>()
    };
    const func = sandboxFunction(this.context);
    this.context.evals.set(Function, func);
    this.context.evals.set(eval, sandboxedEval(func));
    this.context.evals.set(setTimeout, sandboxedSetTimeout(func));
    this.context.evals.set(setInterval, sandboxedSetInterval(func));
  }

  static get SAFE_GLOBALS(): IGlobals {
    return {
      Function,
      console,
      isFinite,
      isNaN,
      parseFloat,
      parseInt,
      decodeURI,
      decodeURIComponent,
      encodeURI,
      encodeURIComponent,
      escape,
      unescape,
      Boolean,
      Number,
      String,
      Object,
      Array,
      Symbol,
      Error,
      EvalError,
      RangeError,
      ReferenceError,
      SyntaxError,
      TypeError,
      URIError,
      Int8Array,
      Uint8Array,
      Uint8ClampedArray,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Promise,
      Intl,
      JSON,
      Math,
    }
  }

  
  static get SAFE_PROTOTYPES(): Map<any, Set<string>> {
    let protos = [
      SandboxGlobal,
      Function,
      Boolean,
      Number,
      String,
      Date,
      RegExp,
      Error,
      Array,
      Int8Array,
      Uint8Array,
      Uint8ClampedArray,
      Int16Array,
      Uint16Array,
      Int32Array,
      Uint32Array,
      Float32Array,
      Float64Array,
      Map,
      Set,
      WeakMap,
      WeakSet,
      Promise,
    ]
    let map = new Map<any, Set<string>>();
    protos.forEach((proto) => {
      map.set(proto, new Set());
    });
    map.set(Object, new Set([
      'entries',
      'fromEntries',
      'getOwnPropertyNames',
      'is',
      'keys',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
      'toString',
      'valueOf',
      'values'
    ]));
    return map;
  }
  
  subscribeGet(callback: (obj: object, name: string) => void): {unsubscribe: () => void} {
    this.context.getSubscriptions.add(callback);
    return {unsubscribe: () => this.context.getSubscriptions.delete(callback)}
  }

  subscribeSet(obj: object, name: string, callback: () => void): {unsubscribe: () => void} {
    const names = this.context.setSubscriptions.get(obj) || new Map();
    this.context.setSubscriptions.set(obj, names);
    const callbacks = names.get(name) || new Set();
    names.set(name, callbacks);
    callbacks.add(callback);
    return {unsubscribe: () => callbacks.delete(callback)}
  }

  static audit(code: string, scopes: ({[prop: string]: any}|Scope)[] = []): IAuditResult {
    return new Sandbox(globalThis, new Map(), new Map(), {
      audit: true,
    }).executeTree(Sandbox.parse(code), scopes);
  }

  static parse(code: string, strings: string[] = [], literals: ILiteral[] = []): IExecutionTree {
    if (typeof code !== 'string') throw new ParseError(`Cannot parse ${code}`, code);
    // console.log('parse', str);
    let str = code;
    let quote;
    let extract = "";
    let escape = false;
    
    let js: (LispItem[])[] = [];
    let currJs: LispItem[] = [];
    if (strings) {
      let extractSkip = 0;
      for (let i = 0; i < str.length; i++) {
        let char = str[i];

        if (escape) {
          if (char === "$" && quote === '`') {
            extractSkip--;
            char = '$$';
          } else if (char === 'u') {
            let reg = /^[a-fA-F\d]{2,4}/.exec(str.substring(i+1));
            let num;
            if (!reg) {
              num = Array.from(/^{[a-fA-F\d]+}/.exec(str.substring(i+1)) || [""]);
            } else {
              num = Array.from(reg);
            }
            char = JSON.parse(`"\\u${num[0]}"`);
            str = str.substring(0, i-1) + char + str.substring(i + (1 + num[0].length));
            i -= 1;
          } else if (char != '`') {
            char = JSON.parse(`"\\${char}"`);
          }
        } else if (char === '$' && quote === '`' && str[i+1] !== '{') {
          extractSkip--;
          char = '$$';
        }
        if (quote === "`" && char === "$" && str[i+1] === "{") {
          let skip = restOfExp(str.substring(i+2), [/^}/]);
          currJs.push(skip);
          extractSkip += skip.length + 3; 
          extract += `\${${currJs.length - 1}}`;
          i += skip.length + 2;
        } else if (!quote && (char === "'"  || char === '"'  || char === '`') && !escape) {
          currJs = [];
          extractSkip = 0;
          quote = char;
        } else if (quote === char && !escape) {
          let len;
          if (quote === '`') {
            literals.push({
              op: 'literal',
              a: extract,
              b: currJs
            });
            js.push(currJs);
            str = str.substring(0, i - extractSkip - 1) + `\`${literals.length - 1}\`` + str.substring(i + 1);
            len = (literals.length - 1).toString().length;
          } else {
            strings.push(extract);
            str = str.substring(0, i - extract.length - 1) + `"${strings.length - 1}"` + str.substring(i + 1);
            len = (strings.length - 1).toString().length;
          }
          quote = null;
          i -= extract.length - len;
          extract = "";
        } else if(quote && !(!escape && char === "\\")) {
          extractSkip += escape ? 1 + char.length : char.length;
          extract += char;
        } 
        escape = quote && !escape && char === "\\";
      }

      str = str.replace(/([^\w_$]|^)((var|let|const|typeof|return|instanceof|in|delete)(?=[^\w_$]|$))/g, (match, start, keyword) => {
        if (keyword.length !== keyword.trim().length) throw new Error(keyword)
        return `${start}#${keyword}#`;
      }).replace(/\s/g, "").replace(/#/g, " ");

      js.forEach((j: LispItem[]) => {
        const a = j.map((skip: string) => this.parse(skip, strings, literals).tree[0])
        j.length = 0;
        j.push(...a);
      });
        
    }
    let parts = [];
    let part: string;
    let pos = 0;
    while ((part = restOfExp(str.substring(pos), [/^;/]))) {
      parts.push(part);
      pos += part.length + 1;
    }
    parts = parts.filter(Boolean);
    const tree = parts.filter((str) => str.length).map((str) => {
      let subExpressions = [];
      let sub: string;
      let pos = 0;
      while ((sub = restOfExp(str.substring(pos), [/^,/]))) {
        subExpressions.push(sub);
        pos += sub.length + 1;
      }
      try {
        const exprs = subExpressions.map((str) => lispify(str));
        if (exprs.length > 1 && exprs[0] instanceof Lisp && exprs[0].op === 'return') {
          const last = exprs.pop();
          return [(exprs.shift() as Lisp).b, ...exprs, new Lisp({
            op: 'return',
            b: last
          })]
        }
        return exprs;
      } catch (e) {
        // throw e;
        throw new ParseError(e.message + ": " + str, str);
      }
    });

    return {tree: tree.flat(), strings, literals};
  }

  executeTree(executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = []): IAuditResult {
    const execTree = executionTree.tree;
    const contextb = {...this.context, strings: executionTree.strings, literals: executionTree.literals};
    let scope = this.context.globalScope;
    let s;
    while (s = scopes.shift()) {
      if (typeof s !== "object") continue;
      if (s instanceof Scope) {
        scope = s;
      } else {
        scope = new Scope(scope, s);
      }
    }
    let context: IContext = Object.assign({}, contextb);
    if (contextb.options.audit) {
      context.auditReport = {
        globalsAccess: new Set(),
        prototypeAccess: {},
      }
    }
    
    let returned = false;
    let res;
    if (!(execTree instanceof Array)) throw new SyntaxError('Bad execution tree');
    execTree.map(tree => {
      if (!returned) {
        let r
        try {
          r = exec(tree, scope, context);
        } catch (e) {
          throw new e.constructor(e.message);
        }
        if (tree instanceof Lisp && tree.op === 'return') {
          returned = true;
          res = r;
        }
      }
      return null;
    });
    res =  res instanceof Prop ? res.context[res.prop] : res;
    return { auditReport: context.auditReport, result: res }; 
  }
  
  compile(code: string): (...scopes: ({[prop: string]: any}|Scope)[]) => any {
    const executionTree = Sandbox.parse(code);
    return (...scopes: {[key:string]: any}[]) => {
      return this.executeTree(executionTree, scopes).result;
    };
  };
}
