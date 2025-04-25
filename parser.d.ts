import { CodeString, LispType } from './utils.js';
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
export type KeyVal = DefineLisp<LispType.KeyVal, string | Lisp, Lisp>;
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
export declare const expectTypes: Record<string, {
    types: Record<string, RegExp>;
    next: string[];
}>;
export declare function testMultiple(str: string, tests: RegExp[]): RegExpExecArray | null;
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
export declare function insertSemicolons(constants: IConstants, str: CodeString): CodeString;
export declare function checkRegex(str: string): IRegEx | null;
export declare function extractConstants(constants: IConstants, str: string, currentEnclosure?: string): {
    str: string;
    length: number;
};
export default function parse(code: string, eager?: boolean, expression?: boolean): IExecutionTree;
export {};
