export declare type LispArray = Array<LispItem> & {
    lisp: {};
};
export declare type LispItem = Lisp | If | KeyVal | SpreadArray | SpreadObject | (LispArray) | {
    new (): any;
} | (new (...args: any[]) => any) | CodeString | String | Number | Boolean | null | undefined;
export interface ILiteral extends Lisp {
    op: 'literal';
    a: string;
    b: LispArray;
}
export interface IRegEx {
    regex: string;
    flags: string;
    length: number;
}
export interface IConstants {
    strings: string[];
    literals: ILiteral[];
    regexes: IRegEx[];
    eager: boolean;
}
export interface IExecutionTree {
    tree: LispArray;
    constants: IConstants;
}
declare type LispCallback = (strings: IConstants, type: string, part: CodeString, res: string[], expect: string, ctx: {
    lispTree: LispItem;
}) => any;
export declare class ParseError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class Lisp {
    op: string;
    a?: LispItem;
    b?: LispItem;
    constructor(obj: Lisp);
}
export declare class If {
    t: any;
    f: any;
    constructor(t: any, f: any);
}
export declare class KeyVal {
    key: string;
    val: any;
    constructor(key: string, val: any);
}
export declare class SpreadObject {
    item: {
        [key: string]: any;
    };
    constructor(item: {
        [key: string]: any;
    });
}
export declare class SpreadArray {
    item: any[];
    constructor(item: any[]);
}
export declare const lispArrayKey: {};
export declare function toLispArray(arr: LispItem[]): LispArray;
export declare let expectTypes: {
    [type: string]: {
        types: {
            [type: string]: RegExp;
        };
        next: string[];
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
export declare const setLispType: (types: string[], fn: LispCallback) => void;
export declare function lispifyReturnExpr(constants: IConstants, str: CodeString): Lisp;
export declare function lispifyBlock(str: CodeString, constants: IConstants, expression?: boolean): LispArray;
export declare function lispifyFunction(str: CodeString, constants: IConstants, expression?: boolean): LispArray;
export declare function insertSemicolons(constants: IConstants, str: CodeString): CodeString;
export declare function checkRegex(str: string): IRegEx | null;
export declare function extractConstants(constants: IConstants, str: string, currentEnclosure?: string): {
    str: string;
    length: number;
};
export declare function parse(code: string, eager?: boolean, expression?: boolean): IExecutionTree;
export {};
