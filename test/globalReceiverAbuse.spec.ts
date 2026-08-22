import Sandbox from '../src/Sandbox.js';

const run = <T = unknown>(code: string): T => new Sandbox().compile(code)().run() as T;

const runWithHost = <T = unknown>(code: string, globals: Record<string, unknown>): T =>
  new Sandbox({ globals: { ...Sandbox.SAFE_GLOBALS, ...globals } }).compile(code)().run() as T;

const ownKeysOf = (obj: object) => new Set(Object.getOwnPropertyNames(obj));

describe('generic array mutator receiver abuse', () => {
  describe('blocks array generics with a protected global as receiver', () => {
    const mutators: [string, string][] = [
      ['push', "[].push.call(Math, 'pwned')"],
      ['pop', '[].pop.call(Math)'],
      ['shift', '[].shift.call(Math)'],
      ['unshift', "[].unshift.call(Math, 'pwned')"],
      ['splice', "[].splice.call(Math, 0, 0, 'pwned')"],
      ['fill', "[].fill.call(Math, 'pwned', 0, 3)"],
      ['sort', '[].sort.call(Math)'],
      ['reverse', '[].reverse.call(Math)'],
      ['copyWithin', '[].copyWithin.call(Math, 0, 0)'],
    ];

    it.each(mutators)('blocks %s via .call', (name, code) => {
      expect(() => run(code)).toThrow(
        `Cannot call array method '${name}' with a global object as its 'this' value`,
      );
    });

    it('blocks the reflected receiver via .apply', () => {
      expect(() => run("[].push.apply(Math, ['pwned'])")).toThrow(
        "Cannot call array method 'push' with a global object as its 'this' value",
      );
    });

    it('blocks the reflected receiver via .bind', () => {
      expect(() => run("const f = [].push.bind(Math); f('pwned')")).toThrow(
        "Cannot call array method 'push' with a global object as its 'this' value",
      );
    });
  });

  describe('protects every extensible host global named in the advisory', () => {
    const targets = ['Math', 'JSON', 'Intl'];

    it.each(targets)('blocks writes to %s', (global) => {
      expect(() => run(`[].push.call(${global}, 'pwned')`)).toThrow(
        "Cannot call array method 'push' with a global object as its 'this' value",
      );
    });

    it.each(['Map', 'Set', 'Object', 'Array'])(
      'blocks writes to the %s constructor before any partial side effect',
      (ctor) => {
        expect(() => run(`[].push.call(${ctor}, 'pwned')`)).toThrow(
          "Cannot call array method 'push' with a global object as its 'this' value",
        );
      },
    );
  });

  describe('leaves the host globals unmodified', () => {
    it('does not pollute Math when the exploit is attempted', () => {
      const before = ownKeysOf(Math);
      expect(() => run("[].push.call(Math, 'pwned')")).toThrow();
      expect(ownKeysOf(Math)).toEqual(before);
      expect((Math as Record<string, unknown>)[0]).toBeUndefined();
      expect((Math as { length?: number }).length).toBeUndefined();
    });

    it('does not pollute JSON when the exploit is attempted', () => {
      const before = ownKeysOf(JSON);
      expect(() => run("[].push.call(JSON, 'pwned')")).toThrow();
      expect(ownKeysOf(JSON)).toEqual(before);
    });

    it('does not leak pollution across sandbox instances', () => {
      expect(() => run("[].push.call(Math, 'pwned')")).toThrow();
      expect(run('return typeof Math[0]')).toBe('undefined');
    });
  });

  describe('still blocks direct assignment to globals', () => {
    it('rejects indexed assignment', () => {
      expect(() => run("Math[0] = 'direct'")).toThrow(
        "Cannot assign property '0' of a global object",
      );
    });
  });

  describe('remains permissive for legitimate receivers', () => {
    it('allows array generics on plain array-likes', () => {
      expect(run("return [].slice.call({ 0: 'a', 1: 'b', length: 2 })")).toEqual(['a', 'b']);
    });

    it('allows array generics on strings', () => {
      expect(run("return [].map.call('ab', (c) => c)")).toEqual(['a', 'b']);
    });

    it('allows join on an array-like', () => {
      expect(run("return [].join.call({ 0: 1, 1: 2, length: 2 }, '-')")).toBe('1-2');
    });

    it('allows array generics on arguments-style objects', () => {
      expect(run('return [].slice.call({ 0: 1, 1: 2, 2: 3, length: 3 }, 1)')).toEqual([2, 3]);
    });

    it('allows mutating a sandbox-created array through a generic', () => {
      expect(run("const a = []; [].push.call(a, 'ok'); return a")).toEqual(['ok']);
    });

    it('allows a global method called with its own global as receiver', () => {
      expect(run('return Math.max.call(Math, 1, 5, 2)')).toBe(5);
      expect(run('return Math.max.apply(Math, [1, 5, 2])')).toBe(5);
      expect(run('return JSON.stringify.call(JSON, { a: 1 })')).toBe('{"a":1}');
    });

    it('allows binding a global method to its own global', () => {
      expect(run('const m = Math.max.bind(Math); return m(1, 9)')).toBe(9);
    });

    it('allows ordinary array mutation', () => {
      expect(run('const a = [1]; a.push(2); a.sort(); return a')).toEqual([1, 2]);
    });
  });

  describe('protects host Arrays exposed through globals', () => {
    const mutators: [string, string][] = [
      ['push', "host.push('pwned')"],
      ['pop', 'host.pop()'],
      ['shift', 'host.shift()'],
      ['unshift', "host.unshift('pwned')"],
      ['splice', "host.splice(0, 0, 'pwned')"],
      ['fill', "host.fill('pwned')"],
      ['sort', 'host.sort()'],
      ['reverse', 'host.reverse()'],
      ['copyWithin', 'host.copyWithin(0, 0)'],
    ];

    it.each(mutators)('blocks %s on a host Array and leaves it unchanged', (name, code) => {
      const host = [1, 2, 3];
      expect(() => runWithHost(code, { host })).toThrow(
        `Cannot call array method '${name}' with a global object as its 'this' value`,
      );
      expect(host).toEqual([1, 2, 3]);
    });

    it.each([
      ['call', "[].push.call(host, 'pwned')"],
      ['apply', "[].push.apply(host, ['pwned'])"],
      ['bind', "const f = [].push.bind(host); f('pwned')"],
    ])('blocks a reflected host Array receiver via .%s', (_label, code) => {
      const host = [1, 2, 3];
      expect(() => runWithHost(code, { host })).toThrow(
        "Cannot call array method 'push' with a global object as its 'this' value",
      );
      expect(host).toEqual([1, 2, 3]);
    });

    it('still blocks direct assignment to a host Array', () => {
      const host: unknown[] = [];
      expect(() => runWithHost("host[0] = 'pwned'", { host })).toThrow(
        "Cannot assign property '0' of a global object",
      );
      expect(host).toEqual([]);
    });

    it('keeps non-mutating methods working on a host Array', () => {
      const host = [1, 2, 3];
      expect(runWithHost('return host.map((x) => x * 2)', { host })).toEqual([2, 4, 6]);
      expect(runWithHost('return host.slice(1)', { host })).toEqual([2, 3]);
      expect(runWithHost("return host.join('-')", { host })).toBe('1-2-3');
      expect(runWithHost('return host.filter((x) => x > 1)', { host })).toEqual([2, 3]);
      expect(runWithHost('return host.concat([9])', { host })).toEqual([1, 2, 3, 9]);
      expect(runWithHost('return host.includes(2)', { host })).toBe(true);
      expect(host).toEqual([1, 2, 3]);
    });

    it('allows mutating a sandbox-made copy of a host Array', () => {
      const host = [3, 1];
      expect(
        runWithHost('const c = host.slice(); c.push(2); c.sort(); return c', { host }),
      ).toEqual([1, 2, 3]);
      expect(host).toEqual([3, 1]);
    });

    it('allows the non-mutating change methods on a host Array', () => {
      const host = [3, 1];
      expect(runWithHost('return host.toSorted()', { host })).toEqual([1, 3]);
      expect(runWithHost('return host.toReversed()', { host })).toEqual([1, 3]);
      expect(runWithHost('return host.with(0, 9)', { host })).toEqual([9, 1]);
      expect(host).toEqual([3, 1]);
    });
  });
});
