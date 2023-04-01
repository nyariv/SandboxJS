import { createExecContext, IExecContext, IOptionParams, IScope } from './utils.js';
import { createEvalContext } from './eval.js';
import { ExecReturn } from './executor.js';
import parse from './parser.js';
import SandboxExec from './SandboxExec.js';

export default class Sandbox extends SandboxExec {
  constructor(options?: IOptionParams) {
    super(options, createEvalContext());
  }

  static audit<T>(code: string, scopes: IScope[] = []): ExecReturn<T> {
    const globals: Record<string, unknown> = {};
    for (const i of Object.getOwnPropertyNames(globalThis) as [keyof typeof globalThis]) {
      globals[i] = globalThis[i];
    }
    const sandbox = new SandboxExec({
      globals,
      audit: true,
    });
    return sandbox.executeTree(
      createExecContext(sandbox, parse(code, true), createEvalContext()),
      scopes
    );
  }

  static parse(code: string) {
    return parse(code);
  }

  compile<T>(
    code: string,
    optimize = false
  ): (...scopes: IScope[]) => { context: IExecContext; run: () => T } {
    const parsed = parse(code, optimize);
    const exec = (...scopes: IScope[]) => {
      const context = createExecContext(this, parsed, this.evalContext);
      return { context, run: () => this.executeTree<T>(context, [...scopes]).result };
    };
    return exec;
  }

  compileAsync<T>(
    code: string,
    optimize = false
  ): (...scopes: IScope[]) => { context: IExecContext; run: () => Promise<T> } {
    const parsed = parse(code, optimize);
    const exec = (...scopes: IScope[]) => {
      const context = createExecContext(this, parsed, this.evalContext);
      return {
        context,
        run: () => this.executeTreeAsync<T>(context, [...scopes]).then((ret) => ret.result),
      };
    };
    return exec;
  }

  compileExpression<T>(
    code: string,
    optimize = false
  ): (...scopes: IScope[]) => { context: IExecContext; run: () => T } {
    const parsed = parse(code, optimize, true);
    const exec = (...scopes: IScope[]) => {
      const context = createExecContext(this, parsed, this.evalContext);
      return { context, run: () => this.executeTree<T>(context, [...scopes]).result };
    };
    return exec;
  }

  compileExpressionAsync<T>(
    code: string,
    optimize = false
  ): (...scopes: IScope[]) => { context: IExecContext; run: () => Promise<T> } {
    const parsed = parse(code, optimize, true);
    const exec = (...scopes: IScope[]) => {
      const context = createExecContext(this, parsed, this.evalContext);
      return {
        context,
        run: () => this.executeTreeAsync<T>(context, [...scopes]).then((ret) => ret.result),
      };
    };
    return exec;
  }
}
