import Sandbox from '../src/Sandbox';
import { SandboxExecutionQuotaExceededError } from '../src/utils';

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
    const { run } = fn();

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
    const { run } = fn();

    const len = await run();

    expect(haltCalled).toBe(true);
    expect(len).toBe(100);
  });

  it('should halt sandbox A when execution quota is exceeded', (done) => {
    const globals = { ...Sandbox.SAFE_GLOBALS, setTimeout, clearTimeout };
    const prototypeWhitelist = Sandbox.SAFE_PROTOTYPES;

    const sandboxA = new Sandbox({
      globals,
      prototypeWhitelist,
      executionQuota: 50n,
      haltOnSandboxError: true,
    });
    let haltedA = false;
    sandboxA.subscribeHalt(() => {
      haltedA = true;
    });

    const sandboxB = new Sandbox({ globals, prototypeWhitelist });

    // Sandbox A schedules a heavy string handler
    sandboxA
      .compile(
        'setTimeout("let x=0; for (let i=0;i<200;i++){ x += i } globalThis.doneA = true;", 0);',
      )()
      .run();

    // Run sandbox B before A's timer fires
    sandboxB.compile('1+1')().run();

    setTimeout(() => {
      expect(haltedA).toBe(true);
      expect(sandboxA.context.sandboxGlobal.doneA).toBeUndefined();
      done();
    }, 50);
  });
});
