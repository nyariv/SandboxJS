import Sandbox from '../src/Sandbox.js';

describe('Try/Finally Control Flow Tests', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  describe('Finally with return overrides try/catch', () => {
    it('should return from finally instead of try', () => {
      const code = `
        function test() {
          try {
            return 1;
          } finally {
            return 2;
          }
        }
        return test();
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe(2);
    });

    it('should return from finally instead of catch', () => {
      const code = `
        function test() {
          try {
            throw new Error('test');
          } catch (e) {
            return 1;
          } finally {
            return 2;
          }
        }
        return test();
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe(2);
    });
  });

  describe('Finally with break overrides try/catch', () => {
    it('should break from finally instead of continuing try loop', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 5; i++) {
          try {
            result += i;
            if (i === 2) continue;
          } finally {
            if (i === 2) break;
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      // Should be '012' - breaks at i=2 in finally, ignoring try's continue
      expect(result).toBe('012');
    });

    it('should break from finally overriding try return in loop', () => {
      const code = `
        function test() {
          let result = '';
          for (let i = 0; i < 5; i++) {
            try {
              result += i;
              if (i === 2) return 'early';
            } finally {
              if (i === 2) break;
            }
          }
          return result;
        }
        return test();
      `;
      const result = sandbox.compile(code).call().run();
      // Finally's break overrides try's return, so function returns '012' not 'early'
      expect(result).toBe('012');
    });

    it('should break from finally overriding catch', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 5; i++) {
          try {
            if (i === 2) throw new Error('test');
            result += i;
          } catch (e) {
            result += 'E';
          } finally {
            if (i === 2) break;
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      // Should be '01E' - breaks at i=2 in finally after catch executes
      expect(result).toBe('01E');
    });
  });

  describe('Finally with continue overrides try/catch', () => {
    it('should continue from finally instead of breaking from try', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 5; i++) {
          try {
            result += i;
            if (i === 2) break;
          } finally {
            if (i === 2) continue;
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      // Should be '01234' - finally's continue overrides try's break
      expect(result).toBe('01234');
    });

    it('should continue from finally overriding try return in loop', () => {
      const code = `
        function test() {
          let result = '';
          for (let i = 0; i < 5; i++) {
            try {
              result += i;
              if (i === 2) return 'early';
            } finally {
              if (i === 2) continue;
            }
          }
          return result;
        }
        return test();
      `;
      const result = sandbox.compile(code).call().run();
      // Finally's continue overrides try's return, continues loop
      expect(result).toBe('01234');
    });

    it('should continue from finally overriding catch', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 5; i++) {
          try {
            if (i === 2) throw new Error('test');
            result += i;
          } catch (e) {
            result += 'E';
            break;
          } finally {
            if (i === 2) continue;
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      // Should be '01E34' - finally's continue overrides catch's break
      expect(result).toBe('01E34');
    });
  });

  describe('Normal finally behavior (no control flow in finally)', () => {
    it('should allow try return to pass through when finally has no control flow', () => {
      const code = `
        function test() {
          try {
            return 1;
          } finally {
            let x = 2; // No control flow
          }
        }
        return test();
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe(1);
    });

    it('should allow try break to pass through', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 5; i++) {
          try {
            result += i;
            if (i === 2) break;
          } finally {
            result += '-';
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe('0-1-2-');
    });

    it('should allow try continue to pass through', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 5; i++) {
          try {
            result += i;
            if (i === 2) continue;
            result += 'X';
          } finally {
            result += '-';
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe('0X-1X-2-3X-4X-');
    });
  });

  describe('Finally with throw still overrides', () => {
    it('should throw from finally overriding try return', () => {
      const code = `
        function test() {
          try {
            return 1;
          } finally {
            throw new Error('finally error');
          }
        }
        try {
          return test();
        } catch (e) {
          return e.message;
        }
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe('finally error');
    });

    it('should throw from finally overriding catch return', () => {
      const code = `
        function test() {
          try {
            throw new Error('try error');
          } catch (e) {
            return 'caught';
          } finally {
            throw new Error('finally error');
          }
        }
        try {
          return test();
        } catch (e) {
          return e.message;
        }
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe('finally error');
    });
  });

  describe('Nested try/finally', () => {
    it('should handle nested finally with break', () => {
      const code = `
        let result = '';
        for (let i = 0; i < 3; i++) {
          try {
            try {
              result += i;
            } finally {
              result += 'A';
              if (i === 1) break;
            }
          } finally {
            result += 'B';
          }
        }
        return result;
      `;
      const result = sandbox.compile(code).call().run();
      expect(result).toBe('0AB1AB');
    });
  });
});
