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
    True = 88
}
export type DefineLisp<op extends LispType, a extends LispItem | LispItem, b extends LispItem | LispItem> = [op, a, b];
export type ExtractLispOp<L> = L extends DefineLisp<infer i, any, any> ? i : never;
export type ExtractLispA<L> = L extends DefineLisp<any, infer i, any> ? i : never;
export type ExtractLispB<L> = L extends DefineLisp<any, any, infer i> ? i : never;
export type LispItemSingle = LispType.None | LispType.True | string | Lisp;
export type LispItem = LispItemSingle | LispItemSingle[];
export type Lisp = [LispType, LispItem, LispItem];
export type Literal = DefineLisp<LispType.Literal, string, Lisp[]> & {
    tempJsStrings?: string[];
};
export type If = DefineLisp<LispType.If, Lisp, IfCase>;
export type InlineIf = DefineLisp<LispType.InlineIf, Lisp, InlineIfCase>;
export type IfCase = DefineLisp<LispType.IfCase, Lisp[], Lisp[]>;
export type InlineIfCase = DefineLisp<LispType.InlineIfCase, Lisp, Lisp>;
export type KeyVal = DefineLisp<LispType.KeyVal, string | Lisp, Lisp[]>;
export type SpreadObject = DefineLisp<LispType.SpreadObject, LispType.None, Lisp>;
export type SpreadArray = DefineLisp<LispType.SpreadArray, LispType.None, Lisp>;
export type ArrayProp = DefineLisp<LispType.ArrayProp, Lisp, Lisp>;
export type Prop = DefineLisp<LispType.Prop, Lisp, string | Lisp>;
export type PropOptional = DefineLisp<LispType.PropOptional, Lisp, Lisp[]>;
export type Call = DefineLisp<LispType.Call, Lisp, Lisp[]>;
export type CallOptional = DefineLisp<LispType.CallOptional, Lisp, Lisp[]>;
export type CreateArray = DefineLisp<LispType.CreateArray, Lisp, Lisp[]>;
export type CreateObject = DefineLisp<LispType.CreateObject, Lisp, Lisp[]>;
export type Group = DefineLisp<LispType.Group, Lisp, Lisp[]>;
export type Inverse = DefineLisp<LispType.Inverse, Lisp, Lisp>;
export type Not = DefineLisp<LispType.Not, Lisp, Lisp>;
export type Negative = DefineLisp<LispType.Negative, Lisp, Lisp>;
export type Positive = DefineLisp<LispType.Positive, Lisp, Lisp>;
export type Typeof = DefineLisp<LispType.Typeof, Lisp, Lisp>;
export type Delete = DefineLisp<LispType.Delete, Lisp, Lisp>;
export type IncrementBefore = DefineLisp<LispType.IncrementBefore, Lisp, LispType.None>;
export type IncrementAfter = DefineLisp<LispType.IncrementAfter, Lisp, LispType.None>;
export type DecrementBefore = DefineLisp<LispType.DecrementBefore, Lisp, LispType.None>;
export type DecrementAfter = DefineLisp<LispType.DecrementAfter, Lisp, LispType.None>;
export type And = DefineLisp<LispType.And, Lisp, Lisp>;
export type Or = DefineLisp<LispType.Or, Lisp, Lisp>;
export type Instanceof = DefineLisp<LispType.Instanceof, Lisp, Lisp>;
export type In = DefineLisp<LispType.In, Lisp, Lisp>;
export type Assigns = DefineLisp<LispType.Assign, Lisp, Lisp>;
export type SubractEquals = DefineLisp<LispType.SubractEquals, Lisp, Lisp>;
export type AddEquals = DefineLisp<LispType.AddEquals, Lisp, Lisp>;
export type DivideEquals = DefineLisp<LispType.DivideEquals, Lisp, Lisp>;
export type PowerEquals = DefineLisp<LispType.PowerEquals, Lisp, Lisp>;
export type MultiplyEquals = DefineLisp<LispType.MultiplyEquals, Lisp, Lisp>;
export type ModulusEquals = DefineLisp<LispType.ModulusEquals, Lisp, Lisp>;
export type BitNegateEquals = DefineLisp<LispType.BitNegateEquals, Lisp, Lisp>;
export type BitAndEquals = DefineLisp<LispType.BitAndEquals, Lisp, Lisp>;
export type BitOrEquals = DefineLisp<LispType.BitOrEquals, Lisp, Lisp>;
export type UnsignedShiftRightEquals = DefineLisp<LispType.UnsignedShiftRightEquals, Lisp, Lisp>;
export type ShiftLeftEquals = DefineLisp<LispType.ShiftLeftEquals, Lisp, Lisp>;
export type ShiftRightEquals = DefineLisp<LispType.ShiftRightEquals, Lisp, Lisp>;
export type BitAnd = DefineLisp<LispType.BitAnd, Lisp, Lisp>;
export type BitOr = DefineLisp<LispType.BitOr, Lisp, Lisp>;
export type BitNegate = DefineLisp<LispType.BitNegate, Lisp, Lisp>;
export type BitShiftLeft = DefineLisp<LispType.BitShiftLeft, Lisp, Lisp>;
export type BitShiftRight = DefineLisp<LispType.BitShiftRight, Lisp, Lisp>;
export type BitUnsignedShiftRight = DefineLisp<LispType.BitUnsignedShiftRight, Lisp, Lisp>;
export type SmallerEqualThan = DefineLisp<LispType.SmallerEqualThan, Lisp, Lisp>;
export type LargerEqualThan = DefineLisp<LispType.LargerEqualThan, Lisp, Lisp>;
export type SmallerThan = DefineLisp<LispType.SmallerThan, Lisp, Lisp>;
export type LargerThan = DefineLisp<LispType.LargerThan, Lisp, Lisp>;
export type StrictNotEqual = DefineLisp<LispType.StrictNotEqual, Lisp, Lisp>;
export type NotEqual = DefineLisp<LispType.NotEqual, Lisp, Lisp>;
export type StrictEqual = DefineLisp<LispType.StrictEqual, Lisp, Lisp>;
export type Equal = DefineLisp<LispType.Equal, Lisp, Lisp>;
export type Plus = DefineLisp<LispType.Plus, Lisp, Lisp>;
export type Minus = DefineLisp<LispType.Minus, Lisp, Lisp>;
export type Divide = DefineLisp<LispType.Divide, Lisp, Lisp>;
export type Power = DefineLisp<LispType.Power, Lisp, Lisp>;
export type Multiply = DefineLisp<LispType.Multiply, Lisp, Lisp>;
export type Modulus = DefineLisp<LispType.Modulus, Lisp, Lisp>;
export type Block = DefineLisp<LispType.Block, Lisp[], LispType.None>;
export type Expression = DefineLisp<LispType.Expression, Lisp[], LispType.None>;
export type Return = DefineLisp<LispType.Return, LispType.None, Lisp>;
export type Throw = DefineLisp<LispType.Throw, LispType.None, Lisp>;
export type Switch = DefineLisp<LispType.Switch, Lisp, SwitchCase[]>;
export type SwitchCase = DefineLisp<LispType.SwitchCase, LispType.None | Lisp, Lisp[]>;
export type Var = DefineLisp<LispType.Var, string, Lisp | LispType.None>;
export type Let = DefineLisp<LispType.Let, string, Lisp | LispType.None>;
export type Const = DefineLisp<LispType.Const, string, Lisp | LispType.None>;
export type Number = DefineLisp<LispType.Number, LispType.None, string>;
export type BigInt = DefineLisp<LispType.BigInt, LispType.None, string>;
export type GlobalSymbol = DefineLisp<LispType.GlobalSymbol, LispType.None, string>;
export type LiteralIndex = DefineLisp<LispType.LiteralIndex, LispType.None, string>;
export type StringIndex = DefineLisp<LispType.StringIndex, LispType.None, string>;
export type RegexIndex = DefineLisp<LispType.RegexIndex, LispType.None, string>;
export type Function = DefineLisp<LispType.Function, (string | LispType.None | LispType.True)[], string | Lisp[]>;
export type InlineFunction = DefineLisp<LispType.InlineFunction, string[], string | Lisp[]>;
export type ArrowFunction = DefineLisp<LispType.ArrowFunction, string[], string | Lisp[]>;
export type Loop = DefineLisp<LispType.Loop, LispItem, Lisp[]>;
export type LoopAction = DefineLisp<LispType.LoopAction, string, LispType.None>;
export type Try = DefineLisp<LispType.Try, Lisp[], LispItem>;
export type Void = DefineLisp<LispType.Void, Lisp, LispType.None>;
export type Await = DefineLisp<LispType.Await, Lisp, LispType.None>;
export type New = DefineLisp<LispType.New, Lisp, Lisp[]>;
export type None = DefineLisp<LispType.None, LispType.None, LispType.None>;
export type LispFamily = Literal | If | InlineIf | IfCase | InlineIfCase | KeyVal | SpreadObject | SpreadArray | ArrayProp | Prop | PropOptional | Call | CallOptional | CreateArray | CreateObject | Group | Inverse | Not | Negative | Positive | Typeof | Delete | IncrementBefore | IncrementAfter | DecrementBefore | DecrementAfter | And | Or | Instanceof | In | Assigns | SubractEquals | AddEquals | DivideEquals | PowerEquals | MultiplyEquals | ModulusEquals | BitNegateEquals | BitAndEquals | BitOrEquals | UnsignedShiftRightEquals | ShiftLeftEquals | ShiftRightEquals | BitAnd | BitOr | BitNegate | BitShiftLeft | BitShiftRight | BitUnsignedShiftRight | SmallerEqualThan | LargerEqualThan | SmallerThan | LargerThan | StrictNotEqual | NotEqual | StrictEqual | Equal | Plus | Minus | Divide | Power | Multiply | Modulus | Block | Expression | Return | Throw | Switch | SwitchCase | Var | Let | Const | Number | BigInt | GlobalSymbol | LiteralIndex | StringIndex | RegexIndex | Function | InlineFunction | ArrowFunction | Loop | LoopAction | Try | Void | Await | New | None;
export interface IRegEx {
    regex: string;
    flags: string;
    length: number;
}
export interface IConstants {
    strings: string[];
    literals: Literal[];
    regexes: IRegEx[];
    eager: boolean;
}
export interface IExecutionTree {
    tree: Lisp[];
    constants: IConstants;
}
type LispCallback<T> = (strings: IConstants, type: T, part: CodeString, res: string[], expect: string, ctx: {
    lispTree: Lisp;
}) => any;
export declare class ParseError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare let expectTypes: {
    readonly splitter: {
        readonly types: {
            readonly opHigh: RegExp;
            readonly op: RegExp;
            readonly comparitor: RegExp;
            readonly boolOp: RegExp;
            readonly bitwise: RegExp;
        };
        readonly next: readonly ["modifier", "value", "prop", "incrementerBefore"];
    };
    readonly inlineIf: {
        readonly types: {
            readonly inlineIf: RegExp;
        };
        readonly next: readonly ["expEnd"];
    };
    readonly assignment: {
        readonly types: {
            readonly assignModify: RegExp;
            readonly assign: RegExp;
        };
        readonly next: readonly ["modifier", "value", "prop", "incrementerBefore"];
    };
    readonly incrementerBefore: {
        readonly types: {
            readonly incrementerBefore: RegExp;
        };
        readonly next: readonly ["prop"];
    };
    readonly expEdge: {
        readonly types: {
            readonly call: RegExp;
            readonly incrementerAfter: RegExp;
        };
        readonly next: readonly ["splitter", "expEdge", "dot", "inlineIf", "expEnd"];
    };
    readonly modifier: {
        readonly types: {
            readonly not: RegExp;
            readonly inverse: RegExp;
            readonly negative: RegExp;
            readonly positive: RegExp;
            readonly typeof: RegExp;
            readonly delete: RegExp;
        };
        readonly next: readonly ["modifier", "value", "prop", "incrementerBefore"];
    };
    readonly dot: {
        readonly types: {
            readonly arrayProp: RegExp;
            readonly dot: RegExp;
        };
        readonly next: readonly ["splitter", "assignment", "expEdge", "dot", "inlineIf", "expEnd"];
    };
    readonly prop: {
        readonly types: {
            readonly prop: RegExp;
        };
        readonly next: readonly ["splitter", "assignment", "expEdge", "dot", "inlineIf", "expEnd"];
    };
    readonly value: {
        readonly types: {
            readonly createObject: RegExp;
            readonly createArray: RegExp;
            readonly number: RegExp;
            readonly string: RegExp;
            readonly literal: RegExp;
            readonly regex: RegExp;
            readonly boolean: RegExp;
            readonly null: RegExp;
            readonly und: RegExp;
            readonly arrowFunctionSingle: RegExp;
            readonly arrowFunction: RegExp;
            readonly inlineFunction: RegExp;
            readonly group: RegExp;
            readonly NaN: RegExp;
            readonly Infinity: RegExp;
            readonly void: RegExp;
            readonly await: RegExp;
            readonly new: RegExp;
        };
        readonly next: readonly ["splitter", "expEdge", "dot", "inlineIf", "expEnd"];
    };
    readonly initialize: {
        readonly types: {
            readonly initialize: RegExp;
            readonly return: RegExp;
            readonly throw: RegExp;
        };
        readonly next: readonly ["modifier", "value", "prop", "incrementerBefore", "expEnd"];
    };
    readonly spreadObject: {
        readonly types: {
            readonly spreadObject: RegExp;
        };
        readonly next: readonly ["value", "prop"];
    };
    readonly spreadArray: {
        readonly types: {
            readonly spreadArray: RegExp;
        };
        readonly next: readonly ["value", "prop"];
    };
    readonly expEnd: {
        readonly types: {};
        readonly next: readonly [];
    };
    readonly expFunction: {
        readonly types: {
            readonly function: RegExp;
        };
        readonly next: readonly ["expEdge", "expEnd"];
    };
    readonly expSingle: {
        readonly types: {
            readonly for: RegExp;
            readonly do: RegExp;
            readonly while: RegExp;
            readonly loopAction: RegExp;
            readonly if: RegExp;
            readonly try: RegExp;
            readonly block: RegExp;
            readonly switch: RegExp;
        };
        readonly next: readonly ["expEnd"];
    };
};
export declare function testMultiple(str: string, tests: RegExp[]): RegExpExecArray;
export declare class CodeString {
    start: number;
    end: number;
    ref: {
        str: string;
    };
    constructor(str: string | CodeString);
    substring(start: number, end?: number): CodeString;
    get length(): number;
    char(i: number): string;
    toString(): string;
    trimStart(): CodeString;
    slice(start: number, end?: number): CodeString;
    trim(): CodeString;
    valueOf(): string;
}
export interface restDetails {
    oneliner?: boolean;
    words?: string[];
    lastWord?: string;
    lastAnyWord?: string;
    regRes?: RegExpExecArray;
}
export declare function restOfExp(constants: IConstants, part: CodeString, tests?: RegExp[], quote?: string, firstOpening?: string, closingsTests?: RegExp[], details?: restDetails): CodeString;
export declare namespace restOfExp {
    var next: string[];
}
export declare const setLispType: <T extends readonly string[]>(types: T, fn: LispCallback<T[number]>) => void;
export declare function lispifyReturnExpr(constants: IConstants, str: CodeString): Return;
export declare function lispifyBlock(str: CodeString, constants: IConstants, expression?: boolean): Lisp[];
export declare function lispifyFunction(str: CodeString, constants: IConstants, expression?: boolean): Lisp[];
export declare function isLisp<Type extends Lisp = Lisp>(item: LispItem | LispItem): item is Type;
export declare function insertSemicolons(constants: IConstants, str: CodeString): CodeString;
export declare function checkRegex(str: string): IRegEx | null;
export declare function extractConstants(constants: IConstants, str: string, currentEnclosure?: string): {
    str: string;
    length: number;
};
export declare function parse(code: string, eager?: boolean, expression?: boolean): IExecutionTree;
export {};
