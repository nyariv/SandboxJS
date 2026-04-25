import { IEvalContext } from '../eval';
import { Change } from '../executor';
import { IExecutionTree } from '../parser';
import { default as SandboxExec } from '../SandboxExec';
import { Scope } from './Scope';
export declare const AsyncFunction: Function;
export declare const GeneratorFunction: Function;
export declare const AsyncGeneratorFunction: Function;
export interface IOptionParams {
    audit?: boolean;
    forbidFunctionCalls?: boolean;
    forbidFunctionCreation?: boolean;
    prototypeWhitelist?: Map<Function, Set<string>>;
    globals?: IGlobals;
    symbolWhitelist?: ISymbolWhitelist;
    executionQuota?: bigint;
    nonBlocking?: boolean;
    haltOnSandboxError?: boolean;
    maxParserRecursionDepth?: number;
    /**
     * Additional function replacements to merge with the built-in tick-checking replacements.
     * Maps a native function to a factory that receives the IContext and returns the replacement.
     * When sandboxed code accesses a property that returns a mapped function, the factory is
     * called once per context and the result is cached and returned instead.
     */
    functionReplacements?: Map<Function, (ctx: IContext) => Function>;
}
export interface IOptions {
    audit: boolean;
    forbidFunctionCalls: boolean;
    forbidFunctionCreation: boolean;
    prototypeWhitelist: Map<Function, Set<PropertyKey>>;
    globals: IGlobals;
    symbolWhitelist: ISymbolWhitelist;
    executionQuota?: bigint;
    haltOnSandboxError?: boolean;
    maxParserRecursionDepth: number;
    nonBlocking: boolean;
    functionReplacements: Map<Function, (ctx: IExecContext, builtInReplacement?: Function) => Function>;
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
    prototypeAccess: {
        [name: string]: Set<PropertyKey>;
    };
}
export interface Ticks {
    ticks: bigint;
    tickLimit?: bigint;
    nextYield?: bigint;
}
export type SubscriptionSubject = object;
export type HaltContext = {
    type: 'error';
    error: Error;
    ticks: Ticks;
    scope: Scope;
    context: IExecContext;
} | {
    type: 'manual';
    error?: never;
    ticks?: never;
    scope?: never;
    context?: never;
} | {
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
    setSubscriptionsGlobal: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptionsGlobal: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    registerSandboxFunction: (fn: (...args: any[]) => any) => void;
    evals: Map<Function, Function>;
    allowJit: boolean;
    evalContext?: IEvalContext;
}
export interface ISandboxGlobal {
    [key: string]: unknown;
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
export declare const NON_BLOCKING_THRESHOLD = 50000n;
export declare const reservedWords: Set<string>;
export declare const enum VarType {
    let = "let",
    const = "const",
    var = "var",
    internal = "internal"
}
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
    InternalBlock = 42,
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
    NullishCoalescing = 89,
    AndEquals = 90,
    OrEquals = 91,
    NullishCoalescingEquals = 92,
    Block = 93,
    Labeled = 94,
    Internal = 95,
    Yield = 96,
    YieldDelegate = 97,
    Hole = 98,
    LispEnumSize = 99
}
