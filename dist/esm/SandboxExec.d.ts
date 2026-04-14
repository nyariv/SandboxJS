import { IEvalContext } from './eval';
import { Change, ExecReturn } from './executor';
import { IContext, IExecContext, IGlobals, IOptionParams, IScope, ISymbolWhitelist, SubscriptionSubject, HaltContext } from './utils';
export type { IOptions, IContext, IExecContext } from './utils';
export { LocalScope, SandboxExecutionTreeError, SandboxCapabilityError, SandboxAccessError, SandboxError, SandboxHaltError, } from './utils';
export declare class SandboxExec {
    evalContext?: IEvalContext | undefined;
    readonly context: IContext;
    readonly setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    readonly changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    readonly sandboxFunctions: WeakMap<Function, IExecContext>;
    private haltSubscriptions;
    private resumeSubscriptions;
    halted: boolean;
    timeoutHandleCounter: number;
    readonly setTimeoutHandles: Map<number, {
        handle: number;
        haltsub: {
            unsubscribe: () => void;
        };
        contsub: {
            unsubscribe: () => void;
        };
    }>;
    readonly setIntervalHandles: Map<number, {
        handle: number;
        haltsub: {
            unsubscribe: () => void;
        };
        contsub: {
            unsubscribe: () => void;
        };
    }>;
    constructor(options?: IOptionParams, evalContext?: IEvalContext | undefined);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_SYMBOLS(): ISymbolWhitelist;
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
    subscribeHalt(cb: (context: HaltContext) => void): {
        unsubscribe: () => void;
    };
    subscribeResume(cb: () => void): {
        unsubscribe: () => void;
    };
    haltExecution(haltContext?: HaltContext): void;
    resumeExecution(): void;
    getContext(fn: (...args: any[]) => any): IExecContext | undefined;
    executeTree<T>(context: IExecContext, scopes?: IScope[]): ExecReturn<T>;
    executeTreeAsync<T>(context: IExecContext, scopes?: IScope[]): Promise<ExecReturn<T>>;
}
export default SandboxExec;
