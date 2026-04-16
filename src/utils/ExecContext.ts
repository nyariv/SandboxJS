import type { IEvalContext } from '../eval';
import type { Change } from '../executor';
import { DEFAULT_FUNCTION_REPLACEMENTS } from './functionReplacements';
import type { IConstants, IExecutionTree, Lisp, LispItem } from '../parser';
import type SandboxExec from '../SandboxExec';
import {
  AsyncFunction,
  GeneratorFunction,
  AsyncGeneratorFunction,
  NON_BLOCKING_THRESHOLD,
  LispType,
  type IContext,
  type IExecContext,
  type IOptions,
  type ISymbolWhitelist,
  type ISandboxGlobal,
  type SandboxSymbolContext,
  type SubscriptionSubject,
} from './types';
import { Scope } from './Scope';

export class ExecContext implements IExecContext {
  constructor(
    public ctx: IContext,
    public constants: IConstants,
    public tree: Lisp[],
    public getSubscriptions: Set<(obj: SubscriptionSubject, name: string) => void>,
    public setSubscriptions: WeakMap<
      SubscriptionSubject,
      Map<string, Set<(modification: Change) => void>>
    >,
    public changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>,
    public setSubscriptionsGlobal: WeakMap<
      SubscriptionSubject,
      Map<string, Set<(modification: Change) => void>>
    >,
    public changeSubscriptionsGlobal: WeakMap<
      SubscriptionSubject,
      Set<(modification: Change) => void>
    >,
    public evals: Map<any, any>,
    public registerSandboxFunction: (fn: (...args: any[]) => any) => void,
    public allowJit: boolean,
    public evalContext?: IEvalContext,
  ) {}
}

function createSandboxSymbolContext(symbolWhitelist: ISymbolWhitelist): SandboxSymbolContext {
  return {
    registry: new Map<string, symbol>(),
    reverseRegistry: new Map<symbol, string>(),
    whitelist: { ...symbolWhitelist },
  };
}

const RESERVED_SYMBOL_PROPERTIES = new Set(['length', 'name', 'prototype', 'for', 'keyFor']);

