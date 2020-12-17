import { LispItem, Lisp, LispArray } from "./parser.js";
import { IExecContext, IContext, Ticks } from "./Sandbox.js";
export declare type SandboxFunction = (code: string, ...args: any[]) => () => any;
export declare type sandboxedEval = (code: string) => any;
export declare type sandboxSetTimeout = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export declare type sandboxSetInterval = (handler: TimerHandler, timeout?: any, ...args: any[]) => any;
export declare type Done = (err?: any, res?: any) => void;
export declare class ExecReturn {
    auditReport: IAuditReport;
    result: any;
    returned: boolean;
    breakLoop: boolean;
    continueLoop: boolean;
    constructor(auditReport: IAuditReport, result: any, returned: boolean, breakLoop?: boolean, continueLoop?: boolean);
}
export interface IAuditReport {
    globalsAccess: Set<any>;
    prototypeAccess: {
        [name: string]: Set<string>;
    };
}
export interface IGlobals {
    [key: string]: any;
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
export declare type Change = ICreate | IReplace | IDelete | IReverse | ISort | IPush | IPop | IUnShift | IShift | ISplice | ICopyWithin;
export declare type replacementCallback = (obj: any, isStaticAccess: boolean) => any;
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
}
declare enum VarType {
    let = "let",
    const = "const",
    var = "var"
}
export declare class Scope {
    parent: Scope;
    const: {
        [key: string]: any;
    };
    let: {
        [key: string]: any;
    };
    var: {
        [key: string]: any;
    };
    globals: {
        [key: string]: any;
    };
    allVars: {
        [key: string]: any;
    } & Object;
    functionThis?: any;
    constructor(parent: Scope, vars?: {}, functionThis?: any);
    get(key: string, functionScope?: boolean): any;
    set(key: string, val: any): any;
    declare(key: string, type?: VarType, value?: any, isGlobal?: boolean): any;
}
export declare class SandboxError extends Error {
}
export declare function sandboxFunction(context: IContext): SandboxFunction;
export declare function createFunction(argNames: string[], parsed: LispItem, ticks: Ticks, context: IExecContext, scope?: Scope, name?: string): any;
export declare function createFunctionAsync(argNames: string[], parsed: LispItem, ticks: Ticks, context: IExecContext, scope?: Scope, name?: string): any;
export declare function sandboxedEval(func: SandboxFunction): sandboxedEval;
export declare function sandboxedSetTimeout(func: SandboxFunction): sandboxSetTimeout;
export declare function sandboxedSetInterval(func: SandboxFunction): sandboxSetInterval;
export declare function assignCheck(obj: Prop, context: IExecContext, op?: string): void;
declare type OpCallback = (exec: Execution, done: Done, ticks: Ticks, a: LispItem | string[], b: LispItem | Lisp[], obj: Prop | any | undefined, context: IExecContext, scope: Scope, bobj?: Prop | any | undefined, inLoopOrSwitch?: string) => void;
export declare let ops: Map<string, OpCallback>;
export declare function execMany(ticks: Ticks, exec: Execution, tree: LispArray, done: Done, scope: Scope, context: IExecContext, inLoopOrSwitch?: string): void;
declare type Execution = (ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string) => void;
export declare function asyncDone(callback: (done: Done) => void): Promise<{
    result: any;
}>;
export declare function syncDone(callback: (done: Done) => void): {
    result: any;
};
export declare function execAsync(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string): Promise<void>;
export declare function execSync(ticks: Ticks, tree: LispItem, scope: Scope, context: IExecContext, done: Done, inLoopOrSwitch?: string): void;
export declare function executeTree(ticks: Ticks, context: IExecContext, executionTree: LispItem, scopes?: ({
    [key: string]: any;
} | Scope)[], inLoopOrSwitch?: string): ExecReturn;
export declare function executeTreeAsync(ticks: Ticks, context: IExecContext, executionTree: LispItem, scopes?: ({
    [key: string]: any;
} | Scope)[], inLoopOrSwitch?: string): Promise<ExecReturn>;
export {};
