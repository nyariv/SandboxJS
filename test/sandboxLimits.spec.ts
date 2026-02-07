import Sandbox from '../src/Sandbox.js';

describe('Executor Edge Cases', () => {
  describe('Function creation restrictions', () => {
    it('should throw when function creation is forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const fn = sandbox.compile('(function() { return 1; })()');
      expect(() => {
        fn({}).run();
      }).toThrow('Function creation is forbidden');
    });

    it('should throw when arrow function creation is forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const fn = sandbox.compile('(() => 1)()');
      expect(() => {
        fn({}).run();
      }).toThrow('Function creation is forbidden');
    });

    it('should throw when async function creation is forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const fn = sandbox.compile('(async function() { return 1; })');
      expect(() => {
        fn({}).run();
      }).toThrow('Function creation is forbidden');
    });

    it('should throw when async arrow function creation is forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const fn = sandbox.compile('(async () => 1)');
      expect(() => {
        fn({}).run();
      }).toThrow('Function creation is forbidden');
    });
  });

  describe('Function call restrictions', () => {
    it('should throw when function calls are forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCalls: true });
      const fn = sandbox.compile('Math.abs(-1)');
      expect(() => {
        fn({}).run();
      }).toThrow('Function invocations are not allowed');
    });
  });

  describe('Regex restrictions', () => {
    it('should throw when regex is not permitted', () => {
      const sandbox = new Sandbox({ globals: {} });
      const fn = sandbox.compile('/test/');
      expect(() => {
        fn({}).run();
      }).toThrow('Regex not permitted');
    });
  });

  describe('haltOnSandboxError option', () => {
    it('should halt execution when SandboxError is thrown and haltOnSandboxError is true', () => {
      const sandbox = new Sandbox({
        forbidFunctionCalls: true,
        haltOnSandboxError: true,
      });
      let haltCalled = false;
      let haltError: Error | undefined;

      sandbox.subscribeHalt((args) => {
        haltCalled = true;
        haltError = args?.error;
      });

      const fn = sandbox.compile('Math.abs(-1)');
      const { run } = fn({});

      // Should not throw immediately, but halt instead
      run();

      expect(haltCalled).toBe(true);
      expect(haltError).toBeDefined();
      expect(haltError?.message).toBe('Function invocations are not allowed');
    });

    it('should throw immediately when SandboxError is thrown and haltOnSandboxError is false', () => {
      const sandbox = new Sandbox({
        forbidFunctionCalls: true,
        haltOnSandboxError: false,
      });
      let haltCalled = false;

      sandbox.subscribeHalt(() => {
        haltCalled = true;
      });

      const fn = sandbox.compile('Math.abs(-1)');

      expect(() => {
        fn({}).run();
      }).toThrow('Function invocations are not allowed');

      expect(haltCalled).toBe(false);
    });

    it('should throw immediately when SandboxError is thrown and haltOnSandboxError is undefined', () => {
      const sandbox = new Sandbox({ forbidFunctionCalls: true });
      const fn = sandbox.compile('Math.abs(-1)');

      expect(() => {
        fn({}).run();
      }).toThrow('Function invocations are not allowed');
    });

    it('should resume and propagate error after halt', (done) => {
      const sandbox = new Sandbox({
        forbidFunctionCalls: true,
        haltOnSandboxError: true,
      });
      let haltCalled = false;
      let errorReceived: Error | undefined;

      sandbox.subscribeHalt((args) => {
        haltCalled = true;
        errorReceived = args?.error;

        // Resume after a short delay
        setTimeout(() => {
          sandbox.resumeExecution();
        }, 50);
      });

      const fn = sandbox.compile('Math.abs(-1)');
      const { run } = fn({});

      // Run - execution will halt
      run();

      // Wait for resume to happen
      setTimeout(() => {
        expect(haltCalled).toBe(true);
        expect(errorReceived).toBeDefined();
        expect(errorReceived?.message).toBe('Function invocations are not allowed');
        done();
      }, 100);
    });

    it('should halt on function creation error when haltOnSandboxError is true', () => {
      const sandbox = new Sandbox({
        forbidFunctionCreation: true,
        haltOnSandboxError: true,
      });
      let haltCalled = false;
      let haltError: Error | undefined;

      sandbox.subscribeHalt((args) => {
        haltCalled = true;
        haltError = args?.error;
      });

      const fn = sandbox.compile('(() => 1)()');
      const { run } = fn({});
      run();

      expect(haltCalled).toBe(true);
      expect(haltError).toBeDefined();
      expect(haltError?.message).toBe('Function creation is forbidden');
    });

    it('should halt on regex error when haltOnSandboxError is true', () => {
      const sandbox = new Sandbox({
        globals: {},
        haltOnSandboxError: true,
      });
      let haltCalled = false;
      let haltError: Error | undefined;

      sandbox.subscribeHalt((args) => {
        haltCalled = true;
        haltError = args?.error;
      });

      const fn = sandbox.compile('/test/');
      const { run } = fn({});
      run();

      expect(haltCalled).toBe(true);
      expect(haltError).toBeDefined();
      expect(haltError?.message).toBe('Regex not permitted');
    });

    it('should not halt on non-SandboxError exceptions', () => {
      const sandbox = new Sandbox({ haltOnSandboxError: true });
      let haltCalled = false;

      sandbox.subscribeHalt(() => {
        haltCalled = true;
      });

      const fn = sandbox.compile('throw new Error("Regular error")');

      expect(() => {
        fn({}).run();
      }).toThrow('Regular error');

      expect(haltCalled).toBe(false);
    });

    it('should provide context information when halting', () => {
      const sandbox = new Sandbox({
        forbidFunctionCalls: true,
        haltOnSandboxError: true,
      });
      let haltContext: any;

      sandbox.subscribeHalt((args) => {
        haltContext = args;
      });

      const fn = sandbox.compile('Math.abs(-1)');
      const { run } = fn({});
      run();

      expect(haltContext).toBeDefined();
      expect(haltContext.error).toBeDefined();
      expect(haltContext.ticks).toBeDefined();
      expect(haltContext.scope).toBeDefined();
      expect(haltContext.context).toBeDefined();
    });
  });
});
