import { LispItem, Lisp, IRegEx, SwitchCase } from './parser.js';
import {
  CodeString,
  hasOwnProperty,
  IAuditReport,
  IExecContext,
  IScope,
  isLisp,
  LispType,
  LocalScope,
  Prop,
  SandboxExecutionQuotaExceededError,
  SandboxError,
  SandboxExecutionTreeError,
  Scope,
  Ticks,
  VarType,
  SandboxCapabilityError,
  SandboxAccessError,
} from './utils.js';

export type Done<T = any> = (err?: any, res?: T | typeof optional) => void;

export class ExecReturn<T> {
  constructor(
    public auditReport: IAuditReport | undefined,
    public result: T,
    public returned: boolean,
    public breakLoop = false,
    public continueLoop = false,
  ) {}
}

export type Unknown = undefined | null | Record<string | number, unknown>;

export interface IChange {
  type: string;
}

export interface ICreate extends IChange {
  type: 'create';
  prop: number | string;
}

export interface IReplace extends IChange {
  type: 'replace';
}

export interface IDelete extends IChange {
  type: 'delete';
  prop: number | string;
}

export interface IReverse extends IChange {
  type: 'reverse';
}

export interface ISort extends IChange {
  type: 'sort';
}

export interface IPush extends IChange {
  type: 'push';
  added: unknown[];
}

export interface IPop extends IChange {
  type: 'pop';
  removed: unknown[];
}

export interface IShift extends IChange {
  type: 'shift';
  removed: unknown[];
}

export interface IUnShift extends IChange {
  type: 'unshift';
  added: unknown[];
}

export interface ISplice extends IChange {
  type: 'splice';
  startIndex: number;
  deleteCount: number;
  added: unknown[];
  removed: unknown[];
}

export interface ICopyWithin extends IChange {
  type: 'copyWithin';
  startIndex: number;
  endIndex: number;
  added: unknown[];
  removed: unknown[];
}

export type Change =
  | ICreate
  | IReplace
  | IDelete
  | IReverse
  | ISort
  | IPush
  | IPop
  | IUnShift
  | IShift
  | ISplice
  | ICopyWithin;

const optional = {};

function generateArgs(argNames: string[], args: unknown[]) {
  const vars: Record<string, unknown> = {};
  argNames.forEach((arg, i) => {
    if (arg.startsWith('...')) {
      vars[arg.substring(3)] = args.slice(i);
    } else {
      vars[arg] = args[i];
    }
  });
  return vars;
}

export const sandboxedFunctions = new WeakSet();
export function createFunction(
  argNames: string[],
  parsed: Lisp[],
  ticks: Ticks,
  context: IExecContext,
  scope?: Scope,
  name?: string,
) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxCapabilityError('Function creation is forbidden');
  }
  let func;
  if (name === undefined) {
    func = (...args: unknown[]) => {
      const vars = generateArgs(argNames, args);
      const res = executeTree(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars)],
      );
      return res.result;
    };
  } else {
    func = function sandboxedObject(this: Unknown, ...args: unknown[]) {
      const vars = generateArgs(argNames, args);
      const res = executeTree(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars, this)],
      );
      return res.result;
    };
  }
  context.registerSandboxFunction(func);
  sandboxedFunctions.add(func);
  return func;
}

export function createFunctionAsync(
  argNames: string[],
  parsed: Lisp[],
  ticks: Ticks,
  context: IExecContext,
  scope?: Scope,
  name?: string,
) {
  if (context.ctx.options.forbidFunctionCreation) {
    throw new SandboxCapabilityError('Function creation is forbidden');
  }
  if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
    throw new SandboxCapabilityError('Async/await not permitted');
  }
  let func;
  if (name === undefined) {
    func = async (...args: unknown[]) => {
      const vars = generateArgs(argNames, args);
      const res = await executeTreeAsync(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars)],
      );
      return res.result;
    };
  } else {
    func = async function sandboxedObject(this: Unknown, ...args: unknown[]) {
      const vars = generateArgs(argNames, args);
      const res = await executeTreeAsync(
        ticks,
        context,
        parsed,
        scope === undefined ? [] : [new Scope(scope, vars, this)],
      );
      return res.result;
    };
  }
  context.registerSandboxFunction(func);
  sandboxedFunctions.add(func);
  return func;
}

export function assignCheck(obj: Prop, context: IExecContext, op = 'assign') {
  if (obj.context === undefined) {
    throw new ReferenceError(`Cannot ${op} value to undefined.`);
  }
  if (obj.isConst) {
    throw new TypeError(`Assignment to constant variable.`);
  }
  if (obj.isGlobal) {
    throw new SandboxAccessError(
      `Cannot ${op} property '${obj.prop.toString()}' of a global object`,
    );
  }
  if (obj.context === null) {
    throw new TypeError('Cannot set properties of null');
  }
  if (
    typeof (obj.context as any)[obj.prop] === 'function' &&
    !hasOwnProperty(obj.context, obj.prop)
  ) {
    throw new SandboxAccessError(
      `Override prototype property '${obj.prop.toString()}' not allowed`,
    );
  }
  if (op === 'delete') {
    if (hasOwnProperty(obj.context, obj.prop)) {
      context.changeSubscriptions
        .get(obj.context)
        ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop.toString() }));
      context.changeSubscriptionsGlobal
        .get(obj.context)
        ?.forEach((cb) => cb({ type: 'delete', prop: obj.prop.toString() }));
    }
  } else if (hasOwnProperty(obj.context, obj.prop)) {
    context.setSubscriptions
      .get(obj.context)
      ?.get(obj.prop.toString())
      ?.forEach((cb) =>
        cb({
          type: 'replace',
        }),
      );
    context.setSubscriptionsGlobal
      .get(obj.context)
      ?.get(obj.prop.toString())
      ?.forEach((cb) =>
        cb({
          type: 'replace',
        }),
      );
  } else {
    context.changeSubscriptions
      .get(obj.context)
      ?.forEach((cb) => cb({ type: 'create', prop: obj.prop.toString() }));
    context.changeSubscriptionsGlobal
      .get(obj.context)
      ?.forEach((cb) => cb({ type: 'create', prop: obj.prop.toString() }));
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
  [].copyWithin,
]);

export class KeyVal {
  constructor(
    public key: string | SpreadObject,
    public val: unknown,
  ) {}
}

