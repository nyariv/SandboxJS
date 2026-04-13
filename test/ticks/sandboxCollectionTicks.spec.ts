import Sandbox from '../../src/Sandbox.js';

describe('Map ticks', () => {
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

  describe('O(1) — get, set, has, delete', () => {
    it('get does not halt on a large Map (always 1 tick)', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('return m.get(0)', 50n, { m })).toBe(false);
    });

    it('set does not halt on a large Map (always 1 tick)', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('m.set(999, 999)', 50n, { m })).toBe(false);
    });

    it('has does not halt on a large Map (always 1 tick)', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('return m.has(0)', 50n, { m })).toBe(false);
    });

    it('delete does not halt on a large Map (always 1 tick)', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('m.delete(0)', 50n, { m })).toBe(false);
    });

    it('O(1) does not halt at quota that halts O(n) forEach on same Map', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('m.forEach(() => {})', 50n, { m })).toBe(true);
      expect(haltsWithQuota('return m.get(0)', 50n, { m })).toBe(false);
    });
  });

  describe('O(n) — keys, values, entries, forEach, clear', () => {
    it('does not halt on a small Map within quota', () => {
      const m = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      expect(haltsWithQuota('return [...m.keys()]', 100n, { m })).toBe(false);
    });

    it('forEach halts on a large Map', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('m.forEach(() => {})', 10n, { m })).toBe(true);
    });

    it('keys halts on a large Map', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('return [...m.keys()]', 10n, { m })).toBe(true);
    });

    it('values halts on a large Map', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('return [...m.values()]', 10n, { m })).toBe(true);
    });

    it('entries halts on a large Map', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('return [...m.entries()]', 10n, { m })).toBe(true);
    });

    it('clear halts on a large Map', () => {
      const m = new Map(Array.from({ length: 200 }, (_, i) => [i, i]));
      expect(haltsWithQuota('m.clear()', 10n, { m })).toBe(true);
    });
  });

  describe('null edge cases', () => {
    it('Map.get on null map throws TypeError', () => {
      expect(() => new Sandbox().compile('return m.get(0)')({ m: null }).run()).toThrow(TypeError);
    });
  });
});

describe('Set ticks', () => {
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

  describe('O(1) — add, has, delete', () => {
    it('add does not halt on a large Set (always 1 tick)', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('s.add(999)', 50n, { s })).toBe(false);
    });

    it('has does not halt on a large Set (always 1 tick)', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('return s.has(0)', 50n, { s })).toBe(false);
    });

    it('delete does not halt on a large Set (always 1 tick)', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('s.delete(0)', 50n, { s })).toBe(false);
    });

    it('O(1) does not halt at quota that halts O(n) forEach on same Set', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('s.forEach(() => {})', 50n, { s })).toBe(true);
      expect(haltsWithQuota('s.has(0)', 50n, { s })).toBe(false);
    });
  });

  describe('O(n) — values, keys, entries, forEach, clear', () => {
    it('does not halt on a small Set within quota', () => {
      const s = new Set([1, 2, 3]);
      expect(haltsWithQuota('return [...s.values()]', 100n, { s })).toBe(false);
    });

    it('forEach halts on a large Set', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('s.forEach(() => {})', 10n, { s })).toBe(true);
    });

    it('values halts on a large Set', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('return [...s.values()]', 10n, { s })).toBe(true);
    });

    it('keys halts on a large Set', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('return [...s.keys()]', 10n, { s })).toBe(true);
    });

    it('entries halts on a large Set', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('return [...s.entries()]', 10n, { s })).toBe(true);
    });

    it('clear halts on a large Set', () => {
      const s = new Set(Array.from({ length: 200 }, (_, i) => i));
      expect(haltsWithQuota('s.clear()', 10n, { s })).toBe(true);
    });
  });

  describe('null edge cases', () => {
    it('Set.has on null set throws TypeError', () => {
      expect(() => new Sandbox().compile('return s.has(0)')({ s: null }).run()).toThrow(TypeError);
    });
  });
});

describe('TypedArray ticks', () => {
  // TypedArrays need explicit whitelisting.
  // The shared %TypedArray%.prototype(s) must be registered via fake constructors
  // because prototypeWhitelist keys are constructors (mapped to .prototype internally).
  // In some environments (e.g., JSDOM) Uint8Array has a patched prototype chain,
  // so collect all unique %TypedArray% protos across the typed array types.
  const typedArrayCtors = [
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
  ];
  const uniqueTypedArrayProtos = new Set(
    typedArrayCtors.map((T) => Object.getPrototypeOf(T.prototype)),
  );
  const prototypeWhitelist = new Map(Sandbox.SAFE_PROTOTYPES);
  for (const proto of uniqueTypedArrayProtos) {
    function FakeTypedArrayCtor() {}
    FakeTypedArrayCtor.prototype = proto;
    prototypeWhitelist.set(FakeTypedArrayCtor as any, new Set());
  }
  for (const T of typedArrayCtors) {
    prototypeWhitelist.set(T, new Set());
  }

  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({
      executionQuota: quota,
      haltOnSandboxError: true,
      prototypeWhitelist,
    });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  it('map on large TypedArray halts', () => {
    const ta = new Int32Array(200);
    expect(haltsWithQuota('return ta.map(x => x)', 10n, { ta })).toBe(true);
  });

  it('indexOf on large TypedArray halts', () => {
    const ta = new Float64Array(200);
    expect(haltsWithQuota('return ta.indexOf(-1)', 10n, { ta })).toBe(true);
  });

  it('sort on large TypedArray halts at lower quota than indexOf (O(n log n))', () => {
    const ta = new Int32Array(Array.from({ length: 200 }, (_, i) => 200 - i));
    expect(haltsWithQuota('return ta.indexOf(-1)', 500n, { ta })).toBe(false);
    expect(haltsWithQuota('return ta.sort()', 500n, { ta: ta.slice() })).toBe(true);
  });

  it('at on large TypedArray does not halt (O(1))', () => {
    const ta = new Uint8Array(200);
    expect(haltsWithQuota('return ta.at(0)', 50n, { ta })).toBe(false);
  });

  it('does not halt on small TypedArray within quota', () => {
    const ta = new Int32Array([1, 2, 3]);
    expect(haltsWithQuota('return ta.map(x => x)', 100n, { ta })).toBe(false);
  });
});
