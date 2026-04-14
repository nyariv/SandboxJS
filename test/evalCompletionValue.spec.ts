import Sandbox from '../src/Sandbox.js';

describe('eval() Completion Value Tests', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  describe('Declaration statements should return undefined', () => {
    it('should return undefined for var declaration', () => {
      const code = 'return eval("var x = 5;");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for let declaration', () => {
      const code = 'return eval("let x = 5;");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for const declaration', () => {
      const code = 'return eval("const x = 5;");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for function declaration', () => {
      const code = 'return eval("function foo() { return 42; }");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    // Note: Class declarations are not supported by the parser yet
    // it('should return undefined for class declaration', () => {
    //   const code = 'return eval("class Foo {}");';
    //   const fn = sandbox.compile(code);
    //   const result = fn().run();
    //   expect(result).toBeUndefined();
    // });
  });

  describe('Expression statements should return the value', () => {
    it('should return value for numeric expression', () => {
      const code = 'return eval("5 + 3");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBe(8);
    });

    it('should return value for string expression', () => {
      const code = 'return eval("\\"hello\\" + \\" world\\"");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBe('hello world');
    });

    it('should return value for assignment expression', () => {
      const code = 'return eval("var x; x = 10");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBe(10);
    });

    it('should return value for function call', () => {
      const code = 'return eval("Math.max(1, 2, 3)");';
      const fn = sandbox.compile(code);
      const scope = { Math };
      const result = fn(scope).run();
      expect(result).toBe(3);
    });

    it('should return value for object literal', () => {
      const code = 'return eval("({ a: 1, b: 2 })");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should return value for array literal', () => {
      const code = 'return eval("[1, 2, 3]");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('Control flow statements should return undefined', () => {
    it('should return undefined for if statement', () => {
      const code = 'return eval("if (true) { 5; }");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for for loop', () => {
      const code = 'return eval("for (let i = 0; i < 3; i++) {}");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for while loop', () => {
      const code = 'return eval("var i = 0; while (i < 3) { i++; }");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for switch statement', () => {
      const code = 'return eval("switch (1) { case 1: break; }");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for try-catch', () => {
      const code = 'return eval("try { 5; } catch (e) {}");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });
  });

  describe('Empty statements should return undefined', () => {
    it('should return undefined for empty statement', () => {
      const code = 'return eval(";");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty code', () => {
      const code = 'return eval("");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });
  });

  describe('Mixed statements - last statement determines completion value', () => {
    it('should return value when last is expression after declaration', () => {
      const code = 'return eval("let x = 5; x + 3");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBe(8);
    });

    it('should return undefined when last is declaration after expression', () => {
      const code = 'return eval("5 + 3; let x = 10");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBeUndefined();
    });

    it('should return value from expression after control flow', () => {
      const code = 'return eval("if (true) {} 42");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBe(42);
    });
  });

  describe('Return and throw should work as-is', () => {
    it('should return value for explicit return', () => {
      const code = 'return eval("return 42");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toBe(42);
    });

    it('should throw for explicit throw', () => {
      const code = 'return eval("throw new Error(\\"test\\")");';
      const fn = sandbox.compile(code);
      expect(() => fn().run()).toThrow('test');
    });

    it('should not double-wrap explicit return', () => {
      const code = 'return eval("return { value: 123 }");';
      const fn = sandbox.compile(code);
      const result = fn().run();
      expect(result).toEqual({ value: 123 });
    });
  });

  describe('Should not leak internal Prop objects', () => {
    it('should not return Prop object for let declaration', () => {
      const code = 'return eval("let x = 5");';
      const fn = sandbox.compile(code);
      const result = fn().run();

      // Should be undefined, not a Prop object
      expect(result).toBeUndefined();

      // Verify it's not an object with internal properties
      expect(typeof result).not.toBe('object');
    });

    it('should not return Prop object for const declaration', () => {
      const code = 'return eval("const x = 5");';
      const fn = sandbox.compile(code);
      const result = fn().run();

      expect(result).toBeUndefined();
      expect(typeof result).not.toBe('object');
    });

    it('should not return Prop object for var declaration', () => {
      const code = 'return eval("var x = 5");';
      const fn = sandbox.compile(code);
      const result = fn().run();

      expect(result).toBeUndefined();
      expect(typeof result).not.toBe('object');
    });
  });

  describe('Matches native JavaScript eval behavior', () => {
    it('should match eval() for declarations', () => {
      const nativeResult = eval('let x = 5; undefined;'); // eval returns undefined for declarations
      const code = 'return eval("let x = 5");';
      const fn = sandbox.compile(code);
      const sandboxResult = fn().run();

      expect(sandboxResult).toBe(nativeResult);
    });

    it('should match eval() for expressions', () => {
      const nativeResult = eval('5 + 3');
      const code = 'return eval("5 + 3");';
      const fn = sandbox.compile(code);
      const sandboxResult = fn().run();

      expect(sandboxResult).toBe(nativeResult);
    });

    it('should match eval() for assignment', () => {
      let x: number;
      const nativeResult = eval('x = 10');
      const code = 'return eval("var x; x = 10");';
      const fn = sandbox.compile(code);
      const sandboxResult = fn().run();

      expect(sandboxResult).toBe(nativeResult);
    });
  });
});