export class SpreadObject {
  constructor(public item: { [key: string]: unknown }) {}
}

export class SpreadArray {
  constructor(public item: unknown[]) {}
}

export class If {
  constructor(
    public t: Lisp,
    public f: Lisp,
  ) {}
}

const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
type OpCallback<a, b, obj, bobj> = (params: OpsCallbackParams<a, b, obj, bobj>) => void;

export const ops = new Map<LispType, OpCallback<any, any, any, any>>();
export function addOps<a = unknown, b = unknown, obj = unknown, bobj = unknown>(
  type: LispType,
  cb: OpCallback<a, b, obj, bobj>,
) {
  ops.set(type, cb);
}

function isPropertyKey(val: unknown): val is PropertyKey {
  return ['string', 'number', 'symbol'].includes(typeof val);
}

function hasPossibleProperties(val: unknown): val is {} {
  return val !== null && val !== undefined;
}

addOps<unknown, PropertyKey>(LispType.Prop, ({ done, a, b, obj, context, scope }) => {
  if (a === null) {
    throw new TypeError(`Cannot read properties of null (reading '${b?.toString()}')`);
  }

  if (!isPropertyKey(b)) {
    try {
      b = `${b}`;
    } catch (e) {
      done(e);
      return;
    }
  }

  if (a === undefined && obj === undefined && typeof b === 'string') {
    // is variable access
    const prop = scope.get(b);
    if (prop.context === context.ctx.sandboxGlobal) {
      if (context.ctx.options.audit) {
        context.ctx.auditReport?.globalsAccess.add(b);
      }
    }
    const val = prop.context ? (prop.context as any)[prop.prop] : undefined;
    if (val === globalThis) {
      done(
        undefined,
        new Prop(
          {
            [prop.prop]: context.ctx.sandboxGlobal,
          },
          prop.prop,
          prop.isConst,
          false,
          prop.isVariable,
        ),
      );
      return;
    }

    const e = typeof val === 'function' && context.evals.get(val);
    if (e) {
      done(
        undefined,
        new Prop(
          {
            [prop.prop]: e,
          },
          prop.prop,
          prop.isConst,
          true,
          prop.isVariable,
        ),
      );
      return;
    }

    done(undefined, prop);
    return;
  } else if (a === undefined) {
    throw new TypeError(`Cannot read properties of undefined (reading '${b.toString()}')`);
  }

  if (!hasPossibleProperties(a)) {
    done(undefined, new Prop(undefined, b));
    return;
  }

  const prototypeAccess = typeof a === 'function' || !hasOwnProperty(a, b);

  if (context.ctx.options.audit && prototypeAccess) {
    let prot: {} = Object.getPrototypeOf(a);
    do {
      if (hasOwnProperty(prot, b)) {
        if (
          context.ctx.auditReport &&
          !context.ctx.auditReport.prototypeAccess[prot.constructor.name]
        ) {
          context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
        }
        context.ctx.auditReport?.prototypeAccess[prot.constructor.name].add(b);
      }
    } while ((prot = Object.getPrototypeOf(prot)));
  }

  if (prototypeAccess) {
    if (typeof a === 'function') {
      if (hasOwnProperty(a, b)) {
        const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
        const replace = context.ctx.options.prototypeReplacements.get(a);
        if (replace) {
          done(undefined, new Prop(replace(a, true), b));
          return;
        }
        if (!(whitelist && (!whitelist.size || whitelist.has(b)))) {
          throw new SandboxAccessError(
            `Static method or property access not permitted: ${a.name}.${b.toString()}`,
          );
        }
      }
    }

    let prot: {} = a;
    while ((prot = Object.getPrototypeOf(prot))) {
      if (hasOwnProperty(prot, b)) {
        const whitelist = context.ctx.prototypeWhitelist.get(prot);
        const replace = context.ctx.options.prototypeReplacements.get(prot.constructor);
        if (replace) {
          done(undefined, new Prop(replace(a, false), b));
          return;
        }
        if (whitelist && (!whitelist.size || whitelist.has(b))) {
          break;
        }
        throw new SandboxAccessError(
          `Method or property access not permitted: ${prot.constructor.name}.${b.toString()}`,
        );
      }
    }
  }

  const e =
    typeof a[b as keyof typeof a] === 'function' && context.evals.get(a[b as keyof typeof a]);
  if (e) {
    done(
      undefined,
      new Prop(
        {
          [b]: e,
        },
        b,
        false,
        true,
        false,
      ),
    );
    return;
  }
  if (a[b as keyof typeof a] === globalThis) {
    done(
      undefined,
      new Prop(
        {
          [b]: context.ctx.sandboxGlobal,
        },
        b,
        false,
        false,
        false,
      ),
    );
    return;
  }

  const g =
    (obj instanceof Prop && obj.isGlobal) ||
    (typeof a === 'function' && !sandboxedFunctions.has(a)) ||
    context.ctx.globalsWhitelist.has(a);

  done(undefined, new Prop(a, b, false, g, false));
});

