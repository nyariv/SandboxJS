import { IEvalContext } from './eval.js';
import { Change, ExecReturn, executeTree, executeTreeAsync } from './executor.js';
import {
  createContext,
  IContext,
  IExecContext,
  IGlobals,
  IOptionParams,
  IOptions,
  IScope,
  LocalScope,
  replacementCallback,
  SandboxGlobal,
  Scope,
  SubscriptionSubject,
  Ticks,
} from './utils.js';

function subscribeSet(
  obj: object,
  name: string,
  callback: (modification: Change) => void,
  context: {
    setSubscriptions: WeakMap<
      SubscriptionSubject,
      Map<string, Set<(modification: Change) => void>>
    >;
    changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
  }
): { unsubscribe: () => void } {
  const names =
    context.setSubscriptions.get(obj) || new Map<string, Set<(modification: Change) => void>>();
  context.setSubscriptions.set(obj, names);
  const callbacks = names.get(name) || new Set();
  names.set(name, callbacks);
  callbacks.add(callback);
  let changeCbs: Set<(modification: Change) => void>;
  const val = (obj as any)[name] as unknown;
  if (val instanceof Object) {
    changeCbs = context.changeSubscriptions.get(val) || new Set();
    changeCbs.add(callback);
    context.changeSubscriptions.set(val, changeCbs);
  }
  return {
    unsubscribe: () => {
      callbacks.delete(callback);
      changeCbs?.delete(callback);
    },
  };
}

export default class SandboxExec {
  context: IContext;
  setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>> =
    new WeakMap();
  changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>> =
    new WeakMap();
  sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext> = new WeakMap();
  haltSubscriptions: Set<(args?: {
    error?: Error,
    ticks: Ticks,
    scope: Scope,
    context: IExecContext,
  }) => void> = new Set();
  continueSubscriptions: Set<() => void> = new Set();
  halted = false;
  timeoutHandleCounter = 0;
  setTimeoutHandles = new Map<number, ReturnType<typeof setTimeout>>();
  setIntervalHandles = new Map<number, {
    handle: ReturnType<typeof setInterval>
    haltsub: { unsubscribe: () => void };
    contsub: { unsubscribe: () => void };
  }>();
  constructor(options?: IOptionParams, public evalContext?: IEvalContext) {
    const opt: IOptions = Object.assign(
      {
        audit: false,
        forbidFunctionCalls: false,
        forbidFunctionCreation: false,
        globals: SandboxExec.SAFE_GLOBALS,
        prototypeWhitelist: SandboxExec.SAFE_PROTOTYPES,
        prototypeReplacements: new Map<new () => any, replacementCallback>(),
      },
      options || {}
    );
    this.context = createContext(this, opt);
  }

  static LocalScope = LocalScope

  static get SAFE_GLOBALS(): IGlobals {
    return {
      globalThis,
      Function,
      eval,
      console: {
        debug: console.debug,
        error: console.error,
        info: console.info,
        log: console.log,
        table: console.table,
        warn: console.warn,
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
      RegExp,
    };
  }

  static get SAFE_PROTOTYPES(): Map<any, Set<string>> {
    const protos = [
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
      RegExp,
    ];
    const map = new Map<any, Set<string>>();
    protos.forEach((proto) => {
      map.set(proto, new Set());
    });
    map.set(
      Object,
      new Set([
        'constructor',
        'name',
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
        'values',
      ])
    );
    return map;
  }

  subscribeGet(
    callback: (obj: SubscriptionSubject, name: string) => void,
    context: IExecContext
  ): { unsubscribe: () => void } {
    context.getSubscriptions.add(callback);
    return { unsubscribe: () => context.getSubscriptions.delete(callback) };
  }

  subscribeSet(
    obj: object,
    name: string,
    callback: (modification: Change) => void,
    context: SandboxExec | IExecContext
  ): { unsubscribe: () => void } {
    return subscribeSet(obj, name, callback, context);
  }

  subscribeSetGlobal(
    obj: SubscriptionSubject,
    name: string,
    callback: (modification: Change) => void
  ): { unsubscribe: () => void } {
    return subscribeSet(obj, name, callback, this);
  }

  
  subscribeHalt(cb: (args?: {
    error?: Error,
    ticks: Ticks,
    scope: Scope,
    context: IExecContext,
  }) => void) {
    this.haltSubscriptions.add(cb);
    return {
      unsubscribe: () => {
        this.haltSubscriptions.delete(cb);
      },
    };
  }
  subscribeResume(cb: () => void) {
    this.continueSubscriptions.add(cb);
    return {
      unsubscribe: () => {
        this.continueSubscriptions.delete(cb);
      },
    };
  }

  haltExecution(haltContext?: {
    error?: Error,
    ticks: Ticks,
    scope: Scope,
    context: IExecContext,
  }) {
    if (this.halted) return;
    this.halted = true;
    for (const cb of this.haltSubscriptions) {
      cb(haltContext);
    }
  }

  resumeExecution() {
    if (!this.halted) return;
    this.halted = false;
    for (const cb of this.continueSubscriptions) {
      cb();
    }
  }

  getContext(fn: (...args: any[]) => any) {
    return this.sandboxFunctions.get(fn);
  }

  executeTree<T>(context: IExecContext, scopes: IScope[] = []): ExecReturn<T> {
    return executeTree(
      context.ticks,
      context,
      context.tree,
      scopes
    );
  }

  executeTreeAsync<T>(context: IExecContext, scopes: IScope[] = []): Promise<ExecReturn<T>> {
    return executeTreeAsync(
      context.ticks,
      context,
      context.tree,
      scopes
    );
  }
}
