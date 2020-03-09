export interface IOptions {
    audit?: boolean;
}
export interface IAuditReport {
    globalAccess: Set<any>;
    prototypeAccessL: {
        [name: string]: Set<string>;
    };
}
export interface IAuditResult {
    auditReport: IAuditReport;
    res: any;
}
interface IGlobals {
    [key: string]: any;
}
interface IContext {
    sandbox: Sandbox;
    globals: IGlobals;
    prototypeWhitelist: Map<any, string[]>;
    globalScope: Scope;
    globalProp: Prop;
    options: IOptions;
    Function?: Function;
    eval?: (str: string) => any;
    auditReport?: any;
    literals?: any[];
    strings?: string[];
}
declare class Prop {
    context: {
        [key: string]: any;
    };
    prop: string;
    isConst: boolean;
    isGlobal: boolean;
    constructor(context: Object, prop: string, isConst?: boolean, isGlobal?: boolean);
}
declare class Scope {
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
    functionScope: boolean;
    constructor(parent: Scope, functionScope?: boolean, vars?: {});
    get(key: string, functionScope?: boolean): any;
    set(key: string, val: any): any;
    declare(key: string, type?: string, value?: any): void;
}
export default class Sandbox {
    context: IContext;
    constructor(globals?: IGlobals, prototypeWhitelist?: Map<any, string[]>, options?: IOptions);
    static get SAFE_GLOBALS(): IGlobals;
    static get SAFE_PROTOTYPES(): {
        [name: string]: any;
    };
    static audit(code: string): IAuditResult;
    parse(code: string): (...scopes: {
        [key: string]: any;
    }[]) => any;
}
export {};
