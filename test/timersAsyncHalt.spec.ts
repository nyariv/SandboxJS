import Sandbox from '../src/Sandbox.js';
import { LocalScope } from '../src/utils.js';

describe('Async Halt and Resume Tests', () => {
  describe('async execution with halt/resume', () => {
    it('should halt async execution and resume', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      let executionCompleted = false;
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        result = 1;
        await delay(50);
        result = 2;
        await delay(50);
        result = 3;
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { result, delay };
      const { context, run } = fn(scope);
      
      // Start execution but don't wait
      const promise = run().then(() => {
        executionCompleted = true;
      });
      
      // Wait a bit for first assignment
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(scope.result).toBe(1);
      
      // Halt execution
      sandbox.haltExecution();
      
      // Wait and verify execution is halted
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(scope.result).toBe(1); // Should still be 1
      expect(executionCompleted).toBe(false);
      
      // Resume execution
      sandbox.resumeExecution();
      
      // Wait for completion
      await promise;
      expect(scope.result).toBe(3);
      expect(executionCompleted).toBe(true);
    }, 10000);

    it('should handle halt subscription during async execution', async () => {
      const sandbox = new Sandbox();
      let haltCalled = false;
      
      sandbox.subscribeHalt(() => {
        haltCalled = true;
      });
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        await delay(50);
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { delay };
      const { context, run } = fn(scope);
      
      // Start execution
      const promise = run();
      
      // Wait a bit then halt
      await new Promise(resolve => setTimeout(resolve, 30));
      sandbox.haltExecution();
      
      expect(haltCalled).toBe(true);
      
      // Resume to allow cleanup
      sandbox.resumeExecution();
      await promise;
    });

    it('should handle resume subscription during async execution', async () => {
      const sandbox = new Sandbox();
      let resumeCalled = false;
      
      sandbox.subscribeResume(() => {
        resumeCalled = true;
      });
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        await delay(50);
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { delay };
      const { context, run } = fn(scope);
      
      // Start execution
      const promise = run();
      
      // Wait a bit then halt
      await new Promise(resolve => setTimeout(resolve, 30));
      sandbox.haltExecution();
      
      // Resume
      await new Promise(resolve => setTimeout(resolve, 20));
      sandbox.resumeExecution();
      
      expect(resumeCalled).toBe(true);
      
      // Wait for completion
      await promise;
    });

    it('should pause execution on tick limit and resume', async () => {
      const sandbox = new Sandbox();
      let result = 0;
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const code = `
        for (let i = 0; i < 100; i++) {
          result = i;
        }
        await delay(10);
        result = 999;
      `;
      const fn = sandbox.compileAsync(code);
      const scope = { result, delay };
      const { context, run } = fn(scope);
      
      // Set a tick limit
      context.ctx.ticks.tickLimit = 100n;
      
      let haltCalled = 0;
      sandbox.subscribeHalt(() => {
        haltCalled++;
      });
      
      // Start execution - should halt due to tick limit
      const promise = run();
      
      // Wait for halt
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(haltCalled).toBe(1);
      
      // Resume execution
      context.ctx.ticks.tickLimit = undefined;
      sandbox.resumeExecution();
      
      // Wait for completion
      await promise;
      expect(scope.result).toBe(999);
    });
  });
});