addOps<unknown, Lisp[], any>(LispType.Call, ({ done, a, b, obj, context }) => {
  if (context.ctx.options.forbidFunctionCalls)
    throw new SandboxCapabilityError('Function invocations are not allowed');
  if (typeof a !== 'function') {
    throw new TypeError(`${typeof obj.prop === 'symbol' ? 'Symbol' : obj.prop} is not a function`);
  }
  const vals = b
    .map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    })
    .flat()
    .map((item) => valueOrProp(item, context));

  if (typeof obj === 'function') {
    let ret = obj(...vals);
    if (ret instanceof Promise) {
      ret = checkHaltAsync(context, ret);
    }
    done(undefined, ret);
    return;
  }
  if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
    const cache = new Set<any>();
    const recurse = (x: unknown) => {
      if (!x || !(typeof x === 'object') || cache.has(x)) return;
      cache.add(x);
      for (const y of Object.keys(x) as (keyof typeof x)[]) {
        context.getSubscriptions.forEach((cb) => cb(x, y));
        recurse(x[y]);
      }
    };
    recurse(vals[0]);
  }

  if (
    obj.context instanceof Array &&
    arrayChange.has(obj.context[obj.prop]) &&
    (context.changeSubscriptions.get(obj.context) ||
      context.changeSubscriptionsGlobal.get(obj.context))
  ) {
    let change: Change;
    let changed = false;
    if (obj.prop === 'push') {
      change = {
        type: 'push',
        added: vals,
      };
      changed = !!vals.length;
    } else if (obj.prop === 'pop') {
      change = {
        type: 'pop',
        removed: obj.context.slice(-1),
      };
      changed = !!change.removed.length;
    } else if (obj.prop === 'shift') {
      change = {
        type: 'shift',
        removed: obj.context.slice(0, 1),
      };
      changed = !!change.removed.length;
    } else if (obj.prop === 'unshift') {
      change = {
        type: 'unshift',
        added: vals,
      };
      changed = !!vals.length;
    } else if (obj.prop === 'splice') {
      change = {
        type: 'splice',
        startIndex: vals[0],
        deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
        added: vals.slice(2),
        removed: obj.context.slice(vals[0], vals[1] === undefined ? undefined : vals[0] + vals[1]),
      };
      changed = !!change.added.length || !!change.removed.length;
    } else if (obj.prop === 'reverse' || obj.prop === 'sort') {
      change = { type: obj.prop };
      changed = !!obj.context.length;
    } else if (obj.prop === 'copyWithin') {
      const len =
        vals[2] === undefined
          ? obj.context.length - vals[1]
          : Math.min(obj.context.length, vals[2] - vals[1]);
      change = {
        type: 'copyWithin',
        startIndex: vals[0],
        endIndex: vals[0] + len,
        added: obj.context.slice(vals[1], vals[1] + len),
        removed: obj.context.slice(vals[0], vals[0] + len),
      };
      changed = !!change.added.length || !!change.removed.length;
    }
    if (changed) {
      context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb(change));
      context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb(change));
    }
  }
  obj.get(context);
  let ret = obj.context[obj.prop](...vals);
  if (typeof ret === 'function') {
    ret = context.evals.get(ret) || ret;
  }
  if (ret === globalThis) {
    ret = context.ctx.sandboxGlobal;
  }
  if (ret instanceof Promise) {
    ret = checkHaltAsync(context, ret);
  }
  done(undefined, ret);
});

addOps<unknown, KeyVal[]>(LispType.CreateObject, ({ done, b }) => {
  let res = {} as any;
  for (const item of b) {
    if (item.key instanceof SpreadObject) {
      res = { ...res, ...item.key.item };
    } else {
      res[item.key] = item.val;
    }
  }
  done(undefined, res);
});

addOps<string, LispItem>(LispType.KeyVal, ({ done, a, b }) => done(undefined, new KeyVal(a, b)));

addOps<unknown, Lisp[]>(LispType.CreateArray, ({ done, b, context }) => {
  const items = b
    .map((item) => {
      if (item instanceof SpreadArray) {
        return [...item.item];
      } else {
        return [item];
      }
    })
    .flat()
    .map((item) => valueOrProp(item, context));
  done(undefined, items);
});

addOps<unknown, unknown>(LispType.Group, ({ done, b }) => done(undefined, b));

addOps<unknown, string>(LispType.GlobalSymbol, ({ done, b }) => {
  switch (b) {
    case 'true':
      return done(undefined, true);
    case 'false':
      return done(undefined, false);
    case 'null':
      return done(undefined, null);
    case 'undefined':
      return done(undefined, undefined);
    case 'NaN':
      return done(undefined, NaN);
    case 'Infinity':
      return done(undefined, Infinity);
  }
  done(new Error('Unknown symbol: ' + b));
});

addOps<unknown, string>(LispType.Number, ({ done, b }) =>
  done(undefined, Number(b.replace(/_/g, ''))),
);
addOps<unknown, string>(LispType.BigInt, ({ done, b }) =>
  done(undefined, BigInt(b.replace(/_/g, ''))),
);
addOps<unknown, string>(LispType.StringIndex, ({ done, b, context }) =>
  done(undefined, context.constants.strings[parseInt(b)]),
);

addOps<unknown, string>(LispType.RegexIndex, ({ done, b, context }) => {
  const reg: IRegEx = context.constants.regexes[parseInt(b)];
  if (!context.ctx.globalsWhitelist.has(RegExp)) {
    throw new SandboxCapabilityError('Regex not permitted');
  } else {
    done(undefined, new RegExp(reg.regex, reg.flags));
  }
});

addOps<unknown, string>(LispType.LiteralIndex, ({ exec, done, ticks, b, context, scope }) => {
  const item = context.constants.literals[parseInt(b)];
  const [, name, js] = item;
  const found: Lisp[] = [];
  let f: RegExpExecArray | null;
  const resnums: string[] = [];
  while ((f = literalRegex.exec(name))) {
    if (!f[2]) {
      found.push(js[parseInt(f[3], 10)]);
      resnums.push(f[3]);
    }
  }

  exec<unknown[]>(ticks, found, scope, context, (err, processed) => {
    const reses: Record<string, unknown> = {};
    if (err) {
      done(err);
      return;
    }
    for (const i of Object.keys(processed!) as (keyof typeof processed)[]) {
      const num = resnums[i];
      reses[num] = processed![i];
    }
    done(
      undefined,
      name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
        if ($) return match;
        const res = reses[num];
        return ($$ ? $$ : '') + `${valueOrProp(res, context)}`;
      }),
    );
  });
});

addOps<unknown, unknown[]>(LispType.SpreadArray, ({ done, b }) => {
  done(undefined, new SpreadArray(b));
});

addOps<unknown, Record<string, unknown>>(LispType.SpreadObject, ({ done, b }) => {
  done(undefined, new SpreadObject(b));
});

addOps<unknown, unknown>(LispType.Not, ({ done, b }) => done(undefined, !b));
addOps<unknown, number>(LispType.Inverse, ({ done, b }) => done(undefined, ~b));

addOps<unknown, unknown, Prop<any>>(LispType.IncrementBefore, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, ++obj.context[obj.prop]);
});

addOps<unknown, unknown, Prop<any>>(LispType.IncrementAfter, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]++);
});

addOps<unknown, unknown, Prop<any>>(LispType.DecrementBefore, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, --obj.context[obj.prop]);
});

addOps<unknown, unknown, Prop<any>>(LispType.DecrementAfter, ({ done, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, obj.context[obj.prop]--);
});

