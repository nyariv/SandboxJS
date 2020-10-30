import { LispItem } from "./parser.js";
import { IExecContext, IContext } from "./Sandbox.js";
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
    const: Set<string>;
    let: Set<string>;
    var: Set<string>;
    globals: Set<string>;
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
export declare function createFunction(argNames: string[], parsed: LispItem, context: IExecContext, scope?: Scope, name?: string): (...args: any[]) => any;
export declare function createFunctionAsync(argNames: string[], parsed: LispItem, context: IExecContext, scope?: Scope, name?: string): (...args: any[]) => Promise<any>;
export declare function sandboxedEval(func: SandboxFunction): sandboxedEval;
export declare function sandboxedSetTimeout(func: SandboxFunction): sandboxSetTimeout;
export declare function sandboxedSetInterval(func: SandboxFunction): sandboxSetInterval;
export declare function executeTree(context: IExecContext, executionTree: LispItem, scopes?: ({
    [key: string]: any;
} | Scope)[], inLoopOrSwitch?: string): ExecReturn;
export declare function executeTreeAsync(context: IExecContext, executionTree: LispItem, scopes?: ({
    [key: string]: any;
} | Scope)[], inLoopOrSwitch?: string): Promise<ExecReturn>;
export {};
