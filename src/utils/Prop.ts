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
