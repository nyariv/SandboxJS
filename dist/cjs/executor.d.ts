import { LispItem, Lisp } from './parser.js';
import { LispType, Prop, Scope, IAuditReport, IExecContext, IScope, Ticks } from './utils.js';
export type Done<T = any> = (err?: any, res?: T | typeof optional) => void;
export type ControlFlowAction = 'break' | 'continue';
export interface ControlFlowSignal {
    type: ControlFlowAction;
    label?: string;
}
interface ControlFlowTarget {
    label?: string;
    acceptsBreak: boolean;
    acceptsContinue: boolean;
    acceptsUnlabeledBreak: boolean;
    acceptsUnlabeledContinue: boolean;
}
export type ControlFlowTargets = readonly ControlFlowTarget[] | undefined;
export declare class ExecReturn<T> {
    auditReport: IAuditReport | undefined;
    result: T;
    returned: boolean;
    controlFlow?: ControlFlowSignal | undefined;
    constructor(auditReport: IAuditReport | undefined, result: T, returned: boolean, controlFlow?: ControlFlowSignal | undefined);
    get breakLoop(): boolean;
    get continueLoop(): boolean;
}
export type Unknown = undefined | null | Record<string | number, unknown>;
export interface IChange {
    type: string;
}
export interface ICreate extends IChange {
    type: 'create';
    prop: number | string;
}
export interface IReplace extends IChange {
    type: 'replace';
}
export interface IDelete extends IChange {
    type: 'delete';
    prop: number | string;
}
export interface IReverse extends IChange {
    type: 'reverse';
}
export interface ISort extends IChange {
    type: 'sort';
}
export interface IPush extends IChange {
    type: 'push';
    added: unknown[];
}
export interface IPop extends IChange {
    type: 'pop';
    removed: unknown[];
}
export interface IShift extends IChange {
    type: 'shift';
    removed: unknown[];
}
export interface IUnShift extends IChange {
    type: 'unshift';
    added: unknown[];
}
export interface ISplice extends IChange {
    type: 'splice';
    startIndex: number;
    deleteCount: number;
    added: unknown[];
    removed: unknown[];
}
export interface ICopyWithin extends IChange {
    type: 'copyWithin';
    startIndex: number;
    endIndex: number;
    added: unknown[];
    removed: unknown[];
}
export type Change = ICreate | IReplace | IDelete | IReverse | ISort | IPush | IPop | IUnShift | IShift | ISplice | ICopyWithin;
declare const optional: {};
export declare function createFunction(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string, internal?: boolean): (...args: unknown[]) => unknown;
export declare function createFunctionAsync(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string, internal?: boolean): (...args: unknown[]) => Promise<unknown>;
export declare class YieldValue {
    value: unknown;
    delegate: boolean;
    constructor(value: unknown, delegate: boolean);
}
export declare function createGeneratorFunction(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string, internal?: boolean): (this: Unknown, ...args: unknown[]) => Iterator<unknown, any, any> & Iterable<unknown>;
export declare function createAsyncGeneratorFunction(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string, internal?: boolean): (this: Unknown, ...args: unknown[]) => AsyncGenerator;
export declare function assignCheck(obj: Prop, context: IExecContext, op?: string): void;
export declare class KeyVal {
    key: PropertyKey | SpreadObject;
    val: unknown;
    constructor(key: PropertyKey | SpreadObject, val: unknown);
}
export declare class SpreadObject {
    item: {
        [key: string]: unknown;
    };
    constructor(item: {
        [key: string]: unknown;
    });
}
export declare class SpreadArray {
    item: unknown[];
    constructor(item: unknown[]);
}
export declare class If {
    t: Lisp;
    f: Lisp;
    label?: string | undefined;
    constructor(t: Lisp, f: Lisp, label?: string | undefined);
}
type OpCallback<a, b, obj, bobj> = (params: OpsCallbackParams<a, b, obj, bobj>) => void;
export declare const ops: Map<LispType, OpCallback<any, any, any, any>>;
export declare function addOps<a = unknown, b = unknown, obj = unknown, bobj = unknown>(type: LispType, cb: OpCallback<a, b, obj, bobj>): void;
export declare function execMany(ticks: Ticks, exec: Execution, tree: Lisp[], done: Done, scope: Scope, context: IExecContext, statementLabels: ControlFlowTargets, internal: boolean, generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined): void;
type Execution = <T = any>(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done<T>, statementLabels: ControlFlowTargets, internal: boolean, generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined) => void;
export interface AsyncDoneRet {
    isInstant: boolean;
    instant: any;
    p: Promise<{
        result: any;
    }>;
}
export declare function asyncDone(callback: (done: Done) => void): AsyncDoneRet;
export declare function syncDone(callback: (done: Done) => void): {
    result: any;
};
export declare function execAsync<T = any>(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, doneOriginal: Done<T>, statementLabels: ControlFlowTargets, internal: boolean, generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined): Promise<void>;
export declare function execSync<T = any>(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done<T>, statementLabels: ControlFlowTargets, internal: boolean, generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined): void;
type OpsCallbackParams<a, b, obj, bobj> = {
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
export declare function executeTree<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: IScope[] | undefined, statementLabels: ControlFlowTargets, internal: boolean, generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined): ExecReturn<T>;
export declare function executeTreeAsync<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: IScope[] | undefined, statementLabels: ControlFlowTargets, internal: boolean, generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined): Promise<ExecReturn<T>>;
export {};
