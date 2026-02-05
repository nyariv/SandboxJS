// Reusable AsyncFunction constructor reference
export const AsyncFunction: Function = Object.getPrototypeOf(async function () {}).constructor;
export const GeneratorFunction: Function = Object.getPrototypeOf(function* () {}).constructor;
export const AsyncGeneratorFunction: Function = Object.getPrototypeOf(async function* () {}).constructor;

import { IEvalContext } from './eval';
import { Change, Unknown } from './executor';
import { IConstants, IExecutionTree, Lisp, LispItem } from './parser';
import SandboxExec from './SandboxExec';

export type replacementCallback = (obj: any, isStaticAccess: boolean) => any;

export interface IOptionParams {
  audit?: boolean;
  forbidFunctionCalls?: boolean;
  forbidFunctionCreation?: boolean;
  prototypeReplacements?: Map<new () => any, replacementCallback>;
  prototypeWhitelist?: Map<any, Set<string>>;
  globals: IGlobals;
  executionQuota?: bigint;
}

export interface IOptions {
  audit: boolean;
  forbidFunctionCalls: boolean;
  forbidFunctionCreation: boolean;
  prototypeReplacements: Map<Function, replacementCallback>;
  prototypeWhitelist: Map<any, Set<string>>;
  globals: IGlobals;
  executionQuota?: bigint;
}

export interface IContext {
  sandbox: SandboxExec;
  globalScope: Scope;
  sandboxGlobal: ISandboxGlobal;
  globalsWhitelist: Set<any>;
  prototypeWhitelist: Map<any, Set<PropertyKey>>;
  options: IOptions;
  auditReport?: IAuditReport;
}

export interface IAuditReport {
  globalsAccess: Set<unknown>;
  prototypeAccess: { [name: string]: Set<PropertyKey> };
}

export interface Ticks {
  ticks: bigint;
  tickLimit?: bigint;
}

export type SubscriptionSubject = object;

export interface IExecContext extends IExecutionTree {
  ctx: IContext;
  ticks: Ticks;
  getSubscriptions: Set<(obj: SubscriptionSubject, name: string) => void>;
  setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
  changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
  setSubscriptionsGlobal: WeakMap<
    SubscriptionSubject,
    Map<string, Set<(modification: Change) => void>>
  >;
  changeSubscriptionsGlobal: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
  registerSandboxFunction: (fn: (...args: any[]) => any) => void;
  evals: Map<any, any>;
  allowJit: boolean;
  evalContext?: IEvalContext;
}

export interface ISandboxGlobal {
  [key: string]: unknown;
}
interface SandboxGlobalConstructor {
  new (globals: IGlobals): ISandboxGlobal;
}

export const SandboxGlobal = function SandboxGlobal(this: ISandboxGlobal, globals: IGlobals) {
  for (const i in globals) {
    this[i] = globals[i];
  }
} as any as SandboxGlobalConstructor;

export type IGlobals = ISandboxGlobal;

export class ExecContext implements IExecContext {
  ticks: Ticks = { ticks: BigInt(0) };
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
    public evalContext?: IEvalContext
  ) {
    this.ticks.tickLimit = ctx.options.executionQuota;
  }
}

export function createContext(sandbox: SandboxExec, options: IOptions): IContext {
  const sandboxGlobal = new SandboxGlobal(options.globals);
  const context: IContext = {
    sandbox: sandbox,
    globalsWhitelist: new Set(Object.values(options.globals)),
    prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
    options,
    globalScope: new Scope(null, options.globals, sandboxGlobal),
    sandboxGlobal,
  };
  context.prototypeWhitelist.set(Object.getPrototypeOf([][Symbol.iterator]()) as Object, new Set());
  return context;
}

export function createExecContext(
  sandbox: {
    setSubscriptions: WeakMap<
      SubscriptionSubject,
      Map<string, Set<(modification: Change) => void>>
    >;
    changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
    context: IContext;
  },
  executionTree: IExecutionTree,
  evalContext?: IEvalContext
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
    evalContext
  );
  if (evalContext) {
    const func = evalContext.sandboxFunction(execContext);
    const asyncFunc = evalContext.sandboxAsyncFunction(execContext);
    evals.set(Function, func);
    evals.set(AsyncFunction, asyncFunc);
    evals.set(GeneratorFunction, func);
    evals.set(AsyncGeneratorFunction, asyncFunc);
    evals.set(eval, evalContext.sandboxedEval(func));
    evals.set(setTimeout, evalContext.sandboxedSetTimeout(func, execContext));
    evals.set(setInterval, evalContext.sandboxedSetInterval(func, execContext));
    evals.set(clearTimeout, evalContext.sandboxedClearTimeout(execContext));
    evals.set(clearInterval, evalContext.sandboxedClearInterval(execContext));

    for (const [key, value] of evals) {
      sandbox.context.prototypeWhitelist.set(value.prototype, new Set());
      sandbox.context.prototypeWhitelist.set(key.prototype, new Set());
    }

  }
  return execContext;
}

