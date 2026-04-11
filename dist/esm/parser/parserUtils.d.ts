import { CodeString } from '../utils';
import { IConstants, IExecutionTree, IRegEx, Lisp, LispCallback, LispDepthCtx, Return } from './lisp';
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
    bodyContentAfterKeyword?: boolean;
}
export declare function restOfExp(constants: IConstants, part: CodeString, tests?: RegExp[], quote?: string, firstOpening?: string, closingsTests?: RegExp[], details?: restDetails, depth?: number): CodeString;
export declare namespace restOfExp {
    var next: string[];
}
export declare const setLispType: <T extends readonly string[]>(types: T, fn: LispCallback<T[number]>) => void;
export declare function lispifyReturnExpr(constants: IConstants, str: CodeString): Return;
export declare function lispifyBlock(str: CodeString, constants: IConstants, expression?: boolean, depthCtx?: LispDepthCtx): Lisp[];
export declare function lispifyFunction(str: CodeString, constants: IConstants, expression?: boolean, depthCtx?: LispDepthCtx): Lisp[];
export declare function insertSemicolons(constants: IConstants, str: CodeString): CodeString;
export declare function checkRegex(str: string): IRegEx | null;
export declare function extractConstants(constants: IConstants, str: string, currentEnclosure?: string, depth?: number): {
    str: string;
    length: number;
};
export default function parse(code: string, eager?: boolean, expression?: boolean, maxParserRecursionDepth?: number): IExecutionTree;
