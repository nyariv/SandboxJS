'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: "test2 == '1'",
    evalExpect: true,
    safeExpect: true,
    category: 'Comparison Operators',
  },
  {
    code: "test2 === '1'",
    evalExpect: false,
    safeExpect: false,
    category: 'Comparison Operators',
  },
  {
    code: "test2 != '1'",
    evalExpect: false,
    safeExpect: false,
    category: 'Comparison Operators',
  },
  {
    code: "test2 !== '1'",
    evalExpect: true,
    safeExpect: true,
    category: 'Comparison Operators',
  },
  {
    code: 'test2 < 1',
    evalExpect: false,
    safeExpect: false,
    category: 'Comparison Operators',
  },
  {
    code: 'test2 > 1',
    evalExpect: false,
    safeExpect: false,
    category: 'Comparison Operators',
  },
  {
    code: 'test2 >= 1',
    evalExpect: true,
    safeExpect: true,
    category: 'Comparison Operators',
  },
  {
    code: 'test2 <= 1',
    evalExpect: true,
    safeExpect: true,
    category: 'Comparison Operators',
  },
];