function copyWhitelistedSymbols(target: Function, symbolWhitelist: ISymbolWhitelist) {
  for (const [key, value] of Object.entries(symbolWhitelist)) {
    if (RESERVED_SYMBOL_PROPERTIES.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(Symbol, key);
    if (descriptor) {
      Object.defineProperty(target, key, descriptor);
    }
  }
}

export function getSandboxSymbolCtor(symbols: SandboxSymbolContext) {
  if (symbols.ctor) {
    return symbols.ctor;
  }

  function SandboxSymbol(this: unknown, description?: unknown) {
    if (new.target) {
      throw new TypeError('Symbol is not a constructor');
    }
    return Symbol(description === undefined ? undefined : String(description));
  }

  copyWhitelistedSymbols(SandboxSymbol, symbols.whitelist);
  Object.defineProperties(SandboxSymbol, {
    prototype: {
      value: Symbol.prototype,
      enumerable: false,
      configurable: false,
      writable: false,
    },
    for: {
      value(key: unknown) {
        const stringKey = String(key);
        let symbol = symbols.registry.get(stringKey);
        if (!symbol) {
          symbol = Symbol(stringKey);
          symbols.registry.set(stringKey, symbol);
          symbols.reverseRegistry.set(symbol, stringKey);
        }
        return symbol;
      },
      enumerable: false,
      configurable: true,
      writable: true,
    },
    keyFor: {
      value(symbol: unknown) {
        return typeof symbol === 'symbol' ? symbols.reverseRegistry.get(symbol) : undefined;
      },
      enumerable: false,
      configurable: true,
      writable: true,
    },
  });

  symbols.ctor = SandboxSymbol;
  return SandboxSymbol;
}

function SandboxGlobal() {}
interface SandboxGlobalConstructor {
  new (): ISandboxGlobal;
}
export function sandboxedGlobal(globals: ISandboxGlobal): SandboxGlobalConstructor {
  SG.prototype = SandboxGlobal.prototype;
  return SG as unknown as SandboxGlobalConstructor;
  function SG(this: ISandboxGlobal) {
    for (const i in globals) {
      this[i] = globals[i];
    }
  }
}

export function createContext(sandbox: SandboxExec, options: IOptions): IContext {
  const sandboxSymbols = createSandboxSymbolContext(options.symbolWhitelist);
  const SandboxGlobal = sandboxedGlobal(options.globals);
  const sandboxGlobal = new SandboxGlobal();
  const context: IContext = {
    sandbox: sandbox,
    globalsWhitelist: new Set(Object.values(options.globals)),
    prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
    sandboxSymbols,
    options,
    globalScope: new Scope(null, sandboxGlobal, sandboxGlobal),
    sandboxGlobal,
    ticks: {
      ticks: 0n,
      tickLimit: options.executionQuota,
      nextYield: options.nonBlocking ? NON_BLOCKING_THRESHOLD : undefined,
    },
    sandboxedFunctions: new WeakSet<Function>(),
    functionReplacements: new Map<Function, Function>(),
  };
  // Resolve default tick-checking replacements
  for (const [original, factory] of DEFAULT_FUNCTION_REPLACEMENTS) {
    context.functionReplacements.set(original, factory(context));
  }
  // Resolve user-provided replacements (override defaults)
  for (const [original, factory] of options.functionReplacements) {
    context.functionReplacements.set(original, factory(context));
  }
  context.prototypeWhitelist.set(Object.getPrototypeOf(sandboxGlobal), new Set());
  context.prototypeWhitelist.set(Object.getPrototypeOf([][Symbol.iterator]()) as object, new Set());
  // Whitelist Generator and AsyncGenerator prototype chains
  const genProto = Object.getPrototypeOf((function* () {})());
  context.prototypeWhitelist.set(Object.getPrototypeOf(genProto), new Set());
  const asyncGenProto = Object.getPrototypeOf((async function* () {})());
  context.prototypeWhitelist.set(Object.getPrototypeOf(asyncGenProto), new Set());
  return context;
}

export function createExecContext(
  sandbox: {
    readonly setSubscriptions: WeakMap<
      SubscriptionSubject,
      Map<string, Set<(modification: Change) => void>>
    >;
    readonly changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    readonly sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
    readonly context: IContext;
  },
  executionTree: IExecutionTree,
  evalContext?: IEvalContext,
): IExecContext {
  const evals = new Map();
  const execContext: IExecContext = new ExecContext(
    sandbox.context,
    executionTree.constants,
    executionTree.tree,
    new Set<(obj: SubscriptionSubject, name: string) => void>(),
    new WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>(),
    new WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>(),
    sandbox.setSubscriptions,
    sandbox.changeSubscriptions,
    evals,
    (fn) => sandbox.sandboxFunctions.set(fn, execContext),
    !!evalContext,
    evalContext,
  );
  if (evalContext) {
    const func = evalContext.sandboxFunction(execContext);
    const asyncFunc = evalContext.sandboxAsyncFunction(execContext);
    const genFunc = evalContext.sandboxGeneratorFunction(execContext);
    const asyncGenFunc = evalContext.sandboxAsyncGeneratorFunction(execContext);
    const sandboxSymbol = evalContext.sandboxedSymbol(execContext);
    evals.set(Function, func);
    evals.set(AsyncFunction, asyncFunc);
    evals.set(GeneratorFunction, genFunc);
    evals.set(AsyncGeneratorFunction, asyncGenFunc);
    evals.set(Symbol, sandboxSymbol);
    evals.set(eval, evalContext.sandboxedEval(func, execContext));
    evals.set(setTimeout, evalContext.sandboxedSetTimeout(func, execContext));
    evals.set(setInterval, evalContext.sandboxedSetInterval(func, execContext));
    evals.set(clearTimeout, evalContext.sandboxedClearTimeout(execContext));
    evals.set(clearInterval, evalContext.sandboxedClearInterval(execContext));

    for (const [key, value] of evals) {
      execContext.registerSandboxFunction(value as (...args: any[]) => any);
      sandbox.context.prototypeWhitelist.set(value.prototype, new Set());
      sandbox.context.prototypeWhitelist.set(key.prototype, new Set());
      if (sandbox.context.globalsWhitelist.has(key)) {
        sandbox.context.globalsWhitelist.add(value);
      }
      if (sandbox.context.sandboxGlobal[key.name]) {
        sandbox.context.sandboxGlobal[key.name] = value;
      }
    }
    if (sandbox.context.sandboxGlobal.globalThis) {
      sandbox.context.sandboxGlobal.globalThis = sandbox.context.sandboxGlobal;
    }
  }
  return execContext;
}

export function isLisp<Type extends Lisp = Lisp>(item: LispItem | LispItem): item is Type {
  return (
    Array.isArray(item) &&
    typeof item[0] === 'number' &&
    item[0] !== LispType.None &&
    item[0] !== LispType.True
  );
}
