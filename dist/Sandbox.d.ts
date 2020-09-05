import { IGlobals, replacementCallback, IAuditReport, Scope, Change, ExecReturn } from "./executor.js";
import { ILiteral, IExecutionTree, IRegEx } from "./parser.js";
export interface IOptions {
    audit?: boolean;
    forbidMethodCalls?: boolean;
}
export interface IContext {
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
    regexes?: IRegEx[];
    getSubscriptions: Set<(obj: object, name: string) => void>;
    setSubscriptions: WeakMap<object, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<object, Set<(modification: Change) => void>>;
    inLoopOrSwitch: string;
}
export declare class SandboxGlobal {
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