export class CodeString {
  start: number;
  end: number;
  ref: { str: string };
  constructor(str: string | CodeString) {
    this.ref = { str: '' };
    if (str instanceof CodeString) {
      this.ref = str.ref;
      this.start = str.start;
      this.end = str.end;
    } else {
      this.ref.str = str;
      this.start = 0;
      this.end = str.length;
    }
  }

  substring(start: number, end?: number): CodeString {
    if (!this.length) return this;
    start = this.start + start;
    if (start < 0) {
      start = 0;
    }
    if (start > this.end) {
      start = this.end;
    }
    end = end === undefined ? this.end : this.start + end;
    if (end < 0) {
      end = 0;
    }
    if (end > this.end) {
      end = this.end;
    }
    const code = new CodeString(this);
    code.start = start;
    code.end = end;
    return code;
  }

  get length() {
    const len = this.end - this.start;
    return len < 0 ? 0 : len;
  }

  char(i: number) {
    if (this.start === this.end) return undefined;
    return this.ref.str[this.start + i];
  }

  toString() {
    return this.ref.str.substring(this.start, this.end);
  }

  trimStart() {
    const found = /^\s+/.exec(this.toString());
    const code = new CodeString(this);
    if (found) {
      code.start += found[0].length;
    }
    return code;
  }

  slice(start: number, end?: number) {
    if (start < 0) {
      start = this.end - this.start + start;
    }
    if (start < 0) {
      start = 0;
    }
    if (end === undefined) {
      end = this.end - this.start;
    }

    if (end < 0) {
      end = this.end - this.start + end;
    }
    if (end < 0) {
      end = 0;
    }
    return this.substring(start, end);
  }

  trim() {
    const code = this.trimStart();
    const found = /\s+$/.exec(code.toString());
    if (found) {
      code.end -= found[0].length;
    }
    return code;
  }

  valueOf() {
    return this.toString();
  }
}

function keysOnly(obj: unknown): Record<string, true> {
  const ret: Record<string, true> = Object.assign({}, obj);
  for (const key in ret) {
    ret[key] = true;
  }
  return ret;
}

export const reservedWords = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
]);

export const enum VarType {
  let = 'let',
  const = 'const',
  var = 'var',
}

export class Scope {
  parent: Scope | null;
  const: { [key: string]: true } = {};
  let: { [key: string]: true } = {};
  var: { [key: string]: true } = {};
  globals: { [key: string]: true };
  allVars: { [key: string]: unknown } & Object;
  functionThis?: Unknown;
  constructor(parent: Scope | null, vars = {}, functionThis?: Unknown) {
    const isFuncScope = functionThis !== undefined || parent === null;
    this.parent = parent;
    this.allVars = vars;
    this.let = isFuncScope ? this.let : keysOnly(vars);
    this.var = isFuncScope ? keysOnly(vars) : this.var;
    this.globals = parent === null ? keysOnly(vars) : {};
    this.functionThis = functionThis;
  }

  get(key: string): Prop {
    const isThis = key === 'this';
    const scope = this.getWhereValScope(key, isThis);
    if (scope && isThis) {
      return new Prop({ this: scope.functionThis }, key, true, false, true);
    }
    if (!scope) {
      return new Prop(undefined, key);
    }
    return new Prop(scope.allVars, key, key in scope.const, key in scope.globals, true);
  }

  set(key: string, val: unknown) {
    if (key === 'this') throw new SyntaxError('"this" cannot be assigned');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    const prop = this.get(key);
    if (prop.context === undefined) {
      throw new ReferenceError(`Variable '${key}' was not declared.`);
    }
    if (prop.context === null) {
      throw new TypeError(`Cannot set properties of null, (setting '${key}')`);
    }
    if (prop.isConst) {
      throw new TypeError(`Cannot assign to const variable '${key}'`);
    }
    if (prop.isGlobal) {
      throw new SandboxError(`Cannot override global variable '${key}'`);
    }
    (prop.context as any)[prop.prop] = val;
    return prop;
  }

