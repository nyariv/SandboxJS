import { LispItem, Lisp, StatementLabel } from '../parser';
import { LispType, Prop, Scope, IAuditReport, IExecContext, IScope, optional, Ticks } from '../utils';
import { Execution } from './opsRegistry.js';
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
export declare function normalizeStatementLabel(label: StatementLabel | undefined): string | undefined;
export declare function normalizeStatementLabels(label: LispItem | StatementLabel | undefined): string[];
export declare function createLoopTarget(label?: string, acceptsUnlabeled?: boolean): ControlFlowTarget;
export declare function createSwitchTarget(label?: string): ControlFlowTarget;
export declare function createLabeledStatementTarget(label?: string): ControlFlowTarget | undefined;
export declare function addControlFlowTarget(controlFlowTargets: ControlFlowTargets, target?: ControlFlowTarget): ControlFlowTargets;
export declare function addControlFlowTargets(controlFlowTargets: ControlFlowTargets, targets: ControlFlowTarget[]): ControlFlowTargets;
export declare function matchesControlFlowTarget(signal: ControlFlowSignal, target: ControlFlowTarget): boolean;
export declare function findControlFlowTarget(controlFlowTargets: ControlFlowTargets, type: ControlFlowAction, label?: string): ControlFlowTarget | null | undefined;
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
export declare const arrayChange: Set<(() => undefined) | ((...items: never[]) => number) | ((compareFn?: ((a: never, b: never) => number) | undefined) => never[]) | ((target: number, start: number, end?: number) => never[])>;
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
export declare const literalRegex: RegExp;
export { ops, addOps } from './opsRegistry.js';
export declare const prorptyKeyTypes: string[];
export declare function isPropertyKey(val: unknown): val is PropertyKey;
export declare function hasPossibleProperties(val: unknown): val is {};
export declare function execMany(ticks: Ticks, exec: Execution, tree: Lisp[], done: Done, scope: Scope, context: IExecContext, statementLabels: ControlFlowTargets, internal: boolean, generatorYield: ((yv: YieldValue, done?: Done) => void) | undefined): void;
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
export declare function checkHaltExpectedTicks(params: OpsCallbackParams<any, any, any, any>, expectTicks?: bigint): boolean;
export declare function executeTree<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: IScope[] | undefined, statementLabels: ControlFlowTargets, internal: boolean, generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined): ExecReturn<T>;
export declare function executeTreeAsync<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: IScope[] | undefined, statementLabels: ControlFlowTargets, internal: boolean, generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined): Promise<ExecReturn<T>>;
export declare function executeTreeWithDone(exec: Execution, done: Done, ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes: IScope[] | undefined, statementLabels: ControlFlowTargets, internal: boolean, generatorYield?: ((yv: YieldValue, done?: Done) => void) | undefined): void;
