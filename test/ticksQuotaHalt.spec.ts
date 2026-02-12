import Sandbox from '../src/Sandbox';
import { SandboxExecutionQuotaExceededError, Scope } from '../src/utils';

describe('ticks quota halt', () => {
  it('should trigger halt subscription when tick quota is exceeded', async () => {
    const sandbox = new Sandbox({
      haltOnSandboxError: true,
      executionQuota: BigInt(100),
    });
    let haltCalled = false;

    sandbox.subscribeHalt((params) => {
      if (params && params.error instanceof SandboxExecutionQuotaExceededError) {
        haltCalled = true;
      }
    });

    const code = `
      let str = '';
      for (let i = 0; i < 1000; i++) {
        str += 'a';
      }
    `;
    const fn = sandbox.compile(code);
    const { context, run } = fn();

    run();

    expect(haltCalled).toBe(true);
  });

  it('should allow resuming after tick quota halt', async () => {
    const sandbox = new Sandbox({
      haltOnSandboxError: true,
      executionQuota: BigInt(100),
    });
    let haltCalled = false;
    sandbox.subscribeHalt((params) => {
      if (params && params.error instanceof SandboxExecutionQuotaExceededError) {
        haltCalled = true;
        params.ticks.tickLimit = params.ticks.ticks + BigInt(10000); // Increase tick limit to allow resuming
        sandbox.resumeExecution();
      }
    });

    const code = `
      let str = '';
      for (let i = 0; i < 100; i++) {
        str += 'a';
      }
      return str.length;
    `;
    const fn = sandbox.compileAsync(code);
    const { context, run } = fn();

    const len = await run();

    expect(haltCalled).toBe(true);
    expect(len).toBe(100);
  });
});
