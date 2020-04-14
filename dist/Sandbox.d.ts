export interface IOptions {
    audit?: boolean;
    forbidMethodCalls?: boolean;
}
export interface IAuditReport {
    globalsAccess: Set<any>;
    prototypeAccess: {
        [name: string]: Set<string>;
    };
}
export interface IAuditResult {
    auditReport: IAuditReport;
    result: any;
}
export declare type SandboxFunction = (code: string, ...args: any[]) => () => any;
export declare type sandboxedEval = (code: string) => any;
export declare type sandboxSetTimeout = (handler: TimerHandler, timeout?: number, ...args: any[]) => number;
export declare type sandboxSetInterval = (handler: TimerHandler, timeout?: number, ...args: any[]) => number;
export declare type LispItem = Lisp | KeyVal | SpreadArray | SpreadObject | ObjectFunc | (LispItem[]) | {
    new (): any;
} | String | Number | Boolean | null;
export interface ILiteral extends Lisp {
    op: 'literal';
    a: string;
    b: LispItem[];
}
export interface IExecutionTree {
    tree: LispItem;
    strings: string[];
    literals: ILiteral[];
}
interface IGlobals {
    [key: string]: any;
}
interface IContext {
    sandbox: Sandbox;
    globals: IGlobals;
    globalsWhitelist: Set<any>;
    prototypeWhitelist: Map<any, Set<string>>;
    globalScope: Scope;
    sandboxGlobal: SandboxGlobal;
    options: IOptions;
    replacements: Map<any, any>;
    auditReport: IAuditReport;
    literals?: ILiteral[];
    strings?: string[];
    functions?: Lisp[];
}
declare class Lisp {
    op: string;
    a?: LispItem;
    b?: LispItem;
    constructor(obj: Lisp);
}
declare class KeyVal {
    key: string;
    val: any;
    constructor(key: string, val: any);
}
declare class ObjectFunc {
    key: string;
    args: string[];
    tree: LispItem;
    constructor(key: string, args: string[], tree: LispItem);
}
declare class SpreadObject {
    item: {
        [key: string]: any;
    };
    constructor(item: {
        [key: string]: any;
    });
}
declare class SpreadArray {
    item: any[];
    constructor(item: any[]);
}
declare class Scope {
    parent: Scope;
    const: {
        [key: string]: any;
    };
    let: {
        [key: string]: any;
    };
    var: {
        [key: string]: any;
    };
    globals: {
        [key: string]: any;
    };
    functionThis: any;
    constructor(parent: Scope, vars?: {}, functionThis?: any);
    get(key: string, functionScope?: boolean): any;
    set(key: string, val: any): any;
    declare(key: string, type?: string, value?: any, isGlobal?: boolean): void;
}
declare class SandboxGlobal {
    constructor(globals: IGlobals);
}
export default class Sandbox {
    context: IContext;
    constructor(globals?: IGlobals, prototypeWhitelist?: Map<any, Set<string>>, options?: IOptions);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): Map<any, Set<string>>;
    static audit(code: string, scopes?: ({
        [prop: string]: any;
    } | Scope)[]): IAuditResult;
    static parse(code: string, strings?: string[], literals?: ILiteral[]): IExecutionTree;
    executeTree(executionTree: IExecutionTree, scopes?: ({
        [key: string]: any;
    } | Scope)[]): IAuditResult;
    compile(code: string): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => any;
}
export {};
