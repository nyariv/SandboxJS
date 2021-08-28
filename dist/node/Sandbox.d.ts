import { IGlobals, replacementCallback, IAuditReport, Change, ExecReturn, executeTree, executeTreeAsync, ops, assignCheck, execMany, execAsync, execSync, asyncDone, Scope, IScope, FunctionScope, LocalScope, syncDone } from "./executor.js";
import { IExecutionTree, expectTypes, setLispType, LispItem, LispArray, IConstants } from "./parser.js";
export { expectTypes, setLispType, ops as executionOps, assignCheck, execMany, execAsync, execSync, asyncDone, syncDone, executeTree, executeTreeAsync, FunctionScope, LocalScope, };
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
    prototypeWhitelist?: Map<any, Set<string>>;
    options: IOptions;
    auditReport?: IAuditReport;
}
export interface Ticks {
    ticks: bigint;
}
export interface IExecContext extends IExecutionTree {
    ctx: IContext;
    getSubscriptions: Set<(obj: object, name: string) => void>;
    setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    evals: Map<any, any>;
}
export declare class SandboxGlobal {
    constructor(globals: IGlobals);
}
export declare class ExecContext implements IExecContext {
    ctx: IContext;
    constants: IConstants;
    tree: LispArray;
    getSubscriptions: Set<(obj: object, name: string) => void>;
    setSubscriptions: WeakMap<object, Map<string, Set<() => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    evals: Map<any, any>;
    constructor(ctx: IContext, constants: IConstants, tree: LispArray, getSubscriptions: Set<(obj: object, name: string) => void>, setSubscriptions: WeakMap<object, Map<string, Set<() => void>>>, changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>, evals: Map<any, any>);
}
export default class Sandbox {
    context: IContext;
    currentContext: IExecContext;
    constructor(options?: IOptions);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): Map<any, Set<string>>;
    subscribeGet(context: IExecContext, callback: (obj: object, name: string) => void): {
        unsubscribe: () => void;
    };
    subscribeSet(context: IExecContext, exec: (...scopes: (IScope)[]) => unknown | Promise<unknown>, obj: object, name: string, callback: (modification: Change) => void): {
        unsubscribe: () => void;
    };
    static audit<T>(code: string, scopes?: (IScope)[]): ExecReturn<T>;
    static parse(code: string): IExecutionTree;
    createContext(context: IContext, executionTree: IExecutionTree): ExecContext;
    executeTree<T>(context: IExecContext, scopes?: (IScope)[]): ExecReturn<T>;
    executeTreeAsync<T>(context: IExecContext, scopes?: (IScope)[]): Promise<ExecReturn<T>>;
    compile<T>(code: string, optimize?: boolean): (...scopes: (IScope)[]) => {
        context: IExecContext;
        run: () => T;
    };
    compileAsync<T>(code: string, optimize?: boolean): (...scopes: (IScope)[]) => {
        context: IExecContext;
        run: () => Promise<T>;
    };
    compileExpression<T>(code: string, optimize?: boolean): (...scopes: (IScope)[]) => {
        context: IExecContext;
        run: () => T;
    };
    compileExpressionAsync<T>(code: string, optimize?: boolean): (...scopes: (IScope)[]) => {
        context: IExecContext;
        run: () => Promise<T>;
    };
}
