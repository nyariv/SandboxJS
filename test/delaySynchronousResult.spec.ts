import Sandbox, { delaySynchronousResult } from '../src/Sandbox.js';
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('delaySynchronousResult', () => {
  it('delivers a value from a setTimeout without async/await in sandbox code', async () => {
    const fetchValue = () =>
      delaySynchronousResult(async () => {
        await wait(10);
        return 42;
      });
    const sandbox = new Sandbox();
    const scope = { fetchValue };

    const result = await sandbox.compileAsync<number>('return fetchValue();')(scope).run();
    expect(result).toBe(42);
  });

  it('sandbox code does not need await to get the delayed result', async () => {
    const results: number[] = [];
    const loadItem = (n: number) =>
      delaySynchronousResult(async () => {
        await wait(10);
        return n * 10;
      });
    const sandbox = new Sandbox();
    const scope = { loadItem, results };

    // Note: no await in the sandbox code — delaySynchronousResult handles it
    await sandbox
      .compileAsync(
        `
        const a = loadItem(1);
        const b = loadItem(2);
        results.push(a, b);
      `,
      )(scope)
      .run();

    expect(results).toEqual([10, 20]);
  });

  it('sequences delayed setTimeout calls in order without await', async () => {
    const order: string[] = [];
    const step = (label: string) =>
      delaySynchronousResult(async () => {
        await wait(10);
        order.push(label);
        return label;
      });
    const sandbox = new Sandbox();
    const scope = { step, order };

    const ret = await sandbox
      .compileAsync(
        `
        return step('a') + step('b') + step('c');
      `,
      )(scope)
      .run();

    expect(order).toEqual(['a', 'b', 'c']);
    expect(ret).toEqual('abc');
  });

  it('propagates a setTimeout rejection without await in sandbox code', async () => {
    const failAfterDelay = () =>
      delaySynchronousResult(async () => {
        await wait(10);
        throw new Error('timeout error');
      });
    const sandbox = new Sandbox();
    const scope = { failAfterDelay };

    await expect(
      sandbox.compileAsync<never>('return failAfterDelay();')(scope).run(),
    ).rejects.toThrow('timeout error');
  });

  it('can catch a delayed setTimeout rejection inside sandbox code', async () => {
    const failAfterDelay = () =>
      delaySynchronousResult(async () => {
        await wait(10);
        throw new Error('oops');
      });
    const sandbox = new Sandbox();
    const scope = { failAfterDelay, msg: '' };

    await sandbox
      .compileAsync(
        `
        try {
          failAfterDelay();
        } catch (e) {
          msg = e.message;
        }
      `,
      )(scope)
      .run();

    expect(scope.msg).toBe('oops');
  });

  it('works via a method on an object', async () => {
    const api = {
      fetch: (val: number) =>
        delaySynchronousResult(async () => {
          await wait(10);
          return val;
        }),
    };
    const sandbox = new Sandbox();
    const scope = { api };

    const result = await sandbox.compileAsync<number>('return api.fetch(99);')(scope).run();
    expect(result).toBe(99);
  });
});