addOps<unknown, unknown, Prop<any>, Prop<any>>(
  LispType.Assign,
  ({ done, b, obj, context, scope, bobj }) => {
    assignCheck(obj, context);
    obj.isGlobal = bobj?.isGlobal || false;
    if (obj.isVariable) {
      const s = scope.getWhereValScope(obj.prop as string, obj.prop === 'this');
      if (s === null) {
        throw new ReferenceError(`Cannot assign to undeclared variable '${obj.prop.toString()}'`);
      }
      s.set(obj.prop as string, b);
      if (obj.isGlobal) {
        s.globals[obj.prop.toString()] = true;
      } else {
        delete s.globals[obj.prop.toString()];
      }
      done(undefined, b);
      return;
    }
    done(undefined, (obj.context[obj.prop] = b));
  },
);

addOps<unknown, unknown, Prop<any>>(LispType.AddEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] += b));
});

addOps<unknown, number, Prop<any>>(LispType.SubractEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] -= b));
});

addOps<unknown, number, Prop<any>>(LispType.DivideEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] /= b));
});

addOps<unknown, number, Prop<any>>(LispType.MultiplyEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] *= b));
});

addOps<unknown, number, Prop<any>>(LispType.PowerEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] **= b));
});

addOps<unknown, number, Prop<any>>(LispType.ModulusEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] %= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitNegateEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] ^= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitAndEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] &= b));
});

addOps<unknown, number, Prop<any>>(LispType.BitOrEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] |= b));
});

addOps<unknown, number, Prop<any>>(LispType.ShiftLeftEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] <<= b));
});

addOps<unknown, number, Prop<any>>(LispType.ShiftRightEquals, ({ done, b, obj, context }) => {
  assignCheck(obj, context);
  done(undefined, (obj.context[obj.prop] >>= b));
});

addOps<unknown, number, Prop<any>>(
  LispType.UnsignedShiftRightEquals,
  ({ done, b, obj, context }) => {
    assignCheck(obj, context);
    done(undefined, (obj.context[obj.prop] >>>= b));
  },
);

addOps<number, number>(LispType.LargerThan, ({ done, a, b }) => done(undefined, a > b));
addOps<number, number>(LispType.SmallerThan, ({ done, a, b }) => done(undefined, a < b));
addOps<number, number>(LispType.LargerEqualThan, ({ done, a, b }) => done(undefined, a >= b));
addOps<number, number>(LispType.SmallerEqualThan, ({ done, a, b }) => done(undefined, a <= b));
addOps<number, number>(LispType.Equal, ({ done, a, b }) => done(undefined, a == b));
addOps<number, number>(LispType.StrictEqual, ({ done, a, b }) => done(undefined, a === b));
addOps<number, number>(LispType.NotEqual, ({ done, a, b }) => done(undefined, a != b));
addOps<number, number>(LispType.StrictNotEqual, ({ done, a, b }) => done(undefined, a !== b));
addOps<number, number>(LispType.And, ({ done, a, b }) => done(undefined, a && b));
addOps<number, number>(LispType.Or, ({ done, a, b }) => done(undefined, a || b));
addOps<number, number>(LispType.NullishCoalescing, ({ done, a, b }) => done(undefined, a ?? b));
addOps<number, number>(LispType.BitAnd, ({ done, a, b }) => done(undefined, a & b));
addOps<number, number>(LispType.BitOr, ({ done, a, b }) => done(undefined, a | b));
addOps<number, number>(LispType.Plus, ({ done, a, b }) => done(undefined, a + b));
addOps<number, number>(LispType.Minus, ({ done, a, b }) => done(undefined, a - b));
addOps<number, number>(LispType.Positive, ({ done, b }) => done(undefined, +b));
addOps<number, number>(LispType.Negative, ({ done, b }) => done(undefined, -b));
addOps<number, number>(LispType.Divide, ({ done, a, b }) => done(undefined, a / b));
addOps<number, number>(LispType.Power, ({ done, a, b }) => done(undefined, a ** b));
addOps<number, number>(LispType.BitNegate, ({ done, a, b }) => done(undefined, a ^ b));
addOps<number, number>(LispType.Multiply, ({ done, a, b }) => done(undefined, a * b));
addOps<number, number>(LispType.Modulus, ({ done, a, b }) => done(undefined, a % b));
addOps<number, number>(LispType.BitShiftLeft, ({ done, a, b }) => done(undefined, a << b));
addOps<number, number>(LispType.BitShiftRight, ({ done, a, b }) => done(undefined, a >> b));
addOps<number, number>(LispType.BitUnsignedShiftRight, ({ done, a, b }) =>
  done(undefined, a >>> b),
);
addOps<unknown, LispItem>(LispType.Typeof, ({ exec, done, ticks, b, context, scope }) => {
  exec(ticks, b, scope, context, (e, prop) => {
    done(undefined, typeof valueOrProp(prop, context));
  });
});

addOps<unknown, { new (): unknown }>(LispType.Instanceof, ({ done, a, b }) =>
  done(undefined, a instanceof b),
);
addOps<string, {}>(LispType.In, ({ done, a, b }) => done(undefined, a in b));

addOps<unknown, unknown>(LispType.Delete, ({ done, context, bobj }) => {
  if (!(bobj instanceof Prop)) {
    done(undefined, true);
    return;
  }
  assignCheck(bobj, context, 'delete');
  if (bobj.isVariable) {
    done(undefined, false);
    return;
  }
  done(undefined, delete (bobj.context as any)?.[bobj.prop]);
});

addOps(LispType.Return, ({ done, b }) => done(undefined, b));

addOps<string, unknown, unknown, Prop>(LispType.Var, ({ done, a, b, scope, bobj }) => {
  done(undefined, scope.declare(a, VarType.var, b, bobj?.isGlobal || false));
});

addOps<string, unknown, unknown, Prop>(LispType.Let, ({ done, a, b, scope, bobj }) => {
  done(undefined, scope.declare(a, VarType.let, b, bobj?.isGlobal || false));
});

addOps<string, unknown, unknown, Prop>(LispType.Const, ({ done, a, b, scope, bobj }) => {
  done(undefined, scope.declare(a, VarType.const, b, bobj?.isGlobal || false));
});

