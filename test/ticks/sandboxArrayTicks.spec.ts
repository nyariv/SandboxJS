import Sandbox from '../../src/Sandbox.js';

describe('array ticks', () => {
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

  describe('flat', () => {
    it('does not halt on a small flat array within quota', () => {
      expect(haltsWithQuota('return arr.flat()', 100n, { arr: [1, 2, 3] })).toBe(false);
    });

    it('halts when flat on large array exceeds quota', () => {
      const arr = Array.from({ length: 200 }, (_, i) => i);
      expect(haltsWithQuota('return arr.flat()', 10n, { arr })).toBe(true);
    });

    it('halts on deeply nested array with depth=2 but not with depth=1', () => {
      const arr = [Array.from({ length: 100 }, (_, i) => i)];
      const nested = [arr];
      expect(haltsWithQuota('return arr.flat(1)', 10n, { arr: nested })).toBe(false);
      expect(haltsWithQuota('return arr.flat(2)', 10n, { arr: nested })).toBe(true);
    });

    it('respects explicit depth argument — depth=0 does not recurse', () => {
      const arr = [Array.from({ length: 100 }, (_, i) => i)];
      expect(haltsWithQuota('return arr.flat(0)', 10n, { arr })).toBe(false);
    });
  });

  describe('flatMap', () => {
    it('does not halt on a small array within quota', () => {
      expect(haltsWithQuota('return arr.flatMap(x => x)', 100n, { arr: [[1], [2], [3]] })).toBe(
        false,
      );
    });

    it('halts when flatMap on large array exceeds quota', () => {
      const arr = Array.from({ length: 200 }, () => [1, 2, 3]);
      expect(haltsWithQuota('return arr.flatMap(x => x)', 10n, { arr })).toBe(true);
    });

    it('only counts one level deep (does not recurse into deeply nested arrays)', () => {
      const arr = [Array.from({ length: 100 }, (_, i) => i)];
      const nested = [arr];
      expect(haltsWithQuota('return arr.flatMap(x => x)', 10n, { arr: nested })).toBe(false);
    });
  });

  describe('concat', () => {
    it('does not halt when concatenating small arrays within quota', () => {
      expect(haltsWithQuota('return a.concat(b)', 100n, { a: [1, 2], b: [3, 4, 5] })).toBe(false);
    });

    it('halts when concat on large arrays exceeds quota', () => {
      const a = Array(100).fill(0);
      const b = Array(100).fill(0);
      expect(haltsWithQuota('return a.concat(b)', 10n, { a, b })).toBe(true);
    });
  });

  describe('O(1) — pop, at', () => {
    it('pop does not halt on a large array (always 1 tick)', () => {
      const arr = Array(200).fill(0);
      expect(haltsWithQuota('arr.pop()', 50n, { arr })).toBe(false);
    });

    it('at does not halt on a large array (always 1 tick)', () => {
      const arr = Array(200).fill(0);
      expect(haltsWithQuota('return arr.at(0)', 50n, { arr })).toBe(false);
    });

    it('O(1) does not halt at quota that halts O(n) map on the same array', () => {
      const arr = Array(200).fill(0);
      expect(haltsWithQuota('return arr.map(x => x)', 50n, { arr })).toBe(true);
      expect(haltsWithQuota('arr.at(1)', 50n, { arr })).toBe(false);
    });
  });

  describe('O(n) — map, filter, forEach, reduce, find, indexOf, etc.', () => {
    it('does not halt on a small array within quota', () => {
      expect(haltsWithQuota('return arr.map(x => x)', 100n, { arr: [1, 2, 3] })).toBe(false);
    });

    it('halts on a large array when quota < array length', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.map(x => x)', 10n, { arr })).toBe(true);
    });

    it('filter halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.filter(x => x)', 10n, { arr })).toBe(true);
    });

    it('forEach halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('arr.forEach(x => x)', 10n, { arr })).toBe(true);
    });

    it('reduce halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.reduce((a, x) => a + x, 0)', 10n, { arr })).toBe(true);
    });

    it('find halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.find(x => x === 2)', 10n, { arr })).toBe(true);
    });

    it('indexOf halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.indexOf(2)', 10n, { arr })).toBe(true);
    });

    it('includes halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.includes(2)', 10n, { arr })).toBe(true);
    });

    it('slice halts on a large array', () => {
      const arr = Array(200).fill(1);
      expect(haltsWithQuota('return arr.slice()', 10n, { arr })).toBe(true);
    });

    it('join halts on a large array', () => {
      const arr = Array(200).fill('a');
      expect(haltsWithQuota('return arr.join(",")', 10n, { arr })).toBe(true);
    });
  });

  describe('O(n log n) — sort, toSorted', () => {
    it('sort halts at a lower quota than an equivalent O(n) op on the same array', () => {
      const arr = Array.from({ length: 200 }, (_, i) => 200 - i);
      expect(haltsWithQuota('return arr.indexOf(-1)', 500n, { arr })).toBe(false);
      expect(haltsWithQuota('return arr.sort()', 500n, { arr: [...arr] })).toBe(true);
    });

    it('does not halt on a small array within quota', () => {
      expect(haltsWithQuota('return arr.sort()', 100n, { arr: [3, 1, 2] })).toBe(false);
    });

    it('toSorted halts on a large array', () => {
      const arr = Array.from({ length: 200 }, (_, i) => 200 - i);
      expect(haltsWithQuota('return arr.toSorted()', 500n, { arr })).toBe(true);
    });
  });

  describe('Array.from', () => {
    it('does not halt on a small array-like within quota', () => {
      expect(haltsWithQuota('return Array.from(src)', 100n, { src: [1, 2, 3] })).toBe(false);
    });

    it('halts when source length exceeds quota', () => {
      const src = Array(200).fill(1);
      expect(haltsWithQuota('return Array.from(src)', 10n, { src })).toBe(true);
    });

    it('halts when using Array.from with a mapFn on a large source', () => {
      const src = Array(200).fill(1);
      expect(haltsWithQuota('return Array.from(src, x => x * 2)', 10n, { src })).toBe(true);
    });

    it('works with array-like objects with a length property', () => {
      const src = { length: 200, 0: 'a', 1: 'b' };
      expect(haltsWithQuota('return Array.from(src)', 10n, { src })).toBe(true);
    });

    it('does not halt when source has no length (e.g. Set)', () => {
      expect(haltsWithQuota('return Array.from(src)', 10n, { src: new Set([1, 2, 3]) })).toBe(
        false,
      );
    });
  });

  describe('arr.length =', () => {
    it('does not halt when shrinking within quota', () => {
      const arr = Array(5).fill(0);
      expect(haltsWithQuota('arr.length = 2', 100n, { arr })).toBe(false);
    });

    it('halts when expanding length far exceeds quota', () => {
      const arr: number[] = [];
      expect(haltsWithQuota('arr.length = 200', 10n, { arr })).toBe(true);
    });

    it('halts when shrinking by a large delta that exceeds quota', () => {
      const arr = Array(200).fill(0);
      expect(haltsWithQuota('arr.length = 0', 10n, { arr })).toBe(true);
    });

    it('does not charge ticks when length is unchanged', () => {
      const arr = Array(5).fill(0);
      expect(haltsWithQuota('arr.length = 5', 5n, { arr })).toBe(false);
    });
  });
});
