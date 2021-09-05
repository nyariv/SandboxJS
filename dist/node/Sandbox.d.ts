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
    setSubscriptionsGlobal: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptionsGlobal: WeakMap<object, Set<(modification: Change) => void>>;
    registerSandboxFunction: (fn: (...args: any[]) => any) => void;
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
    setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    setSubscriptionsGlobal: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptionsGlobal: WeakMap<object, Set<(modification: Change) => void>>;
    evals: Map<any, any>;
    registerSandboxFunction: (fn: (...args: any[]) => any) => void;
    constructor(ctx: IContext, constants: IConstants, tree: LispArray, getSubscriptions: Set<(obj: object, name: string) => void>, setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>, changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>, setSubscriptionsGlobal: WeakMap<object, Map<string, Set<(modification: Change) => void>>>, changeSubscriptionsGlobal: WeakMap<object, Set<(modification: Change) => void>>, evals: Map<any, any>, registerSandboxFunction: (fn: (...args: any[]) => any) => void);
}
export default class Sandbox {
    context: IContext;
    setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
    constructor(options?: IOptions);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): Map<any, Set<string>>;
    subscribeGet(callback: (obj: object, name: string) => void, context: IExecContext): {
        unsubscribe: () => void;
    };
    subscribeSet(obj: object, name: string, callback: (modification: Change) => void, context: Sandbox | IExecContext): {
        unsubscribe: () => void;
    };
    subscribeSetGlobal(obj: object, name: string, callback: (modification: Change) => void): {
        unsubscribe: () => void;
    };
    static audit<T>(code: string, scopes?: (IScope)[]): ExecReturn<T>;
    static parse(code: string): IExecutionTree;
    createContext(context: IContext, executionTree: IExecutionTree): any;
    getContext(fn: (...args: any[]) => any): IExecContext;
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
