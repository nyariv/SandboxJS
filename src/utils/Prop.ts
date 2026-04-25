import type { IExecContext } from './types';
import { THIS_DEPENDENT_FUNCTION_REPLACEMENTS } from './functionReplacements';

const boundFunctionCache = new WeakMap<Function, WeakMap<object, Function>>();
const replacementReceiver = new WeakMap<Function, object>();

export class Prop<T = unknown> {
  constructor(
    public context: T,
    public prop: PropertyKey,
    public isConst = false,
    public isGlobal = false,
    public isVariable = false,
    public isInternal = false,
  ) {}

  get<T = unknown>(context: IExecContext): T {
    const ctx = this.context;
    if (ctx === undefined) throw new ReferenceError(`${this.prop.toString()} is not defined`);
    if (ctx === null)
      throw new TypeError(`Cannot read properties of null, (reading '${this.prop.toString()}')`);
    context.getSubscriptions.forEach((cb) => cb(ctx, this.prop.toString()));
    const val = (ctx as any)[this.prop];
    return getReplacementValue(val, context, ctx) as T;
  }
}

export function hasOwnProperty(obj: unknown, prop: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function getReplacementReceiver(fn: Function) {
  return replacementReceiver.get(fn);
}

export function resolveSandboxProp(val: unknown, context: IExecContext, prop?: Prop) {
  if (!val) return;
  if (val instanceof Prop) {
    if (!prop) {
      prop = val;
    }
    val = val.get(context);
  }
  const p = prop?.prop || 'prop';
  if (val === globalThis) {
    return new Prop(
      {
        [p]: context.ctx.sandboxGlobal,
      },
      p,
      prop?.isConst || false,
      false,
      prop?.isVariable || false,
    );
  }
  if (prop && !prop.isVariable) {
    return;
  }
  const replacement = getReplacementValue(val, context, prop?.context);
  if (replacement !== val) {
    return new Prop(
      { [p]: replacement },
      p,
      prop?.isConst || false,
      prop?.isGlobal || false,
      prop?.isVariable || false,
    );
  }
}

function getReplacementValue(val: unknown, context: IExecContext, bindContext?: unknown) {
  if (typeof val !== 'function') {
    return val;
  }
  const replacement = context.evals.get(val as Function);
  if (replacement === undefined) {
    return val;
  }
  if (!shouldBindReplacement(val as Function, bindContext, context)) {
    return replacement;
  }
  return bindReplacement(replacement, bindContext as object, val as Function, context);
}

function shouldBindReplacement(original: Function, bindContext: unknown, context: IExecContext) {
  return (
    THIS_DEPENDENT_FUNCTION_REPLACEMENTS.has(original) &&
    bindContext !== null &&
    (typeof bindContext === 'object' || typeof bindContext === 'function') &&
    bindContext !== context.ctx.sandboxGlobal &&
    !context.ctx.globalsWhitelist.has(bindContext)
  );
}

function bindReplacement(
  replacement: Function,
  bindContext: object,
  original: Function,
  context: IExecContext,
) {
  let cache = boundFunctionCache.get(replacement);
  if (!cache) {
    cache = new WeakMap<object, Function>();
    boundFunctionCache.set(replacement, cache);
  }

  let bound = cache.get(bindContext);
  if (bound) {
    return bound;
  }

  bound = function (this: unknown, ...args: unknown[]) {
    return replacement.apply(this, args);
  };

  redefineFunctionMetadata(bound, original);
  context.ctx.sandboxedFunctions.add(bound);
  replacementReceiver.set(bound, bindContext);
  cache.set(bindContext, bound);
  return bound;
}

function redefineFunctionMetadata(
  target: Function,
  source: Function,
  overrides: Partial<Record<'name' | 'length', string | number>> = {},
) {
  for (const key of ['name', 'length'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor?.configurable) {
      Object.defineProperty(target, key, {
        ...descriptor,
        value: overrides[key] ?? source[key],
      });
    }
  }
}