addOps<string[], Lisp[], Lisp>(
  LispType.ArrowFunction,
  ({ done, ticks, a, b, obj, context, scope }) => {
    a = [...a];
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    if (a.shift()) {
      done(undefined, createFunctionAsync(a, b, ticks, context, scope));
    } else {
      done(undefined, createFunction(a, b, ticks, context, scope));
    }
  },
);

addOps<(string | LispType)[], Lisp[], Lisp>(
  LispType.Function,
  ({ done, ticks, a, b, obj, context, scope }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const isAsync = a.shift();
    const name = a.shift() as string;
    let func;
    if (isAsync === LispType.True) {
      func = createFunctionAsync(a as string[], b, ticks, context, scope, name);
    } else {
      func = createFunction(a as string[], b, ticks, context, scope, name);
    }
    if (name) {
      scope.declare(name, VarType.var, func);
    }
    done(undefined, func);
  },
);

addOps<(string | LispType)[], Lisp[], Lisp>(
  LispType.InlineFunction,
  ({ done, ticks, a, b, obj, context, scope }) => {
    if (typeof obj[2] === 'string' || obj[2] instanceof CodeString) {
      if (context.allowJit && context.evalContext) {
        obj[2] = b = context.evalContext.lispifyFunction(new CodeString(obj[2]), context.constants);
      } else {
        throw new SandboxCapabilityError('Unevaluated code detected, JIT not allowed');
      }
    }
    const isAsync = a.shift();
    const name = a.shift() as string;
    if (name) {
      scope = new Scope(scope, {});
    }
    let func;
    if (isAsync === LispType.True) {
      func = createFunctionAsync(a as string[], b, ticks, context, scope, name);
    } else {
      func = createFunction(a as string[], b, ticks, context, scope, name);
    }
    if (name) {
      scope.declare(name, VarType.let, func);
    }
    done(undefined, func);
  },
);

addOps<Lisp[], Lisp[]>(LispType.Loop, ({ exec, done, ticks, a, b, context, scope }) => {
  const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep] = a;
  let loop = true;
  const loopScope = new Scope(scope, {});
  const internalVars = {
    $$obj: undefined,
  };
  const interalScope = new Scope(loopScope, internalVars);
  if (exec === execAsync) {
    (async () => {
      let ad: AsyncDoneRet;
      ad = asyncDone((d) => exec(ticks, startStep, loopScope, context, d));
      internalVars['$$obj'] =
        (ad = asyncDone((d) => exec(ticks, getIterator, loopScope, context, d))).isInstant === true
          ? ad.instant
          : (await ad.p).result;
      ad = asyncDone((d) => exec(ticks, startInternal, interalScope, context, d));
      if (checkFirst)
        loop =
          (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant ===
          true
            ? ad.instant
            : (await ad.p).result;
      while (loop) {
        const innerLoopVars = {};
        ad = asyncDone((d) =>
          exec(ticks, beforeStep, new Scope(interalScope, innerLoopVars), context, d),
        );
        ad.isInstant === true ? ad.instant : (await ad.p).result;
        const res = await executeTreeAsync(
          ticks,
          context,
          b,
          [new Scope(loopScope, innerLoopVars)],
          'loop',
        );
        if (res instanceof ExecReturn && res.returned) {
          done(undefined, res);
          return;
        }
        if (res instanceof ExecReturn && res.breakLoop) {
          break;
        }
        ad = asyncDone((d) => exec(ticks, step, interalScope, context, d));
        loop =
          (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant ===
          true
            ? ad.instant
            : (await ad.p).result;
      }
      done();
    })().catch(done);
  } else {
    syncDone((d) => exec(ticks, startStep, loopScope, context, d));
    internalVars['$$obj'] = syncDone((d) => exec(ticks, getIterator, loopScope, context, d)).result;
    syncDone((d) => exec(ticks, startInternal, interalScope, context, d));
    if (checkFirst) loop = syncDone((d) => exec(ticks, condition, interalScope, context, d)).result;
    while (loop) {
      const innerLoopVars = {};
      syncDone((d) => exec(ticks, beforeStep, new Scope(interalScope, innerLoopVars), context, d));
      const res = executeTree(ticks, context, b, [new Scope(loopScope, innerLoopVars)], 'loop');
      if (res instanceof ExecReturn && res.returned) {
        done(undefined, res);
        return;
      }
      if (res instanceof ExecReturn && res.breakLoop) {
        break;
      }
      syncDone((d) => exec(ticks, step, interalScope, context, d));
      loop = syncDone((d) => exec(ticks, condition, interalScope, context, d)).result;
    }
    done();
  }
});

addOps<LispItem, LispItem>(LispType.LoopAction, ({ done, a, context, inLoopOrSwitch }) => {
  if ((inLoopOrSwitch === 'switch' && a === 'continue') || !inLoopOrSwitch) {
    throw new TypeError('Illegal ' + a + ' statement');
  }
  done(
    undefined,
    new ExecReturn(context.ctx.auditReport, undefined, false, a === 'break', a === 'continue'),
  );
});

addOps<LispItem, If>(LispType.If, ({ exec, done, ticks, a, b, context, scope, inLoopOrSwitch }) => {
  exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done, inLoopOrSwitch);
});

addOps<LispItem, If>(LispType.InlineIf, ({ exec, done, ticks, a, b, context, scope }) => {
  exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done, undefined);
});

addOps<Lisp, Lisp>(LispType.InlineIfCase, ({ done, a, b }) => done(undefined, new If(a, b)));
addOps<Lisp, Lisp>(LispType.IfCase, ({ done, a, b }) => done(undefined, new If(a, b)));

