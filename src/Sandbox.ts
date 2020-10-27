import { 
  IGlobals, 
  replacementCallback, 
  IAuditReport, 
  Scope, 
  Change, 
  sandboxFunction,
  sandboxedEval,
  sandboxedSetTimeout,
  sandboxedSetInterval,
  ExecReturn,
  executeTree,
  executeTreeAsync
} from "./executor.js";
import { IConstants, parse, IExecutionTree } from "./parser.js";

export interface IOptions {
  audit?: boolean;
  forbidMethodCalls?: boolean;
}

export interface IContext {
  sandbox: Sandbox;
  globals: IGlobals;
  globalsWhitelist: Set<any>;
  prototypeWhitelist: Map<Function, Set<string>>;
  prototypeReplacements: Map<Function, replacementCallback>;
  globalScope: Scope;
  sandboxGlobal: SandboxGlobal;
  options: IOptions;
  evals: Map<any, any>;
  getSubscriptions: Set<(obj: object, name: string) => void>;
  setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
  changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
  auditReport?: IAuditReport;
}

export interface IExecContext {
  ctx: IContext
  inLoopOrSwitch?: string;
  constants: IConstants
}

export class SandboxGlobal {
  constructor(globals: IGlobals) {
    if (globals === globalThis) return globalThis;
    for (let i in globals) {
      (this as any)[i] = globals[i];
    }
  }
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
      setSubscriptions: new WeakMap<object, Map<string, Set<() => void>>>(),
      changeSubscriptions: new WeakMap()
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

  subscribeSet(obj: object, name: string, callback: (modification: Change) => void): {unsubscribe: () => void} {
    const names = this.context.setSubscriptions.get(obj) || new Map<string, Set<(modification: Change) => void>>();
    this.context.setSubscriptions.set(obj, names);
    const callbacks = names.get(name) || new Set();
    names.set(name, callbacks);
    callbacks.add(callback);
    let changeCbs: Set<(modification: Change) => void>;
    if (obj && obj[name] && typeof obj[name] === "object") {
      changeCbs = this.context.changeSubscriptions.get(obj[name]) || new Set();
      changeCbs.add(callback);
      this.context.changeSubscriptions.set(obj[name], changeCbs);
    }
    return {unsubscribe: () => {
      callbacks.delete(callback);
      if (changeCbs) changeCbs.delete(callback);
    }}
  }

  static audit(code: string, scopes: ({[prop: string]: any}|Scope)[] = []): ExecReturn {
    return new Sandbox(globalThis, new Map(), new Map(), {
      audit: true,
    }).executeTree(parse(code), scopes);
  }

  static parse(code: string) {
    return parse(code);
  }

  executeTree(executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = []): ExecReturn {
    return executeTree({
      ctx: this.context,
      constants: executionTree.constants
    }, executionTree.tree, scopes);
  }

  executeTreeAsync(executionTree: IExecutionTree, scopes: ({[key:string]: any}|Scope)[] = []): Promise<ExecReturn> {
    return executeTreeAsync({
      ctx: this.context,
      constants: executionTree.constants
    }, executionTree.tree, scopes);
  }
  
  compile(code: string): (...scopes: ({[prop: string]: any}|Scope)[]) => any {
    const executionTree = parse(code);
    return (...scopes: {[key:string]: any}[]) => {
      return this.executeTree(executionTree, scopes).result;
    };
  };
  
  compileAsync(code: string): (...scopes: ({[prop: string]: any}|Scope)[]) => Promise<any> {
    const executionTree = parse(code);
    return async (...scopes: {[key:string]: any}[]) => {
      return (await this.executeTreeAsync(executionTree, scopes)).result;
    };
  };
}
