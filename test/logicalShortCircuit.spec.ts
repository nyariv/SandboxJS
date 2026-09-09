import Sandbox from '../src/Sandbox.js';

/**
 * `&&` and `||` must short-circuit like native JavaScript: the right operand is only
 * evaluated when the left operand does not already decide the result. Before the fix,
 * both operands were always evaluated, so `obj && obj.prop` threw on a null `obj` and
 * side effects on the right-hand side ran unconditionally.
 */
describe('Logical operator short-circuit', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  function makeScope() {
    const scope = {
      calls: 0,
      hit: (value: unknown) => (scope.calls++, value),
      later: (value: unknown) => Promise.resolve(value),
      obj: null as Record<string, unknown> | null,
    };
    return scope;
  }

  describe('&& (sync)', () => {
    it('returns the left operand and skips the right when the left is falsy', () => {
      for (const left of ['null', 'undefined', '0', '""', 'false', 'NaN']) {
        const scope = makeScope();
        const result = sandbox.compile(`return ${left} && hit(1)`)(scope).run();
        expect(result).toBe(eval(left));
        expect(scope.calls).toBe(0);
      }
    });

    it('returns the right operand when the left is truthy', () => {
      const scope = makeScope();
      const result = sandbox.compile('return 1 && hit(2)')(scope).run();
      expect(result).toBe(2);
      expect(scope.calls).toBe(1);
    });

    it('does not throw for the `obj && obj.prop` guard pattern', () => {
      const scope = makeScope();
      expect(sandbox.compile('return obj && obj.prop')(scope).run()).toBeNull();
      scope.obj = { prop: 'x' };
      expect(sandbox.compile('return obj && obj.prop')(scope).run()).toBe('x');
    });

    it('stops at the first falsy operand in a chain', () => {
      const scope = makeScope();
      const result = sandbox.compile('return hit(1) && hit(0) && hit(2)')(scope).run();
      expect(result).toBe(0);
      expect(scope.calls).toBe(2);
    });
  });

  describe('|| (sync)', () => {
    it('returns the left operand and skips the right when the left is truthy', () => {
      for (const left of ['1', '"x"', 'true', '[]', '({})']) {
        const scope = makeScope();
        const result = sandbox.compile(`return ${left} || hit(2)`)(scope).run();
        expect(result).toEqual(eval(left));
        expect(scope.calls).toBe(0);
      }
    });

    it('returns the right operand when the left is falsy', () => {
      const scope = makeScope();
      const result = sandbox.compile('return 0 || hit(2)')(scope).run();
      expect(result).toBe(2);
      expect(scope.calls).toBe(1);
    });

    it('does not throw for the `!obj || obj.prop` guard pattern', () => {
      const scope = makeScope();
      expect(sandbox.compile('return !obj || obj.prop')(scope).run()).toBe(true);
    });

    it('stops at the first truthy operand in a chain', () => {
      const scope = makeScope();
      const result = sandbox.compile('return hit(0) || hit(1) || hit(2)')(scope).run();
      expect(result).toBe(1);
      expect(scope.calls).toBe(2);
    });

    it('is not affected by a default-value pattern with an object left operand', () => {
      const scope = makeScope();
      scope.obj = { a: 1 };
      const result = sandbox.compile('return obj || hit({})')(scope).run();
      expect(result).toBe(scope.obj);
      expect(scope.calls).toBe(0);
    });
  });

  describe('?? (regression)', () => {
    it('still short-circuits only on null/undefined', () => {
      const scope = makeScope();
      expect(sandbox.compile('return 0 ?? hit(1)')(scope).run()).toBe(0);
      expect(scope.calls).toBe(0);
      expect(sandbox.compile('return null ?? hit(1)')(scope).run()).toBe(1);
      expect(scope.calls).toBe(1);
    });
  });

  describe('async path', () => {
    it('short-circuits && and || in compileAsync', async () => {
      const scope = makeScope();
      expect(await sandbox.compileAsync('return null && hit(1)')(scope).run()).toBeNull();
      expect(await sandbox.compileAsync('return 1 || hit(2)')(scope).run()).toBe(1);
      expect(scope.calls).toBe(0);
      expect(await sandbox.compileAsync('return obj && obj.prop')(scope).run()).toBeNull();
      expect(await sandbox.compileAsync('return 1 && hit(2)')(scope).run()).toBe(2);
      expect(await sandbox.compileAsync('return 0 || hit(3)')(scope).run()).toBe(3);
      expect(scope.calls).toBe(2);
    });

    it('short-circuits around awaited operands', async () => {
      const scope = makeScope();
      const result = await sandbox
        .compileAsync('return (await later(null)) && hit(1)')(scope)
        .run();
      expect(result).toBeNull();
      expect(scope.calls).toBe(0);
    });
  });
});