addOps<LispItem, SwitchCase[]>(LispType.Switch, ({ exec, done, ticks, a, b, context, scope }) => {
  exec(ticks, a, scope, context, (err, toTest) => {
    if (err) {
      done(err);
      return;
    }
    toTest = valueOrProp(toTest, context);
    if (exec === execSync) {
      let res: ExecReturn<unknown>;
      let isTrue = false;
      for (const caseItem of b) {
        if (
          isTrue ||
          (isTrue =
            !caseItem[1] ||
            toTest ===
              valueOrProp(
                syncDone((d) => exec(ticks, caseItem[1], scope, context, d)).result,
                context,
              ))
        ) {
          if (!caseItem[2]) continue;
          res = executeTree(ticks, context, caseItem[2], [scope], 'switch');
          if (res.breakLoop) break;
          if (res.returned) {
            done(undefined, res);
            return;
          }
          if (!caseItem[1]) {
            // default case
            break;
          }
        }
      }
      done();
    } else {
      (async () => {
        let res: ExecReturn<unknown>;
        let isTrue = false;
        for (const caseItem of b) {
          let ad: AsyncDoneRet;
          if (
            isTrue ||
            (isTrue =
              !caseItem[1] ||
              toTest ===
                valueOrProp(
                  (ad = asyncDone((d) => exec(ticks, caseItem[1], scope, context, d))).isInstant ===
                    true
                    ? ad.instant
                    : (await ad.p).result,
                  context,
                ))
          ) {
            if (!caseItem[2]) continue;
            res = await executeTreeAsync(ticks, context, caseItem[2], [scope], 'switch');
            if (res.breakLoop) break;
            if (res.returned) {
              done(undefined, res);
              return;
            }
            if (!caseItem[1]) {
              // default case
              break;
            }
          }
        }
        done();
      })().catch(done);
    }
  });
});

addOps<Lisp[], [string, Lisp[], Lisp[]]>(
  LispType.Try,
  ({ exec, done, ticks, a, b, context, scope, inLoopOrSwitch }) => {
    const [exception, catchBody, finallyBody] = b;
    executeTreeWithDone(
      exec,
      (err, res) => {
        executeTreeWithDone(
          exec,
          (e) => {
            if (e) done(e);
            else if (err) {
              const sc: Record<string, unknown> = {};
              if (exception) sc[exception] = err;
              executeTreeWithDone(
                exec,
                done,
                ticks,
                context,
                catchBody,
                [new Scope(scope)],
                inLoopOrSwitch,
              );
            } else {
              done(undefined, res);
            }
          },
          ticks,
          context,
          finallyBody,
          [new Scope(scope, {})],
        );
      },
      ticks,
      context,
      a,
      [new Scope(scope)],
      inLoopOrSwitch,
    );
  },
);

addOps(LispType.Void, ({ done }) => {
  done();
});
addOps<new (...args: unknown[]) => unknown, unknown[]>(LispType.New, ({ done, a, b, context }) => {
  if (!context.ctx.globalsWhitelist.has(a) && !sandboxedFunctions.has(a)) {
    throw new SandboxAccessError(`Object construction not allowed: ${a.constructor.name}`);
  }
  done(undefined, new a(...b));
});

addOps(LispType.Throw, ({ done, b }) => {
  done(b);
});
addOps<unknown[]>(LispType.Expression, ({ done, a }) => done(undefined, a.pop()));
addOps(LispType.None, ({ done }) => done());

function valueOrProp(a: unknown, context: IExecContext): any {
  if (a instanceof Prop) return a.get(context);
  if (a === optional) return undefined;
  return a;
}

export function execMany(
  ticks: Ticks,
  exec: Execution,
  tree: Lisp[],
  done: Done,
  scope: Scope,
  context: IExecContext,
  inLoopOrSwitch?: string,
) {
  if (exec === execSync) {
    _execManySync(ticks, tree, done, scope, context, inLoopOrSwitch);
  } else {
    _execManyAsync(ticks, tree, done, scope, context, inLoopOrSwitch).catch(done);
  }
}

