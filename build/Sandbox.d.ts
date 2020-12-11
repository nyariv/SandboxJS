import { IGlobals, replacementCallback, IAuditReport, Scope, Change, ExecReturn, executeTree, executeTreeAsync, assignCheck, execMany, execAsync, execSync, asyncDone, syncDone } from "./executor.js";
import { IExecutionTree, LispItem } from "./parser.js";
export declare const extend: () => {
    expectTypes: {
        [type: string]: {
            types: {
                [type: string]: RegExp;
            };
            next: string[];
        };
    };
    setLispType: (types: string[], fn: (strings: import("./parser.js").IConstants, type: string, part: import("./parser.js").CodeString, res: string[], expect: string, ctx: {
        lispTree: LispItem;
    }) => any) => void;
    executionOps: Map<string, (exec: (ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: import("./executor.js").Done, inLoopOrSwitch?: string) => void, done: import("./executor.js").Done, ticks: Ticks, a: String | Number | Boolean | string[] | import("./parser.js").Lisp | import("./parser.js").If | import("./parser.js").KeyVal | import("./parser.js").SpreadArray | import("./parser.js").SpreadObject | import("./parser.js").LispArray | (new () => any) | (new (...args: any[]) => any) | import("./parser.js").CodeString, b: String | Number | Boolean | import("./parser.js").Lisp | import("./parser.js").If | import("./parser.js").KeyVal | import("./parser.js").SpreadArray | import("./parser.js").SpreadObject | import("./parser.js").LispArray | (new () => any) | (new (...args: any[]) => any) | import("./parser.js").CodeString | import("./parser.js").Lisp[], obj: any, context: IExecContext, scope: Scope, bobj?: any, inLoopOrSwitch?: string) => void>;
    assignCheck: typeof assignCheck;
    execMany: typeof execMany;
    execAsync: typeof execAsync;
    execSync: typeof execSync;
    asyncDone: typeof asyncDone;
    syncDone: typeof syncDone;
    executeTree: typeof executeTree;
    executeTreeAsync: typeof executeTreeAsync;
};
export interface IOptions {
    audit?: boolean;
    forbidFunctionCalls?: boolean;
    forbidFunctionCreation?: boolean;
    prototypeReplacements?: Map<new () => any, replacementCallback>;
    prototypeWhitelist?: Map<any, Set<string>>;
    globals: IGlobals;
    executionQuota?: bigint;
    onExecutionQuotaReached?: (ticks: Ticks, scope: Scope, context: IExecutionTree, tree: LispItem) => boolean | void;
}
export interface IContext {
    sandbox: Sandbox;
    globalScope: Scope;
    sandboxGlobal: SandboxGlobal;
    globalsWhitelist?: Set<any>;
    options: IOptions;
    evals: Map<any, any>;
    getSubscriptions: Set<(obj: object, name: string) => void>;
    setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    auditReport?: IAuditReport;
}
export interface Ticks {
    ticks: bigint;
}
export interface IExecContext extends IExecutionTree {
    ctx: IContext;
}
export declare class SandboxGlobal {
    constructor(globals: IGlobals);
}
export default class Sandbox {
    context: IContext;
    constructor(options?: IOptions);
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
    } | Scope)[]): ExecReturn;
    executeTreeAsync(executionTree: IExecutionTree, scopes?: ({
        [key: string]: any;
    } | Scope)[]): Promise<ExecReturn>;
    compile(code: string, optimize?: boolean): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => any;
    compileAsync(code: string, optimize?: boolean): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => Promise<any>;
    compileExpression(code: string, optimize?: boolean): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => any;
    compileExpressionAsync(code: string, optimize?: boolean): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => Promise<any>;
}
