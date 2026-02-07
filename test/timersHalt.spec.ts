import Sandbox from '../src/Sandbox.js';
import { LocalScope } from '../src/utils.js';

describe('Timer Halt and Resume Tests', () => {
  describe('setTimeout with halt/resume', () => {
    it('should pause setTimeout when halted and resume when continued', (done) => {
      const sandbox = new Sandbox({
        globals: {
          setTimeout,
        },
      });
      let result = 0;
      const code = `
        setTimeout(() => {
          result = 42;
        }, 50);
      `;
      const fn = sandbox.compile(code);
      const scope = { result };
      const { context, run } = fn(scope);
      run();

      // Halt immediately
      sandbox.haltExecution();

      // Check that callback didn't execute during halt
      setTimeout(() => {
        expect(scope.result).toBe(0);

        // Resume execution
        sandbox.resumeExecution();

        // Check that callback executes after resume
        setTimeout(() => {
          expect(scope.result).toBe(42);
          done();
        }, 100);
      }, 100);
    });

    it('should trigger halt subscription when halted', (done) => {
      const sandbox = new Sandbox({
        globals: {
          setTimeout,
        },
      });
      let haltCalled = false;

      sandbox.subscribeHalt(() => {
        haltCalled = true;
      });

      const code = `
        setTimeout(() => {}, 100);
      `;
      const fn = sandbox.compile(code);
      const { context, run } = fn();
      run();

      sandbox.haltExecution();

      setTimeout(() => {
        expect(haltCalled).toBe(true);
        done();
      }, 50);
    });

    it('should trigger resume subscription when resumed', (done) => {
      const sandbox = new Sandbox({
        globals: {
          setTimeout,
        },
      });
      let resumeCalled = false;

      sandbox.subscribeResume(() => {
        resumeCalled = true;
      });

      const code = `
        setTimeout(() => {}, 100);
      `;
      const fn = sandbox.compile(code);
      const { context, run } = fn();
      run();

      sandbox.haltExecution();

      setTimeout(() => {
        sandbox.resumeExecution();
        expect(resumeCalled).toBe(true);
        done();
      }, 50);
    });
  });

  describe('setInterval with halt/resume', () => {
    it('should pause setInterval when halted and resume when continued', (done) => {
      const sandbox = new Sandbox({
        globals: {
          setInterval,
          clearInterval,
        },
      });
      let count = 0;
      const code = `
        const intervalId = setInterval(() => {
          count++;
          if (count >= 5) {
            clearInterval(intervalId);
          }
        }, 20);
      `;
      const fn = sandbox.compile(code);
      const scope = { count };
      const { context, run } = fn(scope);
      run();

      // Let it run a bit
      setTimeout(() => {
        const countBeforeHalt = scope.count;
        sandbox.haltExecution();

        // Wait during halt
        setTimeout(() => {
          // Count should not increase during halt
          expect(scope.count).toBe(countBeforeHalt);

          // Resume execution
          sandbox.resumeExecution();

          // Wait for interval to complete
          setTimeout(() => {
            expect(scope.count).toBeGreaterThanOrEqual(5);
            done();
          }, 200);
        }, 100);
      }, 50);
    });
  });
});
