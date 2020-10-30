import { IGlobals, replacementCallback, IAuditReport, Scope, Change, ExecReturn } from "./executor.js";
import { IConstants, IExecutionTree } from "./parser.js";
export interface IOptions {
    audit?: boolean;
    forbidMethodCalls?: boolean;
    prototypeReplacements?: Map<Function, replacementCallback>;
    prototypeWhitelist?: Map<Function, Set<string>>;
    globals: IGlobals;
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
export interface IExecContext {
    ctx: IContext;
    inLoopOrSwitch?: string;
    constants: IConstants;
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
    compile(code: string): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => any;
    compileAsync(code: string): (...scopes: ({
        [prop: string]: any;
    } | Scope)[]) => Promise<any>;
}
