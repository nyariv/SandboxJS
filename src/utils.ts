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
  onExecutionQuotaReached?: (
    ticks: Ticks,
    scope: Scope,
    context: IExecutionTree,
    tree: LispItem
  ) => boolean | void;
}

export interface IOptions {
  audit: boolean;
  forbidFunctionCalls: boolean;
  forbidFunctionCreation: boolean;
  prototypeReplacements: Map<new () => any, replacementCallback>;
  prototypeWhitelist: Map<any, Set<string>>;
  globals: IGlobals;
  executionQuota?: bigint;
  onExecutionQuotaReached?: (
    ticks: Ticks,
    scope: Scope,
    context: IExecutionTree,
    tree: LispItem
  ) => boolean | void;
}

export interface IContext {
  sandbox: SandboxExec;
  globalScope: Scope;
  sandboxGlobal: ISandboxGlobal;
  globalsWhitelist: Set<any>;
  prototypeWhitelist: Map<any, Set<string>>;
  options: IOptions;
  auditReport?: IAuditReport;
}

export interface IAuditReport {
  globalsAccess: Set<unknown>;
  prototypeAccess: { [name: string]: Set<string> };
}

export interface Ticks {
  ticks: bigint;
}

export type SubscriptionSubject = object;

export interface IExecContext extends IExecutionTree {
  ctx: IContext;
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
  if (globals === (globalThis as any)) return globalThis;
  for (const i in globals) {
    this[i] = globals[i];
  }
} as any as SandboxGlobalConstructor;

export type IGlobals = ISandboxGlobal;

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
    public evalContext?: IEvalContext
  ) {}
}

export function createContext(sandbox: SandboxExec, options: IOptions): IContext {
  const sandboxGlobal = new SandboxGlobal(options.globals);
  const context = {
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
    evals.set(Function, func);
    evals.set(eval, evalContext.sandboxedEval(func));
    evals.set(setTimeout, evalContext.sandboxedSetTimeout(func));
    evals.set(setInterval, evalContext.sandboxedSetInterval(func));
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

const reservedWords = new Set([
  'instanceof',
  'typeof',
  'return',
  'throw',
  'try',
  'catch',
  'if',
  'finally',
  'else',
  'in',
  'of',
  'var',
  'let',
  'const',
  'for',
  'delete',
  'false',
  'true',
  'while',
  'do',
  'break',
  'continue',
  'new',
  'function',
  'async',
  'await',
  'switch',
  'case',
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

  get(key: string, functionScope = false): Prop {
    const functionThis = this.functionThis;
    if (key === 'this' && functionThis !== undefined) {
      return new Prop({ this: functionThis }, key, true, false, true);
    }
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    if (this.parent === null || !functionScope || functionThis !== undefined) {
      if (this.globals.hasOwnProperty(key)) {
        return new Prop(functionThis, key, false, true, true);
      }
      if (key in this.allVars && (!(key in {}) || this.allVars.hasOwnProperty(key))) {
        return new Prop(
          this.allVars,
          key,
          this.const.hasOwnProperty(key),
          this.globals.hasOwnProperty(key),
          true
        );
      }
      if (this.parent === null) {
        return new Prop(undefined, key);
      }
    }
    return this.parent.get(key, functionScope);
  }

  set(key: string, val: unknown) {
    if (key === 'this') throw new SyntaxError('"this" cannot be assigned');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    const prop = this.get(key);
    if (prop.context === undefined) {
      throw new ReferenceError(`Variable '${key}' was not declared.`);
    }
    if (prop.isConst) {
      throw new TypeError(`Cannot assign to const variable '${key}'`);
    }
    if (prop.isGlobal) {
      throw new SandboxError(`Cannot override global variable '${key}'`);
    }
    if (!(prop.context instanceof Object)) throw new SandboxError('Scope is not an object');
    prop.context[prop.prop] = val;
    return prop;
  }

  declare(key: string, type: VarType, value: unknown = undefined, isGlobal = false): Prop {
    if (key === 'this') throw new SyntaxError('"this" cannot be declared');
    if (reservedWords.has(key)) throw new SyntaxError("Unexepected token '" + key + "'");
    if (type === 'var' && this.functionThis === undefined && this.parent !== null) {
      return this.parent.declare(key, type, value, isGlobal);
    } else if (
      (this[type].hasOwnProperty(key) && type !== 'const' && !this.globals.hasOwnProperty(key)) ||
      !(key in this.allVars)
    ) {
      if (isGlobal) {
        this.globals[key] = true;
      }
      this[type][key] = true;
      this.allVars[key] = value;
    } else {
      throw new SandboxError(`Identifier '${key}' has already been declared`);
    }
    return new Prop(this.allVars, key, this.const.hasOwnProperty(key), isGlobal);
  }
}

export interface IScope {
  [key: string]: any;
}

export class FunctionScope implements IScope {}

export class LocalScope implements IScope {}

export class SandboxError extends Error {}

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

  LispEnumSize,
}

export class Prop {
  constructor(
    public context: Unknown,
    public prop: string,
    public isConst = false,
    public isGlobal = false,
    public isVariable = false
  ) {}

  get<T = unknown>(context: IExecContext): T {
    const ctx = this.context;
    if (ctx === undefined) throw new ReferenceError(`${this.prop} is not defined`);
    if (ctx === null)
      throw new TypeError(`Cannot read properties of null, (reading '${this.prop}')`);
    context.getSubscriptions.forEach((cb) => cb(ctx, this.prop));
    return (ctx as any)[this.prop] as T;
  }
}
