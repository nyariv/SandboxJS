import { 
  IGlobals, 
  IAuditReport,  
  Change, 
  sandboxFunction,
  sandboxedEval,
  sandboxedSetTimeout,
  sandboxedSetInterval,
  ExecReturn,
  executeTree,
  executeTreeAsync,
  ops,
  assignCheck,
  execMany,
  execAsync,
  execSync,
  asyncDone,
  Scope,
  IScope,
  FunctionScope,
  LocalScope,
  syncDone
} from "./executor.js";
import { parse, IExecutionTree, expectTypes, setLispType, LispItem, IConstants, Lisp } from "./parser.js";

type replacementCallback = (obj: any, isStaticAccess: boolean) => any

export {
  expectTypes,
  setLispType,
  ops as executionOps,
  assignCheck,
  execMany,
  execAsync,
  execSync,
  asyncDone,
  syncDone,
  executeTree,
  executeTreeAsync,
  FunctionScope,
  LocalScope,
};

export interface IOptions {
  audit?: boolean;
  forbidFunctionCalls?: boolean;
  forbidFunctionCreation?: boolean;
  prototypeReplacements?: Map<new () => any, replacementCallback>;
  prototypeWhitelist?: Map<any, Set<string>>;
  globals: IGlobals;
  executionQuota?: bigint;
  onExecutionQuotaReached?: (ticks: Ticks, scope: Scope, context: IExecutionTree, tree: LispItem) => boolean|void;
}

export interface IContext {
  sandbox: Sandbox;
  globalScope: Scope;
  sandboxGlobal: SandboxGlobal;
  globalsWhitelist?: Set<any>;
  prototypeWhitelist?: Map<any, Set<string>>;
  options: IOptions;
  auditReport?: IAuditReport;
}

export interface Ticks {
  ticks: bigint;
}

export interface IExecContext extends IExecutionTree {
  ctx: IContext,
  getSubscriptions: Set<(obj: object, name: string) => void>;
  setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
  changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
  setSubscriptionsGlobal: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
  changeSubscriptionsGlobal: WeakMap<object, Set<(modification: Change) => void>>;
  registerSandboxFunction: (fn: (...args: any[]) => any) => void;
  evals: Map<any, any>;
}

export class SandboxGlobal {
  constructor(globals: IGlobals) {
    if (globals === globalThis) return globalThis;
    for (let i in globals) {
      (this as any)[i] = globals[i];
    }
  }
}

export class ExecContext implements IExecContext {
  constructor(
    public ctx: IContext,
    public constants: IConstants,
    public tree: Lisp[],
    public getSubscriptions: Set<(obj: object, name: string) => void>,
    public setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>,
    public changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>,
    public setSubscriptionsGlobal: WeakMap<object, Map<string, Set<(modification: Change) => void>>>,
    public changeSubscriptionsGlobal: WeakMap<object, Set<(modification: Change) => void>>,
    public evals: Map<any, any>,
    public registerSandboxFunction: (fn: (...args: any[]) => any) => void
  ) {

  }
}

function subscribeSet(obj: object, name: string, callback: (modification: Change) => void, context: {
  setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>, 
  changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>
}): {unsubscribe: () => void} {
  const names = context.setSubscriptions.get(obj) || new Map<string, Set<(modification: Change) => void>>();
  context.setSubscriptions.set(obj, names);
  const callbacks = names.get(name) || new Set();
  names.set(name, callbacks);
  callbacks.add(callback);
  let changeCbs: Set<(modification: Change) => void>;
  if (obj && obj[name] && typeof obj[name] === "object") {
    changeCbs = context.changeSubscriptions.get(obj[name]) || new Set();
    changeCbs.add(callback);
    context.changeSubscriptions.set(obj[name], changeCbs);
  }
  return {
    unsubscribe: () => {
      callbacks.delete(callback);
      changeCbs?.delete(callback);
    }
  }
}


export default class Sandbox {
  context: IContext;
  setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>> = new WeakMap();
  changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>> = new WeakMap();
  sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext> = new WeakMap();
  constructor(options?: IOptions) {
    options = Object.assign({
      audit: false,
      forbidFunctionCalls: false,
      forbidFunctionCreation: false,
      globals: Sandbox.SAFE_GLOBALS,
      prototypeWhitelist: Sandbox.SAFE_PROTOTYPES, 
      prototypeReplacements: new Map<new() => any, replacementCallback>(),
    }, options || {});
    const sandboxGlobal = new SandboxGlobal(options.globals);
    this.context = {
      sandbox: this,
      globalsWhitelist: new Set(Object.values(options.globals)),
      prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
      options,
      globalScope: new Scope(null, options.globals, sandboxGlobal),
      sandboxGlobal
    };
    this.context.prototypeWhitelist.set(Object.getPrototypeOf([][Symbol.iterator]()), new Set());
  }

