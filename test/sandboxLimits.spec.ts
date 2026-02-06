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
});
