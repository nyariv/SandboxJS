import { IExecContext, IOptionParams, IScope } from './utils';
import { ExecReturn } from './executor';
import { default as SandboxExec } from './SandboxExec';
export { ParseError } from './parser';
export { LocalScope, SandboxExecutionTreeError, SandboxCapabilityError, SandboxAccessError, SandboxExecutionQuotaExceededError, SandboxError, delaySynchronousResult, } from './utils';
export type * from './utils';
export type * from './parser';
export type * from './executor';
export type * from './eval';
export declare class Sandbox extends SandboxExec {
    constructor(options?: IOptionParams);
    static audit<T>(code: string, scopes?: IScope[]): ExecReturn<T>;
    static parse(code: string): import('./parser').IExecutionTree;
    get Function(): Function;
    get AsyncFunction(): Function;
    get eval(): Function;
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
