// Reusable AsyncFunction constructor references
export const AsyncFunction: Function = Object.getPrototypeOf(async function () {}).constructor;
export const GeneratorFunction: Function = Object.getPrototypeOf(function* () {}).constructor;
export const AsyncGeneratorFunction: Function = Object.getPrototypeOf(
  async function* () {},
).constructor;

import type { IEvalContext } from '../eval';
import type { Change, Unknown } from '../executor';
import type { IConstants, IExecutionTree, Lisp, LispItem } from '../parser';
import type SandboxExec from '../SandboxExec.js';
import type { Scope } from './Scope.js';

export type replacementCallback = (obj: any, isStaticAccess: boolean) => any;

export interface IOptionParams {
  audit?: boolean;
  forbidFunctionCalls?: boolean;
  forbidFunctionCreation?: boolean;
  prototypeReplacements?: Map<Function, replacementCallback>;
  prototypeWhitelist?: Map<Function, Set<string>>;
  globals?: IGlobals;
  symbolWhitelist?: ISymbolWhitelist;
  executionQuota?: bigint;
  nonBlocking?: boolean;
  haltOnSandboxError?: boolean;
  maxParserRecursionDepth?: number;
}

export interface IOptions {
  audit: boolean;
  forbidFunctionCalls: boolean;
  forbidFunctionCreation: boolean;
  prototypeReplacements: Map<Function, replacementCallback>;
  prototypeWhitelist: Map<Function, Set<PropertyKey>>;
  globals: IGlobals;
  symbolWhitelist: ISymbolWhitelist;
  executionQuota?: bigint;
  haltOnSandboxError?: boolean;
  maxParserRecursionDepth: number;
  nonBlocking: boolean;
}

export interface IContext {
  sandbox: SandboxExec;
  globalScope: Scope;
  sandboxGlobal: ISandboxGlobal;
  globalsWhitelist: Set<any>;
  prototypeWhitelist: Map<any, Set<PropertyKey>>;
  sandboxedFunctions: WeakSet<Function>;
  sandboxSymbols: SandboxSymbolContext;
  options: IOptions;
  auditReport?: IAuditReport;
  ticks: Ticks;
}

export interface IAuditReport {
  globalsAccess: Set<unknown>;
  prototypeAccess: { [name: string]: Set<PropertyKey> };
}

export interface Ticks {
  ticks: bigint;
  tickLimit?: bigint;
  nextYield?: bigint;
}

export type SubscriptionSubject = object;

export type HaltContext =
  | {
      type: 'error';
      error: Error;
      ticks: Ticks;
      scope: Scope;
      context: IExecContext;
    }
  | {
      type: 'manual';
      error?: never;
      ticks?: never;
      scope?: never;
      context?: never;
    }
  | {
      type: 'yield';
      error?: never;
      ticks?: never;
      scope?: never;
      context?: never;
    };

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
  evals: Map<Function, Function>;
  allowJit: boolean;
  evalContext?: IEvalContext;
}

export interface ISandboxGlobal {
  [key: string]: unknown;
}
interface SandboxGlobalConstructor {
  new (): ISandboxGlobal;
}

export interface ISymbolWhitelist {
  [key: string]: symbol;
}

export interface SandboxSymbolContext {
  ctor?: Function;
  registry: Map<string, symbol>;
  reverseRegistry: Map<symbol, string>;
  whitelist: ISymbolWhitelist;
}

export type IGlobals = ISandboxGlobal;

export interface IScope {
  [key: string]: any;
}

export const NON_BLOCKING_THRESHOLD = 5_000n;

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
  internal = 'internal',
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
  InternalBlock,
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
  AndEquals,
  OrEquals,
  NullishCoalescingEquals,
  Block,
  Labeled,
  Internal,
  Yield,
  YieldDelegate,

  LispEnumSize,
}
