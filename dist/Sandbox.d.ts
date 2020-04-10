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
export declare type LispItem = Lisp | KeyVal | SpreadArray | SpreadObject | (LispItem[]) | {
    new (): any;
} | String | Number | Boolean | null;
export interface ILiteral extends Lisp {
    op: 'literal';
    a: string;
    b: LispItem[];
}
export interface IExecutionTree {
    tree: Lisp[];
    strings: string[];
    literals: ILiteral[];
}
interface IGlobals {
    [key: string]: any;
}
interface IContext {
    sandbox: Sandbox;
    globals: IGlobals;
    prototypeWhitelist: Map<any, string[]>;
    globalScope: Scope;
    globalProp: Prop;
    options: IOptions;
    Function: SandboxFunction;
    eval: sandboxedEval;
    auditReport: IAuditReport;
    literals?: ILiteral[];
    strings?: string[];
}
declare class Prop {
    context: {
        [key: string]: any;
    };
    prop: string;
    isConst: boolean;
    isGlobal: boolean;
    constructor(context: {
        [key: string]: any;
    }, prop: string, isConst?: boolean, isGlobal?: boolean);
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
    globalProp?: Prop;
    functionScope: boolean;
    constructor(parent: Scope, vars?: {}, functionScope?: boolean, globalProp?: Prop);
    get(key: string, functionScope?: boolean): any;
    set(key: string, val: any): any;
    declare(key: string, type?: string, value?: any, isGlobal?: boolean): void;
}
export default class Sandbox {
    context: IContext;
    constructor(globals?: IGlobals, prototypeWhitelist?: Map<any, string[]>, options?: IOptions);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): {
        [name: string]: any;
    };
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
