import type { IExecContext } from './types.js';

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
    return (ctx as any)[this.prop] as T;
  }
}

export function hasOwnProperty(obj: unknown, prop: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function getGlobalProp(val: unknown, context: IExecContext, prop?: Prop) {
  if (!val) return;
  const isFunc = typeof val === 'function';
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
  const evl = isFunc && context.evals.get(val as Function);
  if (evl) {
    return new Prop(
      {
        [p]: evl,
      },
      p,
      prop?.isConst || false,
      true,
      prop?.isVariable || false,
    );
  }
}