  getWhereValScope(key: string, isThis = false): Scope|null {
    if (isThis) {
      if (this.functionThis !== undefined) {
        return this;
      } else {
        return this.parent?.getWhereValScope(key, isThis) || null;
      }
    }
    if (key in this.allVars) {
      return this;
    }
    return this.parent?.getWhereValScope(key, isThis) || null;
  }

  getWhereVarScope(key: string, localScope = false): Scope {
    if (key in this.allVars) {
      return this;
    }
    if (this.parent === null || localScope || this.functionThis !== undefined) {
      return this;
    }
    return this.parent.getWhereVarScope(key, localScope);
  }

  declare(key: string, type: VarType, value: unknown = undefined, isGlobal = false): Prop {
    if (key === 'this') throw new SyntaxError('"this" cannot be declared');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    const existingScope = this.getWhereVarScope(key, type !== VarType.var);
    if (type === VarType.var) {
      if(existingScope.var[key]) {
        existingScope.allVars[key] = value;
        if (!isGlobal) {
          delete existingScope.globals[key];
        } else {
          existingScope.globals[key] = true;
        }
        return new Prop(existingScope.allVars, key, false, existingScope.globals[key], true);
      } else if (key in existingScope.allVars) {
        throw new SyntaxError(`Identifier '${key}' has already been declared`);
      }
    }
    if (key in existingScope.allVars) {
      throw new SyntaxError(`Identifier '${key}' has already been declared`);
    }

    if (isGlobal) {
      existingScope.globals[key] = true;
    }
    existingScope[type][key] = true;
    existingScope.allVars[key] = value;

    return new Prop(this.allVars, key, type === VarType.const, isGlobal, true);
  }
}

export interface IScope {
  [key: string]: any;
}

export class FunctionScope implements IScope {}

export class LocalScope implements IScope {}

export class SandboxError extends Error {}

export class SandboxCriticalError extends SandboxError {}

export function isLisp<Type extends Lisp = Lisp>(item: LispItem | LispItem): item is Type {
  return (
    Array.isArray(item) &&
    typeof item[0] === 'number' &&
    item[0] !== LispType.None &&
    item[0] !== LispType.True
  );
}

export const enum LispType {
  None,
  Prop,
  StringIndex,
  Let,
  Const,
  Call,
  KeyVal,
  Number,
  Return,
  Assign,
  InlineFunction,
  ArrowFunction,
  CreateArray,
  If,
  IfCase,
  InlineIf,
  InlineIfCase,
  SpreadObject,
  SpreadArray,
  ArrayProp,
  PropOptional,
  CallOptional,
  CreateObject,
  Group,
  Not,
  IncrementBefore,
  IncrementAfter,
  DecrementBefore,
  DecrementAfter,
  And,
  Or,
  StrictNotEqual,
  StrictEqual,
  Plus,
  Var,
  GlobalSymbol,
  Literal,
  Function,
  Loop,
  Try,
  Switch,
  SwitchCase,
  Block,
  Expression,
  Await,
  New,
  Throw,
  Minus,
  Divide,
  Power,
  Multiply,
  Modulus,
  Equal,
  NotEqual,
  SmallerEqualThan,
  LargerEqualThan,
  SmallerThan,
  LargerThan,
  Negative,
  Positive,
  Typeof,
  Delete,
  Instanceof,
  In,
  Inverse,
  SubractEquals,
  AddEquals,
  DivideEquals,
  PowerEquals,
  MultiplyEquals,
  ModulusEquals,
  BitNegateEquals,
  BitAndEquals,
  BitOrEquals,
  UnsignedShiftRightEquals,
  ShiftRightEquals,
  ShiftLeftEquals,
  BitAnd,
  BitOr,
  BitNegate,
  BitShiftLeft,
  BitShiftRight,
  BitUnsignedShiftRight,
  BigInt,
  LiteralIndex,
  RegexIndex,
  LoopAction,
  Void,
  True,
  NullishCoalescing,

  LispEnumSize,
}

export class Prop {
  constructor(
    public context: unknown,
    public prop: PropertyKey,
    public isConst = false,
    public isGlobal = false,
    public isVariable = false
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