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
    onExecutionQuotaReached?: (ticks: Ticks, scope: Scope, context: IExecutionTree, tree: LispItem) => boolean | void;
}
export interface IOptions {
    audit: boolean;
    forbidFunctionCalls: boolean;
    forbidFunctionCreation: boolean;
    prototypeReplacements: Map<new () => any, replacementCallback>;
    prototypeWhitelist: Map<any, Set<string>>;
    globals: IGlobals;
    executionQuota?: bigint;
    onExecutionQuotaReached?: (ticks: Ticks, scope: Scope, context: IExecutionTree, tree: LispItem) => boolean | void;
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
    prototypeAccess: {
        [name: string]: Set<string>;
    };
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
    setSubscriptionsGlobal: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
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
export declare const SandboxGlobal: SandboxGlobalConstructor;
export type IGlobals = ISandboxGlobal;
export declare class ExecContext implements IExecContext {
    ctx: IContext;
    constants: IConstants;
    tree: Lisp[];
    getSubscriptions: Set<(obj: SubscriptionSubject, name: string) => void>;
    setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    setSubscriptionsGlobal: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptionsGlobal: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    evals: Map<any, any>;
    registerSandboxFunction: (fn: (...args: any[]) => any) => void;
    allowJit: boolean;
    evalContext?: IEvalContext | undefined;
    constructor(ctx: IContext, constants: IConstants, tree: Lisp[], getSubscriptions: Set<(obj: SubscriptionSubject, name: string) => void>, setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>, changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>, setSubscriptionsGlobal: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>, changeSubscriptionsGlobal: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>, evals: Map<any, any>, registerSandboxFunction: (fn: (...args: any[]) => any) => void, allowJit: boolean, evalContext?: IEvalContext | undefined);
}
export declare function createContext(sandbox: SandboxExec, options: IOptions): IContext;
export declare function createExecContext(sandbox: {
    setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
    context: IContext;
}, executionTree: IExecutionTree, evalContext?: IEvalContext): IExecContext;
export declare class CodeString {
    start: number;
    end: number;
    ref: {
        str: string;
    };
    constructor(str: string | CodeString);
    substring(start: number, end?: number): CodeString;
    get length(): number;
    char(i: number): string | undefined;
    toString(): string;
    trimStart(): CodeString;
    slice(start: number, end?: number): CodeString;
    trim(): CodeString;
    valueOf(): string;
}
export declare const enum VarType {
    let = "let",
    const = "const",
    var = "var"
}
export declare class Scope {
    parent: Scope | null;
    const: {
        [key: string]: true;
    };
    let: {
        [key: string]: true;
    };
    var: {
        [key: string]: true;
    };
    globals: {
        [key: string]: true;
    };
    allVars: {
        [key: string]: unknown;
    } & Object;
    functionThis?: Unknown;
    constructor(parent: Scope | null, vars?: {}, functionThis?: Unknown);
    get(key: string, functionScope?: boolean): Prop;
    set(key: string, val: unknown): Prop;
    declare(key: string, type: VarType, value?: unknown, isGlobal?: boolean): Prop;
}
export interface IScope {
    [key: string]: any;
}
export declare class FunctionScope implements IScope {
}
export declare class LocalScope implements IScope {
}
export declare class SandboxError extends Error {
}
export declare function isLisp<Type extends Lisp = Lisp>(item: LispItem | LispItem): item is Type;
export declare const enum LispType {
    None = 0,
    Prop = 1,
    StringIndex = 2,
    Let = 3,
    Const = 4,
    Call = 5,
    KeyVal = 6,
    Number = 7,
    Return = 8,
    Assign = 9,
    InlineFunction = 10,
    ArrowFunction = 11,
    CreateArray = 12,
    If = 13,
    IfCase = 14,
    InlineIf = 15,
    InlineIfCase = 16,
    SpreadObject = 17,
    SpreadArray = 18,
    ArrayProp = 19,
    PropOptional = 20,
    CallOptional = 21,
    CreateObject = 22,
    Group = 23,
    Not = 24,
    IncrementBefore = 25,
    IncrementAfter = 26,
    DecrementBefore = 27,
    DecrementAfter = 28,
    And = 29,
    Or = 30,
    StrictNotEqual = 31,
    StrictEqual = 32,
    Plus = 33,
    Var = 34,
    GlobalSymbol = 35,
    Literal = 36,
    Function = 37,
    Loop = 38,
    Try = 39,
    Switch = 40,
    SwitchCase = 41,
    Block = 42,
    Expression = 43,
    Await = 44,
    New = 45,
    Throw = 46,
    Minus = 47,
    Divide = 48,
    Power = 49,
    Multiply = 50,
    Modulus = 51,
    Equal = 52,
    NotEqual = 53,
    SmallerEqualThan = 54,
    LargerEqualThan = 55,
    SmallerThan = 56,
    LargerThan = 57,
    Negative = 58,
    Positive = 59,
    Typeof = 60,
    Delete = 61,
    Instanceof = 62,
    In = 63,
    Inverse = 64,
    SubractEquals = 65,
    AddEquals = 66,
    DivideEquals = 67,
    PowerEquals = 68,
    MultiplyEquals = 69,
    ModulusEquals = 70,
    BitNegateEquals = 71,
    BitAndEquals = 72,
    BitOrEquals = 73,
    UnsignedShiftRightEquals = 74,
    ShiftRightEquals = 75,
    ShiftLeftEquals = 76,
    BitAnd = 77,
    BitOr = 78,
    BitNegate = 79,
    BitShiftLeft = 80,
    BitShiftRight = 81,
    BitUnsignedShiftRight = 82,
    BigInt = 83,
    LiteralIndex = 84,
    RegexIndex = 85,
    LoopAction = 86,
    Void = 87,
    True = 88,
    LispEnumSize = 89
}
export declare class Prop {
    context: Unknown;
    prop: string;
    isConst: boolean;
    isGlobal: boolean;
    isVariable: boolean;
    constructor(context: Unknown, prop: string, isConst?: boolean, isGlobal?: boolean, isVariable?: boolean);
    get<T = unknown>(context: IExecContext): T;
}
export {};
