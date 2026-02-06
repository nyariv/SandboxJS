import Sandbox from '../src/Sandbox.js';
import { LocalScope } from '../src/utils.js';

describe('Async Timer Tests', () => {
  describe('setTimeout with async execution', () => {
    it('should execute async setTimeout callback', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      
      // Provide a delay function to the sandbox
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        await delay(50);
        result = 42;
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { result, delay };
      const { context, run } = fn(scope);
      
      await run();
      expect(scope.result).toBe(42);
    });

    it('should handle multiple async delays', async () => {
      const sandbox = new Sandbox();
      let results: number[] = [];
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        results.push(1);
        await delay(30);
        results.push(2);
        await delay(30);
        results.push(3);
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { results, delay };
      const { context, run } = fn(scope);
      
      await run();
      expect(scope.results).toEqual([1, 2, 3]);
    });

    it('should handle async setTimeout in sandbox', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        setTimeout(async () => {
          await delay(30);
          result = 42;
        }, 20);
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { result, delay };
      const { context, run } = fn(scope);
      
      await run();
      
      // Wait for the async callback to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(scope.result).toBe(42);
    });
  });
});
