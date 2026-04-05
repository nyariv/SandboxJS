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

    it('should throw when generator creation is forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const fn = sandbox.compile('(function* () { yield 1; })().next().value');
      expect(() => {
        fn({}).run();
      }).toThrow('Function creation is forbidden');
    });

    it('should throw when async generator creation is forbidden', () => {
      const sandbox = new Sandbox({ forbidFunctionCreation: true });
      const fn = sandbox.compile('(async function* () { yield 1; })()');
      expect(() => {
        fn({}).run();
      }).toThrow('Function creation is forbidden');
    });

    it('should throw when async generators are not permitted', () => {
      const sandbox = new Sandbox({ prototypeWhitelist: new Map() });
      const fn = sandbox.compile('(async function* () { yield 1; })()');
      expect(() => {
        fn({}).run();
      }).toThrow('Async/await not permitted');
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

  describe('maxParserRecursionDepth option', () => {
    it('should not throw with default maxParserRecursionDepth and 256 nesting', () => {
      const sandbox = new Sandbox();
      const deeplyNested = 'return' + '('.repeat(256) + '1' + ')'.repeat(256);
      const fn = sandbox.compile(deeplyNested);
      expect(fn({}).run()).toBe(1);
    });

    it('should throw when expression nesting exceeds maxParserRecursionDepth', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 5 });
      const deeplyNested = '('.repeat(10) + '1' + ')'.repeat(10);
      expect(() => {
        sandbox.compile(deeplyNested);
      }).toThrow('Maximum expression depth exceeded');
    });

    it('should not throw when expression nesting is within maxParserRecursionDepth', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 20 });
      const nested = 'return (((1 + 2)))';
      const fn = sandbox.compile(nested);
      expect(fn({}).run()).toBe(3);
    });

    it('should throw on deeply nested template literals when depth is low', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 2 });
      expect(() => {
        sandbox.compile('`${ `${ `${ 1 }` }` }`');
      }).toThrow('Maximum expression depth exceeded');
    });

    it('should parse deeply nested template literals within depth limit', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 4 });
      const fn = sandbox.compile('return `${ `${ 1 }` }`');
      expect(fn({}).run()).toBe('1');
    });

    it('should apply depth limit when using compileExpression', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 5 });
      const deeplyNested = '('.repeat(10) + '1' + ')'.repeat(10);
      expect(() => {
        sandbox.compileExpression(deeplyNested);
      }).toThrow('Maximum expression depth exceeded');
    });

    it('should apply depth limit when using compileExpressionAsync', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 5 });
      const deeplyNested = '('.repeat(10) + '1' + ')'.repeat(10);
      expect(() => {
        sandbox.compileExpressionAsync(deeplyNested);
      }).toThrow('Maximum expression depth exceeded');
    });

    it('should apply depth limit when using compileAsync', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 5 });
      const deeplyNested = '('.repeat(10) + '1' + ')'.repeat(10);
      expect(() => {
        sandbox.compileAsync(deeplyNested);
      }).toThrow('Maximum expression depth exceeded');
    });

    it('should apply depth limit when calling Function constructor', () => {
      const sandbox = new Sandbox({ maxParserRecursionDepth: 5 });
      expect(() => {
        sandbox
          .compile('new Function("return " + "(".repeat(10) + "1" + ")".repeat(10))()')({})
          .run();
      }).toThrow('Maximum expression depth exceeded');
    });
  });
});
