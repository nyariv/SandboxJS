'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "const a = 1; const b = 2; return `${a} + ${b} = ${a+b}`",
    "evalExpect": "1 + 2 = 3",
    "safeExpect": "1 + 2 = 3",
    "category": "Template Literals"
  },
  {
    "code": "const name = 'world'; return `hello ${name}`",
    "evalExpect": "hello world",
    "safeExpect": "hello world",
    "category": "Template Literals"
  }
];
