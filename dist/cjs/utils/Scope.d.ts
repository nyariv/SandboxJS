import { VarType, IScope } from './types.js';
import { Prop } from './Prop.js';
export type Unknown = undefined | null | Record<string | number, unknown>;
export declare class Scope {
    parent: Scope | null;
    const: {
        [key: string]: true;
    };
    let: {
        [key: string]: true;
    };
    var: {
        [key: string]: true;
    };
    internal: {
        [key: string]: true;
    };
    globals: {
        [key: string]: true;
    };
    allVars: {
        [key: string]: unknown;
    } & object;
    internalVars: {
        [key: string]: unknown;
    };
    functionThis?: Unknown;
    constructor(parent: Scope | null, vars?: {}, functionThis?: Unknown);
    get(key: string, internal: boolean): Prop;
    set(key: string, val: unknown, internal: boolean): Prop<unknown>;
    getWhereValScope(key: string, isThis: boolean, internal: boolean): Scope | null;
    getWhereVarScope(key: string, localScope: boolean, internal: boolean): Scope;
    declare(key: string, type: VarType, value: unknown, isGlobal: boolean, internal: boolean): Prop;
}
export declare class FunctionScope implements IScope {
}
export declare class LocalScope implements IScope {
}
