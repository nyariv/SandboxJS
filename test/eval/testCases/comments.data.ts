'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: '/* 2 */ 1',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Comments',
  },
  {
    code: '1 // 2',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Comments',
  },
  {
    code: '/* 2 */ (() => /* 3 */ 1)() // 4',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Comments',
  },
];
