import Sandbox from '../../src/Sandbox.js';

describe('Math ticks', () => {
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

  it('Math.max halts when called with many arguments', () => {
    const args = Array.from({ length: 200 }, (_, i) => i).join(',');
    expect(haltsWithQuota(`return Math.max(${args})`, 10n)).toBe(true);
  });

  it('Math.min halts when called with many arguments', () => {
    const args = Array.from({ length: 200 }, (_, i) => i).join(',');
    expect(haltsWithQuota(`return Math.min(${args})`, 10n)).toBe(true);
  });

  it('Math.max does not halt with few arguments', () => {
    expect(haltsWithQuota('return Math.max(1, 2, 3)', 100n)).toBe(false);
  });

  it('Math.hypot halts when called with many arguments', () => {
    const args = Array.from({ length: 200 }, (_, i) => i).join(',');
    expect(haltsWithQuota(`return Math.hypot(${args})`, 10n)).toBe(true);
  });
});

describe('JSON ticks', () => {
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

  it('JSON.parse halts on a long string', () => {
    const json = JSON.stringify(Array(200).fill(1));
    expect(haltsWithQuota('return JSON.parse(json)', 10n, { json })).toBe(true);
  });

  it('JSON.parse does not halt on a short string', () => {
    expect(haltsWithQuota('return JSON.parse(json)', 100n, { json: '[1,2,3]' })).toBe(false);
  });

  it('JSON.stringify halts on a large object', () => {
    const obj = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, i]));
    expect(haltsWithQuota('return JSON.stringify(obj)', 10n, { obj })).toBe(true);
  });
});

describe('RegExp ticks', () => {
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

  it('exec halts on a long input string', () => {
    const input = 'a'.repeat(200);
    expect(haltsWithQuota('return re.exec(input)', 10n, { re: /z/, input })).toBe(true);
  });

  it('test halts on a long input string', () => {
    const input = 'a'.repeat(200);
    expect(haltsWithQuota('return re.test(input)', 10n, { re: /z/, input })).toBe(true);
  });

  it('does not halt on a short input string', () => {
    expect(haltsWithQuota('return re.test(input)', 100n, { re: /z/, input: 'hello' })).toBe(false);
  });
});

describe('Promise ticks', () => {
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

  it('Promise.all halts on a large array of promises', () => {
    const promises = Array.from({ length: 200 }, () => Promise.resolve(1));
    expect(haltsWithQuota('return Promise.all(promises)', 10n, { promises })).toBe(true);
  });

  it('Promise.allSettled halts on a large array', () => {
    const promises = Array.from({ length: 200 }, () => Promise.resolve(1));
    expect(haltsWithQuota('return Promise.allSettled(promises)', 10n, { promises })).toBe(true);
  });

  it('Promise.race halts on a large array', () => {
    const promises = Array.from({ length: 200 }, () => Promise.resolve(1));
    expect(haltsWithQuota('return Promise.race(promises)', 10n, { promises })).toBe(true);
  });

  it('does not halt on a small array of promises', () => {
    const promises = [Promise.resolve(1), Promise.resolve(2)];
    expect(haltsWithQuota('return Promise.all(promises)', 100n, { promises })).toBe(false);
  });
});

describe('new constructor ticks', () => {
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

  describe('new Array', () => {
    it('new Array(n) halts when n is large', () => {
      expect(haltsWithQuota('return new Array(200)', 10n)).toBe(true);
    });

    it('new Array(n) does not halt when n is small', () => {
      expect(haltsWithQuota('return new Array(3)', 20n)).toBe(false);
    });

    it('new Array(...items) charges args.length ticks', () => {
      expect(haltsWithQuota('return new Array("a","b","c")', 10n)).toBe(false);
      const items = Array.from({ length: 200 }, (_, i) => i).join(',');
      expect(haltsWithQuota(`return new Array(${items})`, 10n)).toBe(true);
    });
  });

  describe('new Map / new Set', () => {
    it('new Map(iterable) halts when iterable is large', () => {
      const entries = Array.from({ length: 200 }, (_, i): [number, number] => [i, i]);
      expect(haltsWithQuota('return new Map(entries)', 10n, { entries })).toBe(true);
    });

    it('new Map(iterable) does not halt when iterable is small', () => {
      expect(haltsWithQuota('return new Map(entries)', 20n, { entries: [[1, 1]] })).toBe(false);
    });

    it('new Set(iterable) halts when iterable is large', () => {
      const items = Array.from({ length: 200 }, (_, i) => i);
      expect(haltsWithQuota('return new Set(items)', 10n, { items })).toBe(true);
    });

    it('new Set(iterable) does not halt when iterable is small', () => {
      expect(haltsWithQuota('return new Set(items)', 20n, { items: [1, 2, 3] })).toBe(false);
    });
  });

  describe('new TypedArray', () => {
    it('new Int32Array(n) halts when n is large', () => {
      expect(haltsWithQuota('return new Int32Array(200)', 10n)).toBe(true);
    });

    it('new Int32Array(n) does not halt when n is small', () => {
      expect(haltsWithQuota('return new Int32Array(3)', 20n)).toBe(false);
    });

    it('new Float64Array(n) halts when n is large', () => {
      expect(haltsWithQuota('return new Float64Array(200)', 10n)).toBe(true);
    });

    it('new TypedArray(array) charges source length ticks', () => {
      const src = Array.from({ length: 200 }, (_, i) => i);
      expect(haltsWithQuota('return new Int32Array(src)', 10n, { src })).toBe(true);
      expect(haltsWithQuota('return new Int32Array(src)', 210n, { src })).toBe(false);
    });
  });
});
