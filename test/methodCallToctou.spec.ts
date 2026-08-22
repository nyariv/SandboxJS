import Sandbox from '../src/Sandbox.js';

const run = <T = unknown>(code: string): T => new Sandbox().compile(code)({}).run() as T;

describe('GHSA-6hwh-3fp5-2m4f: method-call TOCTOU', () => {
  describe('blocks swapping the callee during argument evaluation', () => {
    it('blocks the getPrototypeOf gadget', () => {
      const code =
        'const p = { __proto__: Object, getPrototypeOf: () => 1 };' +
        'return p.getPrototypeOf(delete p.getPrototypeOf && Object);';
      expect(() => run(code)).toThrow('changed during argument evaluation');
    });

    it('blocks the getOwnPropertyDescriptor gadget', () => {
      const code =
        'const p = { __proto__: Object, getOwnPropertyDescriptor: () => 1 };' +
        "return p.getOwnPropertyDescriptor(delete p.getOwnPropertyDescriptor && Object, 'x');";
      expect(() => run(code)).toThrow('changed during argument evaluation');
    });

    it('blocks the defineProperty gadget', () => {
      const code =
        'const p = { __proto__: Object, defineProperty: () => 1 };' +
        "return p.defineProperty(delete p.defineProperty && {}, 'x', { value: 1 });";
      expect(() => run(code)).toThrow('changed during argument evaluation');
    });
  });

  describe('blocks the full escape chain', () => {
    const chain = (payload: string) =>
      [
        'const getPrototypeOf = (obj) => {',
        '  const p = { __proto__: Object, getPrototypeOf: () => {} };',
        '  return p.getPrototypeOf(delete p.getPrototypeOf && obj);',
        '};',
        'const getOwnPropertyDescriptor = (obj, prop) => {',
        '  const p = { __proto__: Object, getOwnPropertyDescriptor: () => {} };',
        '  return p.getOwnPropertyDescriptor(delete p.getOwnPropertyDescriptor && obj, prop);',
        '};',
        'const defineProperty = (obj, prop, descriptor) => {',
        '  const p = { __proto__: Object, defineProperty: () => {} };',
        '  return p.defineProperty(delete p.defineProperty && obj, prop, descriptor);',
        '};',
        'const o = {};',
        "defineProperty(o, Symbol.replace, getOwnPropertyDescriptor(getPrototypeOf(Object), 'constructor'));",
        `return 'x'.replace(o, ${JSON.stringify(payload)})();`,
      ].join('\n');

    it('throws before reaching the host Function constructor', () => {
      expect(() => run(chain('return 1'))).toThrow('changed during argument evaluation');
    });

    it('does not execute code in the host realm', () => {
      const key = '__SBX_TOCTOU_TEST';
      const before = (globalThis as Record<string, unknown>)[key];
      expect(() => run(chain(`globalThis.${key} = 'owned'; return 1`))).toThrow();
      expect((globalThis as Record<string, unknown>)[key]).toBe(before);
    });
  });

  describe('rejects reassigning or deleting the called method within its own arguments', () => {
    it('throws when the called method is reassigned during argument evaluation', () => {
      expect(() => run('const o = { f(){ return 8; } }; return o.f((o.f = null, 1));')).toThrow(
        'changed during argument evaluation',
      );
    });

    it('throws when the called method is deleted during argument evaluation', () => {
      const code =
        'const o = { __proto__: { f(){ return 7; } }, f(){ return 8; } };' +
        'return o.f(delete o.f);';
      expect(() => run(code)).toThrow('changed during argument evaluation');
    });
  });

  describe('remains permissive for legitimate method calls', () => {
    it('allows built-in method calls', () => {
      expect(run('return [1, 2, 3].map((x) => x * 2)')).toEqual([2, 4, 6]);
      expect(run('return Math.max(1, 2, 3)')).toBe(3);
      expect(run("return 'abc'.slice(1)")).toBe('bc');
      expect(run('return Object.keys({ a: 1 })')).toEqual(['a']);
      expect(run('return JSON.stringify({ a: 1 })')).toBe('{"a":1}');
    });

    it('allows array mutators and chaining', () => {
      expect(run('const a = [1, 2]; a.push(3); return a')).toEqual([1, 2, 3]);
      expect(run("return [3, 1, 2].sort().join('-')")).toBe('1-2-3');
      expect(run('return [1, 2, 3].filter((x) => x > 1).map((x) => x * 2)')).toEqual([4, 6]);
    });

    it('allows user methods and nested calls', () => {
      expect(run('const o = { f(){ return 5; } }; return o.f()')).toBe(5);
      expect(run('const o = { g(){ return 3; }, f(x){ return x + 1; } }; return o.f(o.g())')).toBe(
        4,
      );
    });

    it('allows arguments that mutate other properties of the receiver', () => {
      expect(run('const o = { f(){ return 9; }, x: 1 }; return o.f(delete o.x)')).toBe(9);
    });

    it('allows arguments that mutate the receiver array', () => {
      expect(run('const a = [1, 2, 3]; return a.slice((a.push(4), 0))')).toEqual([1, 2, 3, 4]);
    });
  });
});