function _execManySync(
  ticks: Ticks,
  tree: Lisp[],
  done: Done,
  scope: Scope,
  context: IExecContext,
  inLoopOrSwitch?: string,
) {
  const ret: any[] = [];
  for (let i = 0; i < tree.length; i++) {
    let res;
    try {
      res = syncDone((d) => execSync(ticks, tree[i], scope, context, d, inLoopOrSwitch)).result;
    } catch (e) {
      done(e);
      return;
    }
    if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
      done(undefined, res);
      return;
    }
    if (isLisp(tree[i]) && tree[i][0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
    ret.push(res);
  }
  done(undefined, ret);
}

async function _execManyAsync(
  ticks: Ticks,
  tree: Lisp[],
  done: Done,
  scope: Scope,
  context: IExecContext,
  inLoopOrSwitch?: string,
) {
  const ret: any[] = [];
  for (let i = 0; i < tree.length; i++) {
    let res;
    try {
      let ad: AsyncDoneRet;
      res =
        (ad = asyncDone((d) => execAsync(ticks, tree[i], scope, context, d, inLoopOrSwitch)))
          .isInstant === true
          ? ad.instant
          : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
      done(undefined, res);
      return;
    }
    if (isLisp(tree[i]) && tree[i][0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
    ret.push(res);
  }
  done(undefined, ret);
}

type Execution = <T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  inLoopOrSwitch?: string,
) => void;

export interface AsyncDoneRet {
  isInstant: boolean;
  instant: any;
  p: Promise<{ result: any }>;
}

export function asyncDone(callback: (done: Done) => void): AsyncDoneRet {
  let isInstant = false;
  let instant: unknown;
  const p = new Promise<any>((resolve, reject) => {
    callback((err, result) => {
      if (err) reject(err);
      else {
        isInstant = true;
        instant = result;
        resolve({ result });
      }
    });
  });
  return {
    isInstant,
    instant,
    p,
  };
}

export function syncDone(callback: (done: Done) => void): { result: any } {
  let result;
  let err;
  callback((e, r) => {
    err = e;
    result = r;
  });
  if (err) throw err;
  return { result };
}

export async function execAsync<T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  doneOriginal: Done<T>,
  inLoopOrSwitch?: string,
): Promise<void> {
  let done: Done<T> = doneOriginal;
  const p = new Promise<void>((resolve) => {
    done = (e, r?) => {
      doneOriginal(e, r);
      resolve();
    };
  });
  if (!_execNoneRecurse(ticks, tree, scope, context, done, true, inLoopOrSwitch) && isLisp(tree)) {
    let op = tree[0];
    let obj;
    try {
      let ad: AsyncDoneRet;
      obj =
        (ad = asyncDone((d) => execAsync(ticks, tree[1], scope, context, d, inLoopOrSwitch)))
          .isInstant === true
          ? ad.instant
          : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    let a = obj;
    try {
      a = obj instanceof Prop ? obj.get(context) : obj;
    } catch (e) {
      done(e);
      return;
    }
    if (op === LispType.PropOptional || op === LispType.CallOptional) {
      if (a === undefined || a === null) {
        done(undefined, optional);
        return;
      }
      op = op === LispType.PropOptional ? LispType.Prop : LispType.Call;
    }
    if (a === optional) {
      if (op === LispType.Prop || op === LispType.Call) {
        done(undefined, a);
        return;
      } else {
        a = undefined;
      }
    }
    // Short-circuit for nullish coalescing: if a is not null/undefined, return a without evaluating b
    if (op === LispType.NullishCoalescing && a !== undefined && a !== null) {
      done(undefined, a);
      return;
    }
    let bobj;
    try {
      let ad: AsyncDoneRet;
      bobj =
        (ad = asyncDone((d) => execAsync(ticks, tree[2], scope, context, d, inLoopOrSwitch)))
          .isInstant === true
          ? ad.instant
          : (await ad.p).result;
    } catch (e) {
      done(e);
      return;
    }
    let b = bobj;
    try {
      b = bobj instanceof Prop ? bobj.get(context) : bobj;
    } catch (e) {
      done(e);
      return;
    }
    if (b === optional) {
      b = undefined;
    }
    performOp({
      op,
      exec: execAsync,
      done,
      ticks,
      a,
      b,
      obj,
      context,
      scope,
      bobj,
      inLoopOrSwitch,
      tree,
    });
  }
  await p;
}

export function execSync<T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  inLoopOrSwitch?: string,
) {
  if (!_execNoneRecurse(ticks, tree, scope, context, done, false, inLoopOrSwitch) && isLisp(tree)) {
    let op = tree[0];
    let obj;
    try {
      obj = syncDone((d) => execSync(ticks, tree[1], scope, context, d, inLoopOrSwitch)).result;
    } catch (e) {
      done(e);
      return;
    }
    let a = obj;
    try {
      a = obj instanceof Prop ? obj.get(context) : obj;
    } catch (e) {
      done(e);
      return;
    }
    if (op === LispType.PropOptional || op === LispType.CallOptional) {
      if (a === undefined || a === null) {
        done(undefined, optional);
        return;
      }
      op = op === LispType.PropOptional ? LispType.Prop : LispType.Call;
    }
    if (a === optional) {
      if (op === LispType.Prop || op === LispType.Call) {
        done(undefined, a);
        return;
      } else {
        a = undefined;
      }
    }
    // Short-circuit for nullish coalescing: if a is not null/undefined, return a without evaluating b
    if (op === LispType.NullishCoalescing && a !== undefined && a !== null) {
      done(undefined, a);
      return;
    }
    let bobj;
    try {
      bobj = syncDone((d) => execSync(ticks, tree[2], scope, context, d, inLoopOrSwitch)).result;
    } catch (e) {
      done(e);
      return;
    }
    let b = bobj;
    try {
      b = bobj instanceof Prop ? bobj.get(context) : bobj;
    } catch (e) {
      done(e);
      return;
    }
    if (b === optional) {
      b = undefined;
    }
    performOp({
      op,
      exec: execSync,
      done,
      ticks,
      a,
      b,
      obj,
      context,
      scope,
      bobj,
      inLoopOrSwitch,
      tree,
    });
  }
}

async function checkHaltAsync(context: IExecContext, promise: unknown) {
  if (!(promise instanceof Promise)) return promise;
  let done = false;
  let halted = context.ctx.sandbox.halted;
  let doResolve = () => {};
  let subres: { unsubscribe: () => void };
  let subhalt: { unsubscribe: () => void };
  const interupted = new Promise<void>((resolve) => {
    doResolve = () => {
      subhalt.unsubscribe();
      subres.unsubscribe();
      resolve();
    };
    subhalt = context.ctx.sandbox.subscribeHalt(() => {
      halted = true;
    });

    subres = context.ctx.sandbox.subscribeResume(() => {
      halted = false;
      if (done) doResolve();
    });
  });
  promise.finally(() => {
    done = true;
    if (!halted) {
      doResolve();
    }
  });
  await Promise.allSettled([promise, interupted]);
  return promise;
}

type OpsCallbackParams<a, b, obj, bobj> = {
  op: LispType;
  exec: Execution;
  a: a;
  b: b;
  obj: obj;
  bobj: bobj;
  ticks: Ticks;
  tree: LispItem;
  scope: Scope;
  context: IExecContext;
  done: Done;
  inLoopOrSwitch?: string;
};

function checkHaltExpectedTicks(
  params: OpsCallbackParams<any, any, any, any>,
  expectTicks = 0,
): boolean {
  const sandbox = params.context.ctx.sandbox;
  const options = params.context.ctx.options;
  const { ticks, scope, context, done, op } = params;
  if (sandbox.halted) {
    const sub = sandbox.subscribeResume(() => {
      sub.unsubscribe();
      try {
        const o = ops.get(op);
        if (!o) {
          done(new SyntaxError('Unknown operator: ' + op));
          return;
        }
        o(params);
      } catch (err) {
        if (options.haltOnSandboxError && err instanceof SandboxError) {
          const sub = sandbox.subscribeResume(() => {
            sub.unsubscribe();
            done(err);
          });
          sandbox.haltExecution({
            error: err as Error,
            ticks,
            scope,
            context,
          });
        } else {
          done(err);
        }
      }
    });
    return true;
  } else if (ticks.tickLimit && ticks.tickLimit <= ticks.ticks + BigInt(expectTicks)) {
    const sub = sandbox.subscribeResume(() => {
      sub.unsubscribe();
      try {
        const o = ops.get(op);
        if (!o) {
          done(new SyntaxError('Unknown operator: ' + op));
          return;
        }
        o(params);
      } catch (err) {
        if (context.ctx.options.haltOnSandboxError && err instanceof SandboxError) {
          const sub = sandbox.subscribeResume(() => {
            sub.unsubscribe();
            done(err);
          });
          sandbox.haltExecution({
            error: err as Error,
            ticks,
            scope,
            context,
          });
        } else {
          done(err);
        }
      }
    });
    const error = new SandboxExecutionQuotaExceededError('Execution quota exceeded');
    sandbox.haltExecution({
      error,
      ticks,
      scope: scope,
      context,
    });
    return true;
  }
  return false;
}

function performOp(params: OpsCallbackParams<any, any, any, any>) {
  const { done, op, ticks, context, scope } = params;
  ticks.ticks++;
  const sandbox = context.ctx.sandbox;

  if (checkHaltExpectedTicks(params)) {
    return;
  }

  try {
    const o = ops.get(op);
    if (!o) {
      done(new SandboxExecutionTreeError('Unknown operator: ' + op));
      return;
    }
    o(params);
  } catch (err) {
    if (context.ctx.options.haltOnSandboxError && err instanceof SandboxError) {
      const sub = sandbox.subscribeResume(() => {
        sub.unsubscribe();
        done(err);
      });
      sandbox.haltExecution({
        error: err as Error,
        ticks,
        scope,
        context,
      });
    } else {
      done(err);
    }
  }
}

const unexecTypes = new Set([
  LispType.ArrowFunction,
  LispType.Function,
  LispType.InlineFunction,
  LispType.Loop,
  LispType.Try,
  LispType.Switch,
  LispType.IfCase,
  LispType.InlineIfCase,
  LispType.Typeof,
]);

export const currentTicks = { current: { ticks: BigInt(0) } as Ticks };

function _execNoneRecurse<T = any>(
  ticks: Ticks,
  tree: LispItem,
  scope: Scope,
  context: IExecContext,
  done: Done<T>,
  isAsync: boolean,
  inLoopOrSwitch?: string,
): boolean {
  const exec = isAsync ? execAsync : execSync;
  currentTicks.current = ticks;
  if (tree instanceof Prop) {
    try {
      done(undefined, tree.get(context));
    } catch (err) {
      done(err);
    }
  } else if (tree === optional) {
    done();
  } else if (Array.isArray(tree) && !isLisp(tree)) {
    if (tree[0] === LispType.None) {
      done();
    } else {
      execMany(ticks, exec, tree as Lisp[], done, scope, context, inLoopOrSwitch);
    }
  } else if (!isLisp(tree)) {
    done(undefined, tree);
  } else if (tree[0] === LispType.Block) {
    execMany(ticks, exec, tree[1] as Lisp[], done, scope, context, inLoopOrSwitch);
  } else if (tree[0] === LispType.Await) {
    if (!isAsync) {
      done(new SyntaxError("Illegal use of 'await', must be inside async function"));
    } else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
      execAsync(
        ticks,
        tree[1],
        scope,
        context,
        async (e, r) => {
          if (e) done(e);
          else
            try {
              done(undefined, await valueOrProp(r, context));
            } catch (err) {
              done(err);
            }
        },
        inLoopOrSwitch,
      ).catch(done);
    } else {
      done(new SandboxCapabilityError('Async/await is not permitted'));
    }
  } else if (unexecTypes.has(tree[0])) {
    performOp({
      op: tree[0],
      exec,
      done,
      ticks,
      a: tree[1],
      b: tree[2],
      obj: tree,
      tree,
      context,
      scope,
      bobj: undefined,
      inLoopOrSwitch,
    });
  } else {
    return false;
  }
  return true;
}
export function executeTree<T>(
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scopes: IScope[] = [],
  inLoopOrSwitch?: string,
): ExecReturn<T> {
  return syncDone((done) =>
    executeTreeWithDone(execSync, done, ticks, context, executionTree, scopes, inLoopOrSwitch),
  ).result;
}

