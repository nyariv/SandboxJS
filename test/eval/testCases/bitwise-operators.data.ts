'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: '~test2',
    evalExpect: -2,
    safeExpect: -2,
    category: 'Bitwise Operators',
  },
  {
    code: 'let test3 = 8; test3 >>>= 2; return test3',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Bitwise Operators',
  },
  {
    code: 'let test4 = -8; test4 >>>= 2; return test4',
    evalExpect: 1073741822,
    safeExpect: 1073741822,
    category: 'Bitwise Operators',
  },
  {
    code: 'let test5 = 16; test5 >>>= 1; return test5',
    evalExpect: 8,
    safeExpect: 8,
    category: 'Bitwise Operators',
  },
  {
    code: 'let test6 = -1; test6 >>>= 0; return test6',
    evalExpect: 4294967295,
    safeExpect: 4294967295,
    category: 'Bitwise Operators',
  },
  {
    code: 'test2 ^= 1',
    evalExpect: 0,
    safeExpect: 0,
    category: 'Bitwise Operators',
  },
  {
    code: 'test2 &= 3',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Bitwise Operators',
  },
  {
    code: 'test2 |= 2',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Bitwise Operators',
  },
  {
    code: 'test2 & 1',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Bitwise Operators',
  },
  {
    code: 'test2 | 4',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Bitwise Operators',
  },
  {
    code: '8 >> 1 >> 1',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Bitwise Operators',
  },
  {
    code: '1 << 2 << 1',
    evalExpect: 8,
    safeExpect: 8,
    category: 'Bitwise Operators',
  },
  {
    code: '16 >>> 2 >> 1',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Bitwise Operators',
  },
  {
    code: '1 << 1 << 1',
    evalExpect: 4,
    safeExpect: 4,
    category: 'Bitwise Operators',
  },
  {
    code: '16 >> 1 >> 1',
    evalExpect: 4,
    safeExpect: 4,
    category: 'Bitwise Operators',
  },
  {
    code: '5 & 7 & 3',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Bitwise Operators',
  },
  {
    code: '1 | 2 | 4',
    evalExpect: 7,
    safeExpect: 7,
    category: 'Bitwise Operators',
  },
  {
    code: '15 ^ 10 ^ 5',
    evalExpect: 0,
    safeExpect: 0,
    category: 'Bitwise Operators',
  },
  {
    code: '~5',
    evalExpect: -6,
    safeExpect: -6,
    category: 'Bitwise Operators',
  },
];
