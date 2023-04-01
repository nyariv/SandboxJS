import { IEvalContext } from './eval.js';
import { Change, ExecReturn } from './executor.js';
import { IContext, IExecContext, IGlobals, IOptionParams, IScope, SubscriptionSubject } from './utils.js';
export default class SandboxExec {
    evalContext?: IEvalContext | undefined;
    context: IContext;
    setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
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
    getContext(fn: (...args: any[]) => any): IExecContext | undefined;
    executeTree<T>(context: IExecContext, scopes?: IScope[]): ExecReturn<T>;
    executeTreeAsync<T>(context: IExecContext, scopes?: IScope[]): Promise<ExecReturn<T>>;
}
