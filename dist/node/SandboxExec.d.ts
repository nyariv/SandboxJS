import { IEvalContext } from './eval.js';
import { Change, ExecReturn } from './executor.js';
import { IContext, IExecContext, IGlobals, IOptionParams, IScope, Scope, SubscriptionSubject, Ticks } from './utils.js';
export { IOptions, IContext, IExecContext, LocalScope, SandboxExecutionTreeError, SandboxCapabilityError, SandboxAccessError, SandboxError, } from './utils.js';
export default class SandboxExec {
    evalContext?: IEvalContext | undefined;
    readonly context: IContext;
    readonly setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    readonly changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    readonly sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
    private haltSubscriptions;
    private resumeSubscriptions;
    halted: boolean;
    timeoutHandleCounter: number;
    readonly setTimeoutHandles: Map<number, NodeJS.Timeout>;
    readonly setIntervalHandles: Map<number, {
        handle: ReturnType<typeof setInterval>;
        haltsub: {
            unsubscribe: () => void;
        };
        contsub: {
            unsubscribe: () => void;
        };
    }>;
    constructor(options?: IOptionParams, evalContext?: IEvalContext | undefined);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): Map<any, Set<string>>;
    subscribeGet(callback: (obj: SubscriptionSubject, name: string) => void, context: IExecContext): {
        unsubscribe: () => void;
    };
    subscribeSet(obj: object, name: string, callback: (modification: Change) => void, context: SandboxExec | IExecContext): {
        unsubscribe: () => void;
    };
    subscribeSetGlobal(obj: SubscriptionSubject, name: string, callback: (modification: Change) => void): {
        unsubscribe: () => void;
    };
    subscribeHalt(cb: (args?: {
        error: Error;
        ticks: Ticks;
        scope: Scope;
        context: IExecContext;
    }) => void): {
        unsubscribe: () => void;
    };
    subscribeResume(cb: () => void): {
        unsubscribe: () => void;
    };
    haltExecution(haltContext?: {
        error: Error;
        ticks: Ticks;
        scope: Scope;
        context: IExecContext;
    }): void;
    resumeExecution(): void;
    getContext(fn: (...args: any[]) => any): IExecContext | undefined;
    executeTree<T>(context: IExecContext, scopes?: IScope[]): ExecReturn<T>;
    executeTreeAsync<T>(context: IExecContext, scopes?: IScope[]): Promise<ExecReturn<T>>;
}