  static get SAFE_GLOBALS(): IGlobals {
    return {
      Function,
      console: {
        debug: console.debug, 
        error: console.error, 
        info: console.info, 
        log: console.log, 
        table: console.table, 
        warn: console.warn
      },
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
      BigInt,
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
      Date,
      RegExp
    }
  }

  
  static get SAFE_PROTOTYPES(): Map<any, Set<string>> {
    let protos = [
      SandboxGlobal,
      Function,
      Boolean,
      Number,
      BigInt,
      String,
      Date,
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
      Symbol,
      Date,
      RegExp
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

  subscribeGet(callback: (obj: object, name: string) => void, context: IExecContext): {unsubscribe: () => void} {
    context.getSubscriptions.add(callback);
    return {unsubscribe: () => context.getSubscriptions.delete(callback)}
  }

  subscribeSet(obj: object, name: string, callback: (modification: Change) => void, context: Sandbox|IExecContext): {unsubscribe: () => void} {
    return subscribeSet(obj, name, callback, context);
  }

  subscribeSetGlobal(obj: object, name: string, callback: (modification: Change) => void): {unsubscribe: () => void} {
    return subscribeSet(obj, name, callback, this);
  }

  static audit<T>(code: string, scopes: (IScope)[] = []): ExecReturn<T> {
    const globals = {};
    for (let i of Object.getOwnPropertyNames(globalThis)) {
      globals[i] = globalThis[i];
    }
    const sandbox = new Sandbox({
      globals,
      audit: true,
    });
    return sandbox.executeTree(sandbox.createContext(sandbox.context, parse(code)), scopes);
  }

  static parse(code: string) {
    return parse(code);
  }

  createContext(context: IContext, executionTree: IExecutionTree) {
    const evals = new Map();
    const execContext = new ExecContext(
      context,
      executionTree.constants,
      executionTree.tree,
      new Set<(obj: object, name: string) => void>(),
      new WeakMap<object, Map<string, Set<(modification: Change) => void>>>(),
      new WeakMap<object, Set<(modification: Change) => void>>(),
      this.setSubscriptions,
      this.changeSubscriptions,
      evals,
      (fn) => this.sandboxFunctions.set(fn, execContext)
    );
    const func = sandboxFunction(execContext);
    evals.set(Function, func);
    evals.set(eval, sandboxedEval(func));
    evals.set(setTimeout, sandboxedSetTimeout(func));
    evals.set(setInterval, sandboxedSetInterval(func));
    return execContext;
  }

  getContext(fn: (...args: any[]) => any) {
    return this.sandboxFunctions.get(fn);
  }

  executeTree<T>(context: IExecContext, scopes: (IScope)[] = []): ExecReturn<T> {
    return executeTree({
      ticks: BigInt(0),
    }, context, context.tree, scopes);
  }

  executeTreeAsync<T>(context: IExecContext, scopes: (IScope)[] = []): Promise<ExecReturn<T>> {
    return executeTreeAsync({
      ticks: BigInt(0),
    }, context, context.tree, scopes);
  }
  
  compile<T>(code: string, optimize = false): (...scopes: (IScope)[]) => {context: IExecContext, run: () => T} {
    const parsed = parse(code, optimize);
    const exec = (...scopes: (IScope)[]) => {
      const context = this.createContext(this.context, parsed);
      return {context , run: () => this.executeTree<T>(context, [...scopes]).result};
    };
    return exec;
  };
  
  compileAsync<T>(code: string, optimize = false): (...scopes: (IScope)[]) => {context: IExecContext, run: () => Promise<T>} {
    const parsed = parse(code, optimize);
    const exec = (...scopes: (IScope)[]) => {
      const context = this.createContext(this.context, parsed);
      return {context , run: () => this.executeTreeAsync<T>(context, [...scopes]).then((ret) => ret.result)};
    };
    return exec;
  };

  compileExpression<T>(code: string, optimize = false): (...scopes: (IScope)[]) => {context: IExecContext, run: () => T} {
    const parsed = parse(code, optimize, true);
    const exec = (...scopes: (IScope)[]) => {
      const context = this.createContext(this.context, parsed);
      return {context , run: () => this.executeTree<T>(context, [...scopes]).result};
    };
    return exec
  }

  compileExpressionAsync<T>(code: string, optimize = false): (...scopes: (IScope)[]) => {context: IExecContext, run: () => Promise<T>} {
    const parsed = parse(code, optimize, true);
    const exec = (...scopes: (IScope)[]) => {
      const context = this.createContext(this.context, parsed);
      return {context , run: () => this.executeTreeAsync<T>(context, [...scopes]).then((ret) => ret.result)};
    };
    return exec;
  }
}
