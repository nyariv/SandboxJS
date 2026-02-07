import Sandbox from '../src/Sandbox.js';
import { LocalScope } from '../src/utils.js';

describe('Expression Compilation Tests', () => {
  describe('compileExpression - only first statement/expression', () => {
    it('should only compile first statement, ignoring rest', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = 'result = 1; result = 2';
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      // Only first statement executes
      expect(scope.result).toBe(1);
    });

    it('should only compile first expression with semicolons', () => {
      const sandbox = new Sandbox();
      let a = 0;
      let b = 0;
      const code = 'a = 5; b = 10';
      const fn = sandbox.compileExpression(code);
      const scope = { a, b };
      fn(scope).run();
      expect(scope.a).toBe(5);
      expect(scope.b).toBe(0); // Second statement not executed
    });

    it('should compile single expression', () => {
      const sandbox = new Sandbox();
      let x = 0;
      const code = 'x = 42';
      const fn = sandbox.compileExpression(code);
      const scope = { x };
      fn(scope).run();
      expect(scope.x).toBe(42);
    });

    it('should handle ternary operator', () => {
      const sandbox = new Sandbox();
      let result = '';
      const code = 'result = (value > 5 ? "big" : "small")';
      const fn = sandbox.compileExpression(code);
      const scope1 = { result, value: 10 };
      const scope2 = { result: '', value: 3 };
      fn(scope1).run();
      fn(scope2).run();
      expect(scope1.result).toBe('big');
      expect(scope2.result).toBe('small');
    });

    it('should execute function call in expression', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const fn = sandbox.compileExpression('result = callback()');
      const scope = {
        result,
        callback: () => 99,
      };
      fn(scope).run();
      expect(scope.result).toBe(99);
    });
  });

  describe('compileExpression - allows functions with statements', () => {
    it('should allow IIFE with multiple statements', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = 'result = (() => { let a = 1; let b = 2; return a + b; })()';
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(3);
    });

    it('should allow arrow function with multiple statements', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = 'result = ((x) => { const y = x * 2; const z = y + 3; return z; })(5)';
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(13);
    });

    it('should allow function expression with statements', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = 'result = (function() { let x = 10; let y = 20; return x + y; })()';
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(30);
    });

    it('should allow nested functions with loops', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        result = ((a) => {
          const helper = (b) => {
            let sum = 0;
            for (let i = 0; i < b; i++) {
              sum += i;
            }
            return sum;
          };
          return helper(a);
        })(5)
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(10); // 0+1+2+3+4
    });

    it('should allow functions with if statements', () => {
      const sandbox = new Sandbox();
      let result = '';
      const code = `
        result = ((x) => {
          if (x > 10) {
            return 'greater';
          } else {
            return 'less';
          }
        })(15)
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe('greater');
    });

    it('should allow functions with while loops', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        result = (() => {
          let i = 0;
          let sum = 0;
          while (i < 5) {
            sum += i;
            i++;
          }
          return sum;
        })()
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(10); // 0+1+2+3+4
    });

    it('should allow functions with try-catch', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        result = (() => {
          try {
            let x = 10;
            return x * 2;
          } catch (e) {
            return 0;
          }
        })()
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(20);
    });

    it('should allow functions with switch statements', () => {
      const sandbox = new Sandbox();
      let result = '';
      const code = `
        result = ((x) => {
          let res;
          switch (x) {
            case 1:
              res = 'one';
              break;
            case 2:
              res = 'two';
              break;
            default:
              res = 'other';
          }
          return res;
        })(2)
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe('two');
    });

    it('should allow functions with variable declarations', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        result = (() => {
          let x = 5;
          const y = 10;
          var z = 15;
          return x + y + z;
        })()
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(30);
    });

    it('should allow functions with for loops', () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        result = (() => {
          let total = 0;
          for (let i = 1; i <= 5; i++) {
            total += i;
          }
          return total;
        })()
      `;
      const fn = sandbox.compileExpression(code);
      const scope = { result };
      fn(scope).run();
      expect(scope.result).toBe(15); // 1+2+3+4+5
    });
  });

  describe('compileExpressionAsync - only first statement/expression', () => {
    it('should only compile first async statement', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const code = 'result = await delay(10).then(() => 1); result = 2';
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result, delay };
      await fn(scope).run();
      // Only first statement executes
      expect(scope.result).toBe(1);
    });

    it('should compile single await expression', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = 'result = await Promise.resolve(42)';
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result };
      await fn(scope).run();
      expect(scope.result).toBe(42);
    });
  });

  describe('compileExpressionAsync - allows async functions with statements', () => {
    it('should allow async IIFE with multiple statements', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const code = `
        result = await (async () => {
          let a = 1;
          await delay(10);
          let b = 2;
          return a + b;
        })()
      `;
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result, delay };
      await fn(scope).run();
      expect(scope.result).toBe(3);
    });

    it('should allow async function with for-of loop', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const code = `
        result = await (async (arr) => {
          let sum = 0;
          for (const item of arr) {
            await delay(5);
            sum += item;
          }
          return sum;
        })([1, 2, 3, 4, 5])
      `;
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result, delay };
      await fn(scope).run();
      expect(scope.result).toBe(15);
    });

    it('should allow async function with try-catch', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        result = await (async () => {
          try {
            const x = await Promise.resolve(10);
            return x * 2;
          } catch (e) {
            return 0;
          }
        })()
      `;
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result };
      await fn(scope).run();
      expect(scope.result).toBe(20);
    });

    it('should allow Promise.all', async () => {
      const sandbox = new Sandbox();
      let result: number[] = [];
      const delay = (ms: number, val: number) =>
        new Promise<number>((resolve) => setTimeout(() => resolve(val), ms));
      const code = 'result = await Promise.all([delay(10, 1), delay(10, 2), delay(10, 3)])';
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result, delay };
      await fn(scope).run();
      expect(scope.result).toEqual([1, 2, 3]);
    });

    it('should allow async arrow function with conditionals', async () => {
      const sandbox = new Sandbox();
      let result = '';
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const code = `
        result = await (async (x) => {
          await delay(5);
          if (x > 10) {
            return 'big';
          } else if (x > 5) {
            return 'medium';
          } else {
            return 'small';
          }
        })(7)
      `;
      const fn = sandbox.compileExpressionAsync(code);
      const scope = { result, delay };
      await fn(scope).run();
      expect(scope.result).toBe('medium');
    });
  });
});
