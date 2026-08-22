import Sandbox from '../src/Sandbox.js';

const run = <T = unknown>(code: string): T => new Sandbox().compile(code)({}).run() as T;

describe('scope __proto__ pollution', () => {
  describe('rejects __proto__ as a declared or assigned name', () => {
    it('throws for var/let/const declarations named __proto__', () => {
      expect(() => run('var __proto__ = Object; return 1')).toThrow(
        "Unexepected token '__proto__'",
      );
      expect(() => run('let __proto__ = Object; return 1')).toThrow(
        "Unexepected token '__proto__'",
      );
      expect(() => run('const __proto__ = Object; return 1')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('throws regardless of the scope the declaration lives in', () => {
      expect(() => run('function f(){ var __proto__ = Object; } return f()')).toThrow(
        "Unexepected token '__proto__'",
      );
      expect(() => run('{ var __proto__ = Object; } return 1')).toThrow(
        "Unexepected token '__proto__'",
      );
      expect(() => run('for (var __proto__ = Object;;) { break; } return 1')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('throws for a function declaration named __proto__', () => {
      expect(() => run('function __proto__(){} return 1')).toThrow("Unexepected token '__proto__'");
    });
  });

  describe('rejects __proto__ bound as a function parameter', () => {
    it('throws for a plain function parameter named __proto__', () => {
      expect(() => run('return function(__proto__){ return 1; }(Object)')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('throws for an arrow parameter named __proto__', () => {
      expect(() => run('return ((__proto__) => 1)(Object)')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('throws for a non-first parameter named __proto__', () => {
      expect(() => run('return function(a, __proto__){ return 1; }(1, Object)')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('throws for a rest parameter named __proto__', () => {
      expect(() => run('return ((...__proto__) => 1)(Object)')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('throws for a generator parameter named __proto__', () => {
      expect(() => run('function* g(__proto__){ yield 1; } return [...g(Object)][0]')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('does not expose Object statics through a __proto__ parameter', () => {
      expect(() =>
        run('return function(__proto__){ return typeof getPrototypeOf; }(Object)'),
      ).toThrow("Unexepected token '__proto__'");
    });
  });

  describe('rejects __proto__ bound as a catch clause', () => {
    it('throws for catch(__proto__)', () => {
      expect(() => run('try { throw Object; } catch(__proto__) { return 1; }')).toThrow(
        "Unexepected token '__proto__'",
      );
    });

    it('does not expose Object statics through a __proto__ catch binding', () => {
      expect(() =>
        run('try { throw Object; } catch(__proto__) { return typeof getPrototypeOf; }'),
      ).toThrow("Unexepected token '__proto__'");
    });

    it('blocks the full escape chain through the catch sink', () => {
      const code = [
        'try { throw Object; } catch(__proto__) {',
        '  const o = {};',
        "  defineProperty(o, Symbol.replace, getOwnPropertyDescriptor(getPrototypeOf(Object), 'constructor'));",
        "  return 'x'.replace(o, 'return 42')();",
        '}',
      ].join('\n');
      expect(() => run(code)).toThrow("Unexepected token '__proto__'");
    });
  });

  describe('spread operations do not reach the scope-binding sinks', () => {
    it('allows spreading arguments into a call', () => {
      expect(run('function f(a, b){ return a + b; } return f(...[2, 3])')).toBe(5);
    });

    it('does not expose Object statics via spread call arguments', () => {
      expect(run('return ((...a) => typeof getPrototypeOf)(...[Object, Object])')).toBe(
        'undefined',
      );
    });

    it('does not expose Object statics via object spread', () => {
      expect(run('const o = { ...{ a: 1 } }; return typeof getPrototypeOf')).toBe('undefined');
    });

    it('does not pollute Object.prototype when spreading an own __proto__ key', () => {
      const before = (Object.prototype as Record<string, unknown>).hacked;
      expect(
        run(
          'const src = JSON.parse(\'{"__proto__":{"hacked":1}}\'); const o = { ...src }; return ({}).hacked',
        ),
      ).toBeUndefined();
      expect(
        run(
          'const src = JSON.parse(\'{"__proto__":{"hacked":1}}\'); const { ...r } = src; return ({}).hacked',
        ),
      ).toBeUndefined();
      expect((Object.prototype as Record<string, unknown>).hacked).toBe(before);
    });

    it('spreads an own __proto__ key as a plain data property, not a prototype', () => {
      expect(
        run(
          'const src = JSON.parse(\'{"__proto__":{"hacked":1}}\'); const o = { ...src }; return o.hacked',
        ),
      ).toBeUndefined();
    });
  });

  describe('does not expose host statics via prototype-inherited identifiers', () => {
    it('keeps Object statics unreachable as bare identifiers', () => {
      expect(() => run('var __proto__ = Object; return typeof freeze')).toThrow(
        "Unexepected token '__proto__'",
      );
    });
  });

  describe('blocks the full RCE chain at its first step', () => {
    it('cannot pollute the scope to reach real defineProperty', () => {
      const code = [
        'var __proto__ = Object;',
        "defineProperty(Error, 'prepareStackTrace', { value: function(e, s){ return s; }, configurable: true, writable: true });",
        'return 1;',
      ].join('\n');
      expect(() => run(code)).toThrow("Unexepected token '__proto__'");
    });

    it('does not mutate the host realm globalThis', () => {
      const key = '__SBX_RCE_TEST';
      const before = (globalThis as Record<string, unknown>)[key];
      expect(() => run(`var __proto__ = Object; globalThis.${key} = 'owned'; return 1`)).toThrow();
      expect((globalThis as Record<string, unknown>)[key]).toBe(before);
    });
  });

  describe('remains permissive for legitimate identifier access', () => {
    it('allows whitelisted globals', () => {
      expect(run('return typeof Object')).toBe('function');
      expect(run('return typeof Math')).toBe('object');
      expect(run('return typeof Array')).toBe('function');
      expect(run('return typeof JSON.stringify')).toBe('function');
    });

    it('allows user-declared variables and functions', () => {
      expect(run('var x = 5; return x')).toBe(5);
      expect(run('function f(){ return 7; } return f()')).toBe(7);
      expect(run('let g = () => 9; return g()')).toBe(9);
    });

    it('allows ordinary function parameters and catch bindings', () => {
      expect(run('return function(a, b){ return a + b; }(2, 3)')).toBe(5);
      expect(run('return ((...xs) => xs.length)(1, 2, 3)')).toBe(3);
      expect(run("try { throw new Error('e'); } catch(err) { return err.message; }")).toBe('e');
      expect(run("try { throw 1; } catch { return 'caught'; }")).toBe('caught');
    });

    it('allows ordinary identifiers whose names are not __proto__', () => {
      expect(run('var constructor = 1; return constructor')).toBe(1);
      expect(run('var prototype = 2; return prototype')).toBe(2);
    });

    it('resolves undefined identifiers to undefined via typeof', () => {
      expect(run('return typeof nonexistent')).toBe('undefined');
    });

    it('still allows whitelisted static access on real globals', () => {
      expect(run('return Object.keys({ a: 1 })')).toEqual(['a']);
    });

    it('still blocks non-whitelisted static access on real globals', () => {
      expect(() => run('return Object.freeze({})')).toThrow(
        'Static method or property access not permitted',
      );
    });
  });
});
