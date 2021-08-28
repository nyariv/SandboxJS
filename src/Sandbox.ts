import { 
  IGlobals, 
  replacementCallback, 
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
  syncDone,
  SandboxFunction
} from "./executor.js";
import { parse, IExecutionTree, expectTypes, setLispType, LispItem } from "./parser.js";


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

export function createContext(executionTree: IExecutionTree) {
  const evals = new Map();
  const context: IExecContext = {
    ctx: this.context,
    constants: executionTree.constants,
    tree: executionTree.tree,
    getSubscriptions: new Set<(obj: object, name: string) => void>(),
    setSubscriptions: new WeakMap<object, Map<string, Set<() => void>>>(),
    changeSubscriptions: new WeakMap(),
    evals
  }
  const func = sandboxFunction(context);
  evals.set(Function, func);
  evals.set(eval, sandboxedEval(func));
  evals.set(setTimeout, sandboxedSetTimeout(func));
  evals.set(setInterval, sandboxedSetInterval(func));
  return context;
}

const contextStore: WeakMap<(...scopes: (IScope)[]) => unknown|Promise<unknown>, IExecContext> = new WeakMap()

export default class Sandbox {
  context: IContext;
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
  
  subscribeGet(exec: (...scopes: (IScope)[]) => unknown|Promise<unknown>, callback: (obj: object, name: string) => void): {unsubscribe: () => void} {
    contextStore.get(exec)?.getSubscriptions.add(callback);
    return {unsubscribe: () => contextStore.get(exec)?.getSubscriptions.delete(callback)}
  }

  subscribeSet(exec: (...scopes: (IScope)[]) => unknown|Promise<unknown>, obj: object, name: string, callback: (modification: Change) => void): {unsubscribe: () => void} {
    const names = contextStore.get(exec)?.setSubscriptions.get(obj) || new Map<string, Set<(modification: Change) => void>>();
    contextStore.get(exec)?.setSubscriptions.set(obj, names);
    const callbacks = names.get(name) || new Set();
    names.set(name, callbacks);
    callbacks.add(callback);
    let changeCbs: Set<(modification: Change) => void>;
    if (obj && obj[name] && typeof obj[name] === "object") {
      changeCbs = contextStore.get(exec)?.changeSubscriptions.get(obj[name]) || new Set();
      changeCbs.add(callback);
      contextStore.get(exec)?.changeSubscriptions.set(obj[name], changeCbs);
    }
    return {
      unsubscribe: () => {
        callbacks.delete(callback);
        if (changeCbs) changeCbs.delete(callback);
      }
    }
  }

  static audit(code: string, scopes: (IScope)[] = []): ExecReturn {
    const globals = {};
    for (let i of Object.getOwnPropertyNames(globalThis)) {
      globals[i] = globalThis[i];
    }
    return new Sandbox({
      globals,
      audit: true,
    }).executeTree(createContext(parse(code)), scopes);
  }

  static parse(code: string) {
    return parse(code);
  }

  executeTree(context: IExecContext, scopes: (IScope)[] = []): ExecReturn {
    return executeTree({
      ticks: BigInt(0),
    }, context, context.tree, scopes);
  }

  executeTreeAsync(context: IExecContext, scopes: (IScope)[] = []): Promise<ExecReturn> {
    return executeTreeAsync({
      ticks: BigInt(0),
    }, context, context.tree, scopes);
  }
  
  compile<T>(code: string, optimize = false): (...scopes: (IScope)[]) => T {
    const context = createContext(parse(code, optimize));
    const exec = (...scopes: (IScope)[]) => {
      return this.executeTree(context, scopes).result;
    };
    contextStore.set(exec, context);
    return exec;
  };
  
  compileAsync<T>(code: string, optimize = false): (...scopes: (IScope)[]) => Promise<T> {
    const context = createContext(parse(code, optimize));
    const exec = async (...scopes: (IScope)[]) => {
      return (await this.executeTreeAsync(context, scopes)).result;
    };
    contextStore.set(exec, context);
    return exec
  };

  compileExpression<T>(code: string, optimize = false): (...scopes: (IScope)[]) => T {
    const context = createContext(parse(code, optimize, true));
    const exec = (...scopes: (IScope)[]) => {
      return this.executeTree(context, scopes).result;
    };
    contextStore.set(exec, context);
    return exec
  }

  compileExpressionAsync<T>(code: string, optimize = false): (...scopes: (IScope)[]) => Promise<T> {
    const context = createContext(parse(code, optimize, true));
    const exec = async (...scopes: (IScope)[]) => {
      return (await this.executeTreeAsync(context, scopes)).result;
    };
    contextStore.set(exec, context);
    return exec;
  }
}
