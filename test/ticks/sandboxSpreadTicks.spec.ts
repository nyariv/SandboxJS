import Sandbox from '../../src/Sandbox.js';

describe('spread ticks', () => {
  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({ executionQuota: quota, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  it('spread into array literal halts on large array', () => {
    const arr = Array.from({ length: 200 }, (_, i) => i);
    expect(haltsWithQuota('return [...arr]', 10n, { arr })).toBe(true);
  });

  it('spread into array literal does not halt on small array', () => {
    const arr = [1, 2, 3];
    expect(haltsWithQuota('return [...arr]', 50n, { arr })).toBe(false);
  });

  it('spread into function call halts on large array', () => {
    const arr = Array.from({ length: 200 }, (_, i) => i);
    expect(haltsWithQuota('return Math.max(...arr)', 10n, { arr })).toBe(true);
  });

  it('spread into function call does not halt on small array', () => {
    const arr = [1, 2, 3];
    expect(haltsWithQuota('return Math.max(...arr)', 50n, { arr })).toBe(false);
  });

  it('object spread halts on large object', () => {
    const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
    expect(haltsWithQuota('return {...obj}', 10n, { obj })).toBe(true);
  });

  it('object spread does not halt on small object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(haltsWithQuota('return {...obj}', 50n, { obj })).toBe(false);
  });

  it('spread of generator halts on large generator', () => {
    expect(
      haltsWithQuota(
        'function* gen() { for (let i = 0; i < 200; i++) yield i; } return [...gen()]',
        10n,
      ),
    ).toBe(true);
  });

  it('spread of generator does not halt on small generator', () => {
    expect(
      haltsWithQuota('function* gen() { yield 1; yield 2; yield 3; } return [...gen()]', 50n),
    ).toBe(false);
  });

  it('multiple array spreads accumulate ticks', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(haltsWithQuota('return [...a]', 20n, { a })).toBe(false);
    expect(haltsWithQuota('return [...a, ...b]', 10n, { a, b })).toBe(true);
  });

  it('spread into user-defined function halts on large array', () => {
    const big = Array.from({ length: 200 }, (_, i) => i);
    expect(
      haltsWithQuota('function f(...args) { return args.length } return f(...big)', 10n, { big }),
    ).toBe(true);
  });

  it('spread into user-defined function does not halt on small array', () => {
    const arr = [1, 2, 3];
    expect(
      haltsWithQuota('function f(...args) { return args.length } return f(...arr)', 20n, { arr }),
    ).toBe(false);
  });

  it('multiple object spreads accumulate ticks', () => {
    const o1 = { a: 1, b: 2 };
    const o2 = { c: 3, d: 4 };
    expect(haltsWithQuota('return {...o1}', 20n, { o1 })).toBe(false);
    expect(haltsWithQuota('return {...o1, ...o2}', 10n, { o1, o2 })).toBe(true);
  });

  it('spread combined with non-spread args does not double-count', () => {
    const arr = [1, 2, 3];
    expect(haltsWithQuota('return [0, ...arr, 4]', 20n, { arr })).toBe(false);
  });
});
