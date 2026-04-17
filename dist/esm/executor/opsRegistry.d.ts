import { LispType, IExecContext, Ticks, Scope } from '../utils';
import { LispItem } from '../parser';
import { YieldValue, Done } from './executorUtils';
export type ControlFlowAction = 'break' | 'continue';
export interface ControlFlowTarget {
    label?: string;
    acceptsBreak: boolean;
    acceptsContinue: boolean;
    acceptsUnlabeledBreak: boolean;
    acceptsUnlabeledContinue: boolean;
}
export type ControlFlowTargets = readonly ControlFlowTarget[] | undefined;
export type Execution = <T = any>(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done<T>, statementLabels: ControlFlowTargets, internal: boolean, generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined) => void;
export type OpsCallbackParams<a, b, obj, bobj> = {
    op: LispType;
    exec: Execution;
    a: a;
    b: b;
    obj: obj;
    bobj: bobj;
    ticks: Ticks;
    tree: LispItem;
    scope: Scope;
    context: IExecContext;
    done: Done;
    statementLabels: ControlFlowTargets;
    internal: boolean;
    generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined;
};
type OpCallback<a, b, obj, bobj> = (params: OpsCallbackParams<a, b, obj, bobj>) => void;
export declare const ops: Map<LispType, OpCallback<any, any, any, any>>;
export declare function addOps<a = unknown, b = unknown, obj = unknown, bobj = unknown>(type: LispType, cb: OpCallback<a, b, obj, bobj>): void;
export {};
