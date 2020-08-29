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
export declare class ExecReturn {
    auditReport: IAuditReport;
    result: any;
    returned: boolean;
    breakLoop: boolean;
    continueLoop: boolean;
    constructor(auditReport: IAuditReport, result: any, returned: boolean, breakLoop?: boolean, continueLoop?: boolean);
}
export declare type SandboxFunction = (code: string, ...args: any[]) => () => any;
export declare type sandboxedEval = (code: string) => any;
export declare type sandboxSetTimeout = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export declare type sandboxSetInterval = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export declare type LispItem = IExecutionTree | Lisp | If | KeyVal | SpreadArray | SpreadObject | (LispItem[]) | {
    new (): any;
} | String | Number | Boolean | null;
export declare type replacementCallback = (obj: any, isStaticAccess: boolean) => any;
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
export interface IFunctionContext {
    sandbox: Sandbox;
    strings: string[];
    literals: ILiteral[];
}
export interface IGlobals {
    [key: string]: any;
}
interface IChange {
    type: string;
}
interface ICreate extends IChange {
    type: "create";
    prop: number | string;
}
interface IReplace extends IChange {
    type: "replace";
}
interface IDelete extends IChange {
    type: "delete";
    prop: number | string;
}
interface IReverse extends IChange {
    type: "reverse";
}
interface ISort extends IChange {
    type: "sort";
}
interface IPush extends IChange {
    type: "push";
    added: unknown[];
}
interface IPop extends IChange {
    type: "pop";
    removed: unknown[];
}
interface IShift extends IChange {
    type: "shift";
    removed: unknown[];
}
interface IUnShift extends IChange {
    type: "unshift";
    added: unknown[];
}
interface ISplice extends IChange {
    type: "splice";
    startIndex: number;
    deleteCount: number;
    added: unknown[];
    removed: unknown[];
}
interface ICopyWithin extends IChange {
    type: "copyWithin";
    startIndex: number;
    endIndex: number;
    added: unknown[];
    removed: unknown[];
}
declare type Change = ICreate | IReplace | IDelete | IReverse | ISort | IPush | IPop | IUnShift | IShift | ISplice | ICopyWithin;
interface IContext {
    sandbox: Sandbox;
    globals: IGlobals;
    globalsWhitelist: Set<any>;
    prototypeWhitelist: Map<Function, Set<string>>;
    prototypeReplacements: Map<Function, replacementCallback>;
    globalScope: Scope;
    sandboxGlobal: SandboxGlobal;
    options: IOptions;
    evals: Map<any, any>;
    auditReport?: IAuditReport;
    literals?: ILiteral[];
    strings?: string[];
    functions?: Lisp[];
    getSubscriptions: Set<(obj: object, name: string) => void>;
    setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    inLoop: boolean;
}
declare class Lisp {
    op: string;
    a?: LispItem;
    b?: LispItem;
    constructor(obj: Lisp);
}
declare class If {
    t: any;
    f: any;
    constructor(t: any, f: any);
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
declare enum VarType {
    let = "let",
    const = "const",
    var = "var"
}
declare class Scope {
    parent: Scope;
    const: Set<string>;
    let: Set<string>;
    var: Set<string>;
    globals: Set<string>;
    allVars: {
        [key: string]: any;
    } & Object;
    functionThis: any;
    constructor(parent: Scope, vars?: {}, functionThis?: any);
    get(key: string, functionScope?: boolean): any;
    set(key: string, val: any): any;
    declare(key: string, type?: VarType, value?: any, isGlobal?: boolean): any;
}
declare class SandboxGlobal {
    constructor(globals: IGlobals);
}
export default class Sandbox {
    context: IContext;
    constructor(globals?: IGlobals, prototypeWhitelist?: Map<Function, Set<string>>, prototypeReplacements?: Map<Function, replacementCallback>, options?: IOptions);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): Map<any, Set<string>>;
    subscribeGet(callback: (obj: object, name: string) => void): {
        unsubscribe: () => void;
    };
    subscribeSet(obj: object, name: string, callback: (modification: Change) => void): {
        unsubscribe: () => void;
    };
    static audit(code: string, scopes?: ({
        [prop: string]: any;
    } | Scope)[]): ExecReturn;
    static parse(code: string): IExecutionTree;
    executeTree(executionTree: IExecutionTree, scopes?: ({
        [key: string]: any;
    } | Scope)[], inLoop?: boolean): ExecReturn;
    compile(code: string): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => any;
}
export {};
