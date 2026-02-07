'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: "throw new Error('test')",
    evalExpect: 'error',
    safeExpect: '/test/',
    category: 'Error Handling',
  },
  {
    code: 'try {a.x.a} catch {return 1}; return 2',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Error Handling',
  },
  {
    code: "try { throw new Error('test'); } catch { return 'caught'; }",
    evalExpect: 'caught',
    safeExpect: 'caught',
    category: 'Error Handling',
  },
];
