export declare type LispArray = Array<LispItem> & {
    lisp: boolean;
};
export declare type LispItem = Lisp | If | KeyVal | SpreadArray | SpreadObject | (LispArray) | {
    new (): any;
} | (new (...args: any[]) => any) | String | Number | Boolean | null | undefined;
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
export declare function toLispArray(arr: LispItem[]): LispArray;
export declare function restOfExp(constants: IConstants, part: string, tests?: RegExp[], quote?: string, firstOpening?: string, closingsTests?: RegExp[], details?: {
    [k: string]: string;
}, allChars?: boolean): string;
export declare namespace restOfExp {
    var next: string[];
}
export declare function lispifyBlock(str: string, constants: IConstants): LispArray;
export declare function lispifyFunction(str: string, constants: IConstants): LispArray;
export declare function insertSemicolons(constants: IConstants, part: string, type: boolean): string;
export declare function convertOneLiners(constants: IConstants, str: string): string;
export declare function checkRegex(str: string): IRegEx | null;
export declare function extractConstants(constants: IConstants, str: string, currentEnclosure?: string): {
    str: string;
    length: number;
};
export declare function parse(code: string, eager?: boolean): IExecutionTree;
