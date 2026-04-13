import Sandbox from '../../src/Sandbox.js';

describe('object ticks', () => {
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

  describe('O(1) — Object.is, hasOwnProperty, isPrototypeOf', () => {
    it('Object.is does not halt on a large object (always 1 tick)', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return Object.is(obj, obj)', 50n, { obj })).toBe(false);
    });

    it('hasOwnProperty does not halt on an object with many keys (always 1 tick)', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return obj.hasOwnProperty("k0")', 50n, { obj })).toBe(false);
    });

    it('O(1) does not halt at quota that halts O(n) on same object', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return Object.keys(obj)', 50n, { obj })).toBe(true);
      expect(haltsWithQuota('return obj.hasOwnProperty("k0")', 50n, { obj })).toBe(false);
    });
  });

  describe('O(n) static — Object.keys, Object.values, Object.entries, etc.', () => {
    it('does not halt on a small object within quota', () => {
      expect(haltsWithQuota('return Object.keys(obj)', 100n, { obj: { a: 1, b: 2 } })).toBe(false);
    });

    it('Object.keys halts on an object with many keys', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return Object.keys(obj)', 10n, { obj })).toBe(true);
    });

    it('Object.values halts on an object with many keys', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return Object.values(obj)', 10n, { obj })).toBe(true);
    });

    it('Object.entries halts on an object with many keys', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return Object.entries(obj)', 10n, { obj })).toBe(true);
    });

    it('Object.getOwnPropertyNames halts on an object with many keys', () => {
      const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
      expect(haltsWithQuota('return Object.getOwnPropertyNames(obj)', 10n, { obj })).toBe(true);
    });
  });
});

describe('JSON.stringify ticks', () => {
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
    const fn = sandbox.compile(code);
    const { context, run } = fn(scope);
    sandbox.subscribeGet(() => {}, context);
    run();
    return halted;
  }

  it('does not halt on a small object within quota', () => {
    expect(haltsWithQuota('return JSON.stringify(obj)', 100n, { obj: { a: 1 } })).toBe(false);
  });

  it('halts when stringifying an object with many keys', () => {
    const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
    expect(haltsWithQuota('return JSON.stringify(obj)', 10n, { obj })).toBe(true);
  });

  it('halts on deeply nested objects (counts keys at all levels)', () => {
    let obj: Record<string, unknown> = {};
    let cur = obj;
    for (let i = 0; i < 50; i++) {
      cur.next = {};
      cur = cur.next as any;
    }
    expect(haltsWithQuota('return JSON.stringify(obj)', 10n, { obj })).toBe(true);
  });

  it('does not halt for a small object at generous quota', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(haltsWithQuota('return JSON.stringify(obj)', 100n, { obj })).toBe(false);
  });

  it('fires tick check even without subscribeGet (getTicks handles JSON directly)', () => {
    const sandbox = new Sandbox({ executionQuota: 10n, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
    sandbox.compile('return JSON.stringify(obj)')({ obj }).run();
    expect(halted).toBe(true);
  });
});

describe('null obj edge cases', () => {
  function run(code: string, scope: Record<string, unknown> = {}) {
    return new Sandbox().compile(code)(scope).run();
  }

  it('calling a method on null throws TypeError', () => {
    expect(() => run('return null.toString()')).toThrow(TypeError);
  });

  it('JSON.stringify(null) returns "null" without crashing', () => {
    expect(run('return JSON.stringify(null)')).toBe('null');
  });

  it('JSON.stringify(null) does not halt even with subscribeGet active', () => {
    const sandbox = new Sandbox({ executionQuota: 100n, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    const fn = sandbox.compile('return JSON.stringify(null)');
    const { context, run: r } = fn({});
    sandbox.subscribeGet(() => {}, context);
    const result = r();
    expect(halted).toBe(false);
    expect(result).toBe('null');
  });

  it('Array.from(null) throws TypeError', () => {
    expect(() => run('return Array.from(null)')).toThrow(TypeError);
  });

  it('Array.from(null) does not crash the tick calculation', () => {
    const sandbox = new Sandbox({ executionQuota: 1000n, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    expect(() => sandbox.compile('return Array.from(null)')({}).run()).toThrow(TypeError);
    expect(halted).toBe(false);
  });

  it('Object.keys(null) throws TypeError', () => {
    expect(() => run('return Object.keys(null)')).toThrow(TypeError);
  });

  it('arr.length = null does not charge ticks (non-number assignment)', () => {
    const sandbox = new Sandbox({ executionQuota: 5n, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    const arr: number[] = [1, 2, 3];
    sandbox.compile('arr.length = null')({ arr }).run();
    expect(halted).toBe(false);
  });
});
