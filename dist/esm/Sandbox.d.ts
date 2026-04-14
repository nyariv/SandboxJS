import { IExecContext, IOptionParams, IScope } from './utils';
import { ExecReturn } from './executor';
import { default as SandboxExec } from './SandboxExec';
export { LocalScope, SandboxExecutionTreeError, SandboxCapabilityError, SandboxAccessError, SandboxExecutionQuotaExceededError, SandboxError, SandboxHaltError, delaySynchronousResult, } from './utils';
export declare class Sandbox extends SandboxExec {
    constructor(options?: IOptionParams);
    static audit<T>(code: string, scopes?: IScope[]): ExecReturn<T>;
    static parse(code: string): import('./parser').IExecutionTree;
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
export default Sandbox;
