import { LispItem, Lisp, LispType, LispFamily, ExtractLispOp } from "./parser.js";
import { IExecContext, Ticks } from "./Sandbox.js";
export type SandboxFunction = (code: string, ...args: unknown[]) => () => unknown;
export type sandboxedEval = (code: string) => unknown;
export type sandboxSetTimeout = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type sandboxSetInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]) => any;
export type Done = (err?: unknown, res?: unknown) => void;
export declare class ExecReturn<T> {
    auditReport: IAuditReport;
    result: T;
    returned: boolean;
    breakLoop: boolean;
    continueLoop: boolean;
    constructor(auditReport: IAuditReport, result: T, returned: boolean, breakLoop?: boolean, continueLoop?: boolean);
}
export interface IAuditReport {
    globalsAccess: Set<unknown>;
    prototypeAccess: {
        [name: string]: Set<string>;
    };
}
export interface IGlobals {
    [key: string]: unknown;
}
export interface IChange {
    type: string;
}
export interface ICreate extends IChange {
    type: "create";
    prop: number | string;
}
export interface IReplace extends IChange {
    type: "replace";
}
export interface IDelete extends IChange {
    type: "delete";
    prop: number | string;
}
export interface IReverse extends IChange {
    type: "reverse";
}
export interface ISort extends IChange {
    type: "sort";
}
export interface IPush extends IChange {
    type: "push";
    added: unknown[];
}
export interface IPop extends IChange {
    type: "pop";
    removed: unknown[];
}
export interface IShift extends IChange {
    type: "shift";
    removed: unknown[];
}
export interface IUnShift extends IChange {
    type: "unshift";
    added: unknown[];
}
export interface ISplice extends IChange {
    type: "splice";
    startIndex: number;
    deleteCount: number;
    added: unknown[];
    removed: unknown[];
}
export interface ICopyWithin extends IChange {
    type: "copyWithin";
    startIndex: number;
    endIndex: number;
    added: unknown[];
    removed: unknown[];
}
export type Change = ICreate | IReplace | IDelete | IReverse | ISort | IPush | IPop | IUnShift | IShift | ISplice | ICopyWithin;
export declare class Prop {
    context: {
        [key: string]: any;
    };
    prop: string;
    isConst: boolean;
    isGlobal: boolean;
    isVariable: boolean;
    constructor(context: {
        [key: string]: any;
    }, prop: string, isConst?: boolean, isGlobal?: boolean, isVariable?: boolean);
    get<T = unknown>(context: IExecContext): T;
}
declare enum VarType {
    let = "let",
    const = "const",
    var = "var"
}
export declare class Scope {
    parent: Scope;
    const: {
        [key: string]: true;
    };
    let: {
        [key: string]: true;
    };
    var: {
        [key: string]: true;
    };
    globals: {
        [key: string]: true;
    };
    allVars: {
        [key: string]: unknown;
    } & Object;
    functionThis?: unknown;
    constructor(parent: Scope, vars?: {}, functionThis?: unknown);
    get(key: string, functionScope?: boolean): Prop;
    set(key: string, val: unknown): Prop;
    declare(key: string, type?: VarType, value?: unknown, isGlobal?: boolean): Prop;
}
export interface IScope {
    [key: string]: any;
}
export declare class FunctionScope implements IScope {
}
export declare class LocalScope implements IScope {
}
export declare class SandboxError extends Error {
}
export declare function sandboxFunction(context: IExecContext, ticks?: Ticks): SandboxFunction;
export declare function createFunction(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string): any;
export declare function createFunctionAsync(argNames: string[], parsed: Lisp[], ticks: Ticks, context: IExecContext, scope?: Scope, name?: string): any;
export declare function sandboxedEval(func: SandboxFunction): sandboxedEval;
export declare function sandboxedSetTimeout(func: SandboxFunction): sandboxSetTimeout;
export declare function sandboxedSetInterval(func: SandboxFunction): sandboxSetInterval;
export declare function assignCheck(obj: Prop, context: IExecContext, op?: string): void;
export declare class KeyVal {
    key: string | SpreadObject;
    val: unknown;
    constructor(key: string | SpreadObject, val: unknown);
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
    constructor(t: Lisp, f: Lisp);
}
type OpCallback = (exec: Execution, done: Done, ticks: Ticks, a: any, b: any, obj: any, context: IExecContext, scope: Scope, bobj?: any, inLoopOrSwitch?: string) => void;
export declare const ops: Map<LispType, OpCallback>;
export declare function addOps<Type extends LispFamily>(type: ExtractLispOp<Type>, cb: OpCallback): void;
export declare function execMany(ticks: Ticks, exec: Execution, tree: Lisp[], done: Done, scope: Scope, context: IExecContext, inLoopOrSwitch?: string): void;
type Execution = (ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string) => void;
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
export declare function execAsync(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, doneOriginal: Done, inLoopOrSwitch?: string): Promise<void>;
export declare function execSync(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string): void;
export declare function executeTree<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes?: (IScope)[], inLoopOrSwitch?: string): ExecReturn<T>;
export declare function executeTreeAsync<T>(ticks: Ticks, context: IExecContext, executionTree: Lisp[], scopes?: (IScope)[], inLoopOrSwitch?: string): Promise<ExecReturn<T>>;
export {};
