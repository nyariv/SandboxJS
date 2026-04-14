import { IEvalContext } from '../eval';
import { Change } from '../executor';
import { IConstants, IExecutionTree, Lisp, LispItem } from '../parser';
import { default as SandboxExec } from '../SandboxExec';
import { IContext, IExecContext, IOptions, ISandboxGlobal, SandboxSymbolContext, SubscriptionSubject } from './types';
export declare class ExecContext implements IExecContext {
    ctx: IContext;
    constants: IConstants;
    tree: Lisp[];
    getSubscriptions: Set<(obj: SubscriptionSubject, name: string) => void>;
    setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    setSubscriptionsGlobal: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    changeSubscriptionsGlobal: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    evals: Map<any, any>;
    registerSandboxFunction: (fn: (...args: any[]) => any) => void;
    allowJit: boolean;
    evalContext?: IEvalContext | undefined;
    constructor(ctx: IContext, constants: IConstants, tree: Lisp[], getSubscriptions: Set<(obj: SubscriptionSubject, name: string) => void>, setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>, changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>, setSubscriptionsGlobal: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>, changeSubscriptionsGlobal: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>, evals: Map<any, any>, registerSandboxFunction: (fn: (...args: any[]) => any) => void, allowJit: boolean, evalContext?: IEvalContext | undefined);
}
export declare function getSandboxSymbolCtor(symbols: SandboxSymbolContext): Function;
interface SandboxGlobalConstructor {
    new (): ISandboxGlobal;
}
export declare function sandboxedGlobal(globals: ISandboxGlobal): SandboxGlobalConstructor;
export declare function createContext(sandbox: SandboxExec, options: IOptions): IContext;
export declare function createExecContext(sandbox: {
    readonly setSubscriptions: WeakMap<SubscriptionSubject, Map<string, Set<(modification: Change) => void>>>;
    readonly changeSubscriptions: WeakMap<SubscriptionSubject, Set<(modification: Change) => void>>;
    readonly sandboxFunctions: WeakMap<(...args: any[]) => any, IExecContext>;
    readonly context: IContext;
}, executionTree: IExecutionTree, evalContext?: IEvalContext): IExecContext;
export declare function isLisp<Type extends Lisp = Lisp>(item: LispItem | LispItem): item is Type;
export {};
