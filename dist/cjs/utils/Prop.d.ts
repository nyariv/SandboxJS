import { IExecContext } from './types.js';
export declare class Prop<T = unknown> {
    context: T;
    prop: PropertyKey;
    isConst: boolean;
    isGlobal: boolean;
    isVariable: boolean;
    isInternal: boolean;
    constructor(context: T, prop: PropertyKey, isConst?: boolean, isGlobal?: boolean, isVariable?: boolean, isInternal?: boolean);
    get<T = unknown>(context: IExecContext): T;
}
export declare function hasOwnProperty(obj: unknown, prop: PropertyKey): boolean;
export declare function getGlobalProp(val: unknown, context: IExecContext, prop?: Prop): Prop<{
    [x: string]: import('./types.js').ISandboxGlobal;
}> | Prop<{
    [x: string]: Function;
}> | undefined;
