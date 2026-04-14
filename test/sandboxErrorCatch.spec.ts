import Sandbox from '../src/Sandbox.js';

describe('SandboxError catch behavior', () => {
  describe('SandboxError is not catchable by sandboxed code', () => {
    it('sandboxed try/catch cannot catch a SandboxError — it propagates out', () => {
      const sandbox = new Sandbox({ forbidFunctionCalls: true });
      const scope: Record<string, unknown> = { catchRan: false };
      const fn = sandbox.compile(`
        try {
          Math.abs(-1);
        } catch (e) {
          catchRan = true;
        }
      `);
      expect(() => fn(scope).run()).toThrow('Function invocations are not allowed');
      expect(scope['catchRan']).toBe(false);
    });

    it('sandboxed try/catch cannot catch a function-creation SandboxError', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const scope: Record<string, unknown> = { catchRan: false };
      const fn = sandbox.compile(`
        try {
          (() => 1)();
        } catch (e) {
          catchRan = true;
        }
      `);
      expect(() => fn(scope).run()).toThrow('Function creation is forbidden');
      expect(scope['catchRan']).toBe(false);
    });

    it('sandboxed try/catch cannot catch a regex SandboxError', () => {
      const sandbox = new Sandbox({ globals: {} });
      const scope: Record<string, unknown> = { catchRan: false };
      const fn = sandbox.compile(`
        try {
          /test/;
        } catch (e) {
          catchRan = true;
        }
      `);
      expect(() => fn(scope).run()).toThrow('Regex not permitted');
      expect(scope['catchRan']).toBe(false);
    });

    it('finally does not run when a SandboxError occurs', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const scope: Record<string, unknown> = { finallyRan: false };
      const fn = sandbox.compile(`
        try {
          (() => 1)();
        } catch (e) {
          // should not run
        } finally {
          finallyRan = true;
        }
      `);
      expect(() => fn(scope).run()).toThrow('Function creation is forbidden');
      expect(scope['finallyRan']).toBe(false);
    });

    it('finally does not run without a catch block when SandboxError occurs', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const scope: Record<string, unknown> = { finallyRan: false };
      const fn = sandbox.compile(`
        try {
          (() => 1)();
        } finally {
          finallyRan = true;
        }
      `);
      expect(() => fn(scope).run()).toThrow('Function creation is forbidden');
      expect(scope['finallyRan']).toBe(false);
    });

    it('nested try/catch: inner catch does not intercept SandboxError, outer also cannot', () => {
      const sandbox = new Sandbox({ forbidFunctionCalls: true });
      const scope: Record<string, unknown> = { innerCaught: false, outerCaught: false };
      const fn = sandbox.compile(`
        try {
          try {
            Math.abs(-1);
          } catch (inner) {
            innerCaught = true;
          }
        } catch (outer) {
          outerCaught = true;
        }
      `);
      expect(() => fn(scope).run()).toThrow('Function invocations are not allowed');
      expect(scope['innerCaught']).toBe(false);
      expect(scope['outerCaught']).toBe(false);
    });

    it('non-SandboxError can still be caught normally', () => {
      const sandbox = new Sandbox();
      const scope: Record<string, unknown> = { caught: false };
      const fn = sandbox.compile(`
        try {
          throw new Error('regular error');
        } catch (e) {
          caught = true;
        }
      `);
      fn(scope).run();
      expect(scope['caught']).toBe(true);
    });

    it('execution after a caught non-SandboxError continues normally', () => {
      const sandbox = new Sandbox();
      const fn = sandbox.compile(`
        let x = 0;
        try {
          throw new Error('oops');
        } catch (e) {
          x = 1;
        }
        return x + 10;
      `);
      expect(fn({}).run()).toBe(11);
    });
  });

  describe('when haltOnSandboxError is true', () => {
    it('halt fires when SandboxError escapes (no try/catch)', () => {
      const sandbox = new Sandbox({ forbidFunctionCalls: true, haltOnSandboxError: true });
      let haltFired = false;
      let haltError: Error | undefined;

      sandbox.subscribeHalt((args) => {
        haltFired = true;
        haltError = args?.error;
      });

      sandbox.compile('Math.abs(-1)')({}).run();

      expect(haltFired).toBe(true);
      expect(haltError?.message).toBe('Function invocations are not allowed');
    });

    it('halt fires when SandboxError escapes a try/catch (catch does not run)', () => {
      const sandbox = new Sandbox({ forbidFunctionCalls: true, haltOnSandboxError: true });
      let haltFired = false;
      const scope: Record<string, unknown> = { catchRan: false };

      sandbox.subscribeHalt(() => {
        haltFired = true;
      });

      const fn = sandbox.compile(`
        try {
          Math.abs(-1);
        } catch (e) {
          catchRan = true;
        }
      `);
      fn(scope).run();

      expect(haltFired).toBe(true);
      expect(scope['catchRan']).toBe(false);
    });

    it('halt fires when SandboxError occurs inside a try/finally', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true, haltOnSandboxError: true });
      let haltFired = false;

      sandbox.subscribeHalt(() => {
        haltFired = true;
      });

      sandbox
        .compile(
          `
        try {
          (() => 1)();
        } finally {
          // finally does not prevent halt
        }
      `,
        )({})
        .run();

      expect(haltFired).toBe(true);
    });

    it('non-SandboxError can still be caught — halt does not fire', () => {
      const sandbox = new Sandbox({ haltOnSandboxError: true });
      let haltFired = false;
      const scope: Record<string, unknown> = { caught: false };

      sandbox.subscribeHalt(() => {
        haltFired = true;
      });

      sandbox
        .compile(
          `
        try {
          throw new Error('regular error');
        } catch (e) {
          caught = true;
        }
      `,
        )(scope)
        .run();

      expect(haltFired).toBe(false);
      expect(scope['caught']).toBe(true);
    });
  });
});
