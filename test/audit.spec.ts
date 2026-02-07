import Sandbox from '../src/Sandbox.js';

describe('Sandbox.audit Tests', () => {
  describe('Basic functionality', () => {
    it('should execute simple code and return result', () => {
      const result = Sandbox.audit<number>('return 2 + 3');
      expect(result.result).toBe(5);
    });

    it('should execute code with variables from scope', () => {
      const scope = { x: 10, y: 20 };
      const result = Sandbox.audit<number>('return x + y', [scope]);
      expect(result.result).toBe(30);
    });

    it('should handle function definitions', () => {
      const code = `
        function add(a, b) {
          return a + b;
        }
        return add(5, 7);
      `;
      const result = Sandbox.audit<number>(code);
      expect(result.result).toBe(12);
    });

    it('should handle arrow functions', () => {
      const code = 'return ((x, y) => x * y)(3, 4)';
      const result = Sandbox.audit<number>(code);
      expect(result.result).toBe(12);
    });

    it('should handle arrays and objects', () => {
      const code = 'return [1, 2, 3].map(x => x * 2)';
      const result = Sandbox.audit<number[]>(code);
      expect(result.result).toEqual([2, 4, 6]);
    });

    it('should handle object creation', () => {
      const code = 'return { a: 1, b: 2, c: 3 }';
      const result = Sandbox.audit<{ a: number; b: number; c: number }>(code);
      expect(result.result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('Audit mode behavior', () => {
    it('should allow access to global objects', () => {
      const code = 'return typeof Math';
      const result = Sandbox.audit<string>(code);
      expect(result.result).toBe('object');
    });

    it('should allow access to Date', () => {
      const code = 'return new Date(0).toISOString()';
      const result = Sandbox.audit<string>(code);
      expect(result.result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should allow access to JSON', () => {
      const code = 'return JSON.stringify({test: 1})';
      const result = Sandbox.audit<string>(code);
      expect(result.result).toBe('{"test":1}');
    });

    it('should provide access to console methods', () => {
      const code = 'return typeof console.log';
      const result = Sandbox.audit<string>(code);
      expect(result.result).toBe('function');
    });
  });

  describe('With multiple scopes', () => {
    it('should handle multiple scopes in order', () => {
      const scope1 = { a: 1 };
      const scope2 = { b: 2 };
      const scope3 = { c: 3 };
      const result = Sandbox.audit<number>('return a + b + c', [scope1, scope2, scope3]);
      expect(result.result).toBe(6);
    });

    it('should handle scope shadowing', () => {
      const scope1 = { x: 10 };
      const scope2 = { x: 20 };
      const result = Sandbox.audit<number>('return x', [scope1, scope2]);
      // Later scopes shadow earlier ones
      expect(result.result).toBe(20);
    });
  });

  describe('Error handling', () => {
    it('should throw runtime errors', () => {
      const code = 'throw new Error("test error")';
      expect(() => {
        Sandbox.audit(code);
      }).toThrow('test error');
    });

    it('should throw on undefined variable access', () => {
      const code = 'return nonExistentVar';
      expect(() => {
        Sandbox.audit(code);
      }).toThrow(ReferenceError);
    });

    it('should throw type errors', () => {
      const code = 'return null.property';
      expect(() => {
        Sandbox.audit(code);
      }).toThrow(TypeError);
    });
  });

  describe('Complex operations', () => {
    it('should handle loops', () => {
      const code = `
        let sum = 0;
        for (let i = 1; i <= 5; i++) {
          sum += i;
        }
        return sum;
      `;
      const result = Sandbox.audit<number>(code);
      expect(result.result).toBe(15);
    });

    it('should handle nested functions', () => {
      const code = `
        function outer(x) {
          function inner(y) {
            return x + y;
          }
          return inner(5);
        }
        return outer(10);
      `;
      const result = Sandbox.audit<number>(code);
      expect(result.result).toBe(15);
    });

    it('should handle closures', () => {
      const code = `
        function makeCounter() {
          let count = 0;
          return function() {
            return ++count;
          };
        }
        const counter = makeCounter();
        counter();
        counter();
        return counter();
      `;
      const result = Sandbox.audit<number>(code);
      expect(result.result).toBe(3);
    });

    it('should handle template literals', () => {
      const code = `
        const name = "World";
        return \`Hello, \${name}!\`;
      `;
      const result = Sandbox.audit<string>(code);
      expect(result.result).toBe('Hello, World!');
    });
  });
});