export async function executeTreeAsync<T>(
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scopes: IScope[] = [],
  inLoopOrSwitch?: string,
): Promise<ExecReturn<T>> {
  let ad: AsyncDoneRet;
  return (ad = asyncDone((done) =>
    executeTreeWithDone(execAsync, done, ticks, context, executionTree, scopes, inLoopOrSwitch),
  )).isInstant === true
    ? ad.instant
    : (await ad.p).result;
}

function executeTreeWithDone(
  exec: Execution,
  done: Done,
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scopes: IScope[] = [],
  inLoopOrSwitch?: string,
) {
  if (!executionTree) {
    done();
    return;
  }
  if (!(executionTree instanceof Array)) {
    throw new SyntaxError('Bad execution tree');
  }
  let scope = context.ctx.globalScope;
  let s;
  while ((s = scopes.shift())) {
    if (typeof s !== 'object') continue;
    if (s instanceof Scope) {
      scope = s;
    } else {
      scope = new Scope(scope, s, s instanceof LocalScope ? undefined : null);
    }
  }
  if (context.ctx.options.audit && !context.ctx.auditReport) {
    context.ctx.auditReport = {
      globalsAccess: new Set(),
      prototypeAccess: {},
    };
  }
  if (exec === execSync) {
    _executeWithDoneSync(done, ticks, context, executionTree, scope, inLoopOrSwitch);
  } else {
    _executeWithDoneAsync(done, ticks, context, executionTree, scope, inLoopOrSwitch).catch(done);
  }
}

function _executeWithDoneSync(
  done: Done,
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scope: Scope,
  inLoopOrSwitch?: string,
) {
  if (!(executionTree instanceof Array)) throw new SyntaxError('Bad execution tree');
  let i = 0;
  for (i = 0; i < executionTree.length; i++) {
    let res: unknown;
    let err: unknown;
    const current = executionTree[i];
    try {
      execSync(
        ticks,
        current,
        scope,
        context,
        (e, r) => {
          err = e;
          res = r;
        },
        inLoopOrSwitch,
      );
    } catch (e) {
      err = e;
    }
    if (err) {
      done(err);
      return;
    }
    if (res instanceof ExecReturn) {
      done(undefined, res);
      return;
    }
    if (isLisp(current) && current[0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}

async function _executeWithDoneAsync(
  done: Done,
  ticks: Ticks,
  context: IExecContext,
  executionTree: Lisp[],
  scope: Scope,
  inLoopOrSwitch?: string,
) {
  if (!(executionTree instanceof Array)) throw new SyntaxError('Bad execution tree');
  let i = 0;
  for (i = 0; i < executionTree.length; i++) {
    let res: unknown;
    let err: unknown;
    const current = executionTree[i];
    try {
      await execAsync(
        ticks,
        current,
        scope,
        context,
        (e, r) => {
          err = e;
          res = r;
        },
        inLoopOrSwitch,
      );
    } catch (e) {
      err = e;
    }
    if (err) {
      done(err);
      return;
    }
    if (res instanceof ExecReturn) {
      done(undefined, res);
      return;
    }
    if (isLisp(current) && current[0] === LispType.Return) {
      done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
      return;
    }
  }
  done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}
