import { IExecContext, IOptionParams, IScope } from './utils.js';
import { ExecReturn } from './executor.js';
import SandboxExec from './SandboxExec.js';
export default class Sandbox extends SandboxExec {
    constructor(options?: IOptionParams);
    static audit<T>(code: string, scopes?: IScope[]): ExecReturn<T>;
    static parse(code: string): import("./parser.js").IExecutionTree;
    compile<T>(code: string, optimize?: boolean): (...scopes: IScope[]) => {
        context: IExecContext;
        run: () => T;
    };
    compileAsync<T>(code: string, optimize?: boolean): (...scopes: IScope[]) => {
        context: IExecContext;
        run: () => Promise<T>;
    };
    compileExpression<T>(code: string, optimize?: boolean): (...scopes: IScope[]) => {
        context: IExecContext;
        run: () => T;
    };
    compileExpressionAsync<T>(code: string, optimize?: boolean): (...scopes: IScope[]) => {
        context: IExecContext;
        run: () => Promise<T>;
    };
}
