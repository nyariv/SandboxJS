import Sandbox from '../src/Sandbox.js';
import { LocalScope } from '../src/utils.js';

describe('Timer Tests', () => {
  describe('setTimeout', () => {
    it('should execute setTimeout callback', (done) => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        setTimeout(() => {
          result = 42;
        }, 10);
      `;
      const fn = sandbox.compile(code);
      const scope = { result };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.result).toBe(42);
        done();
      }, 50);
    });

    it('should clear setTimeout with clearTimeout', (done) => {
      const sandbox = new Sandbox();
      let result = 0;
      const code = `
        const timeoutId = setTimeout(() => {
          result = 42;
        }, 10);
        clearTimeout(timeoutId);
      `;
      const fn = sandbox.compile(code);
      const scope = { result };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.result).toBe(0);
        done();
      }, 50);
    });
  });

  describe('setInterval', () => {
    it('should execute setInterval callback multiple times', (done) => {
      const sandbox = new Sandbox();
      let count = 0;
      const code = `
        const intervalId = setInterval(() => {
          count++;
          if (count >= 3) {
            clearInterval(intervalId);
          }
        }, 10);
      `;
      const fn = sandbox.compile(code);
      const scope = { count };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.count).toBeGreaterThanOrEqual(3);
        done();
      }, 100);
    });

    it('should clear setInterval with clearInterval', (done) => {
      const sandbox = new Sandbox();
      let count = 0;
      const code = `
        const intervalId = setInterval(() => {
          count++;
        }, 10);
        clearInterval(intervalId);
      `;
      const fn = sandbox.compile(code);
      const scope = { count };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.count).toBe(0);
        done();
      }, 50);
    });
  });

  describe('setTimeout/setInterval with string arguments', () => {
    it('should execute setTimeout with string code argument', (done) => {
      const sandbox = new Sandbox();
      let completed = false;
      const code = `
        // String code executes in isolated scope
        setTimeout('1 + 1', 10);
        setTimeout(() => {
          completed = true;
        }, 30);
      `;
      const fn = sandbox.compile(code);
      const scope = { completed };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.completed).toBe(true);
        done();
      }, 50);
    });

    it('should execute setInterval with string code argument', (done) => {
      const sandbox = new Sandbox();
      let completed = false;
      const code = `
        globalThis.completed = completed;
        const intervalId = setInterval('this.completed = true', 10);
        setTimeout(() => {
          clearInterval(intervalId);
          completed = globalThis.completed;
        }, 55);
      `;
      const fn = sandbox.compile(code);
      const scope = { completed };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.completed).toBe(true);
        done();
      }, 100);
    });

    it('should clear setTimeout with string code before execution', (done) => {
      const sandbox = new Sandbox();
      let completed = false;
      const code = `
        const timeoutId = setTimeout('this.completed = 1 + 1', 10);
        clearTimeout(timeoutId);
        completed = globalThis.completed || false;
      `;
      const fn = sandbox.compile(code);
      const scope = { completed }; 
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.completed).toBe(false);
        done();
      }, 50);
    });

    it('should execute string code with multiple statements', (done) => {
      const sandbox = new Sandbox();
      let completed = false;
      const code = `
        globalThis.completed = completed;
        setTimeout('let x = 5; let y = 10; this.completed = x + y', 10);
        setTimeout(() => {
          completed = globalThis.completed;
        }, 30);
      `;
      const fn = sandbox.compile(code);
      const scope = { completed };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.completed).toEqual(15);
        done();
      }, 50);
    });

    it('should execute string code with expressions', (done) => {
      const sandbox = new Sandbox();
      let completed = false;
      const code = `
        setTimeout('2 + 3', 10);
        setTimeout(() => {
          completed = true;
        }, 30);
      `;
      const fn = sandbox.compile(code);
      const scope = { completed };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.completed).toBe(true);
        done();
      }, 50);
    });

    it('should handle empty string code', (done) => {
      const sandbox = new Sandbox();
      let completed = false;
      const code = `
        setTimeout('', 10);
        setTimeout(() => {
          completed = true;
        }, 30);
      `;
      const fn = sandbox.compile(code);
      const scope = { completed };
      const { context, run } = fn(scope);
      run();
      
      setTimeout(() => {
        expect(scope.completed).toBe(true);
        done();
      }, 50);
    });
  });
});
