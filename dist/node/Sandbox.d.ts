import { IGlobals, replacementCallback, IAuditReport, Scope, Change, ExecReturn, executeTree, executeTreeAsync, ops, assignCheck, execMany, execAsync, execSync, asyncDone, syncDone } from "./executor.js";
import { IExecutionTree, expectTypes, setLispType, LispItem } from "./parser.js";
export { expectTypes, setLispType, ops as executionOps, assignCheck, execMany, execAsync, execSync, asyncDone, syncDone, executeTree, executeTreeAsync, Scope, };
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
