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
      if (params.type === 'error' && params.error instanceof SandboxExecutionQuotaExceededError) {
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
      if (params.type === 'error' && params.error instanceof SandboxExecutionQuotaExceededError) {
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

  it('should allow resuming after a quota halt in the middle of sync generator iteration', async () => {
    const sandbox = new Sandbox({
      haltOnSandboxError: true,
    });
    const progress: number[] = [];
    let haltCalled = false;

    const fn = sandbox.compileAsync(`
      function* gen(limit) {
        for (let i = 0; i < limit; i++) {
          let spin = 0;
          for (let j = 0; j < 40; j++) {
            spin += j;
          }
          yield i + spin * 0;
        }
      }

      for (const value of gen(5)) {
        progress.push(value);
        if (progress.length === 2) {
          armQuota();
        }
      }

      return progress.slice();
    `);

    const { context, run } = fn({
      progress,
      armQuota: () => {
        context.ctx.ticks.tickLimit = context.ctx.ticks.ticks + 30n;
      },
    });

    sandbox.subscribeHalt((params) => {
      if (params.type === 'error' && params.error instanceof SandboxExecutionQuotaExceededError) {
        haltCalled = true;
        expect(progress).toEqual([0, 1]);
        params.ticks.tickLimit = params.ticks.ticks + 10000n;
        sandbox.resumeExecution();
      }
    });

    const values = await run();

    expect(haltCalled).toBe(true);
    expect(values).toEqual([0, 1, 2, 3, 4]);
    expect(progress).toEqual([0, 1, 2, 3, 4]);
  });

  it('should allow resuming async generator next() after a quota halt', async () => {
    const sandbox = new Sandbox({
      haltOnSandboxError: true,
    });
    let haltCalled = false;

    const fn = sandbox.compile(`
      async function* gen(limit) {
        for (let i = 0; i < limit; i++) {
          let spin = 0;
          for (let j = 0; j < 40; j++) {
            spin += j;
          }
          yield i + spin * 0;
        }
      }

      return gen(3);
    `);

    const { context, run } = fn();
    const gen = run() as AsyncGenerator<number>;

    expect(await gen.next()).toEqual({ value: 0, done: false });

    sandbox.subscribeHalt((params) => {
      if (params.type === 'error' && params.error instanceof SandboxExecutionQuotaExceededError) {
        haltCalled = true;
        params.ticks.tickLimit = params.ticks.ticks + 10000n;
        sandbox.resumeExecution();
      }
    });

    context.ctx.ticks.tickLimit = context.ctx.ticks.ticks + 30n;

    expect(await gen.next()).toEqual({ value: 1, done: false });
    expect(await gen.next()).toEqual({ value: 2, done: false });
    expect(await gen.next()).toEqual({ value: undefined, done: true });
    expect(haltCalled).toBe(true);
  });

  it('should automatically halt and resume in nonBlocking mode', async () => {
    const sandbox = new Sandbox({
      nonBlocking: true,
    });
    let haltCount = 0;
    let resumeCount = 0;

    sandbox.subscribeHalt(() => {
      haltCount++;
    });
    sandbox.subscribeResume(() => {
      resumeCount++;
    });

    const fn = sandbox.compileAsync(`
      for (let i = 0; i < 20000; i++) {
        total += 1;
      }
      return total;
    `);

    const scope = { total: 0 };

    const { run } = fn(scope);

    const res = run();

    expect(scope.total).toBeLessThan(20000);
    expect(scope.total).toBeGreaterThan(0);

    const result = await res;

    expect(result).toBe(20000);
    expect(haltCount).toBeGreaterThan(0);
    expect(resumeCount).toBeGreaterThan(0);
    expect(resumeCount).toBe(haltCount);
  });

  it('should automatically halt and resume in the middle of generator iteration in nonBlocking mode', async () => {
    const sandbox = new Sandbox({
      nonBlocking: true,
    });
    const progress: number[] = [];
    let haltCount = 0;
    let resumeCount = 0;

    sandbox.subscribeHalt(() => {
      haltCount++;
    });
    sandbox.subscribeResume(() => {
      resumeCount++;
    });

    const fn = sandbox.compileAsync<number[]>(`
      function* gen(limit) {
        for (let i = 0; i < limit; i++) {
          let spin = 0;
          for (let j = 0; j < 60; j++) {
            spin += j;
          }
          yield i + spin * 0;
        }
      }

      for (const value of gen(300)) {
        progress.push(value);
      }

      return progress.slice();
    `);

    const { run } = fn({ progress });
    const values = await run();

    expect(values).toHaveLength(300);
    expect(values[0]).toBe(0);
    expect(values[299]).toBe(299);
    expect(progress).toEqual(values);
    expect(haltCount).toBeGreaterThan(0);
    expect(resumeCount).toBeGreaterThan(0);
    expect(resumeCount).toBe(haltCount);
  });
});
