export declare type LispItem = IExecutionTree | Lisp | If | KeyVal | SpreadArray | SpreadObject | (LispItem[]) | {
    new (): any;
} | String | Number | Boolean | null;
export interface ILiteral extends Lisp {
    op: 'literal';
    a: string;
    b: LispItem[];
}
export interface IStringsAndLiterals {
    strings: string[];
    literals: ILiteral[];
}
export interface IExecutionTree extends IStringsAndLiterals {
    tree: LispItem;
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
export declare function parse(code: string, strings?: string[], literals?: ILiteral[], skipStrings?: boolean): IExecutionTree;
