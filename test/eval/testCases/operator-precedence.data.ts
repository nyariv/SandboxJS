'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "test2 !== '1' && false",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Operator Precedence"
  },
  {
    "code": "true && true || false",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "true || true && false",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "1 && 2 == 1",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Operator Precedence"
  },
  {
    "code": "1 + 2 === 1 + 2 === 1 && 2",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Operator Precedence"
  },
  {
    "code": "true === 1 && 2",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Operator Precedence"
  },
  {
    "code": "-1 < 1 && 2 > 1",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "!5 > 3",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Operator Precedence"
  },
  {
    "code": "!5 < 3",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "!0 === true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "!false && true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "!true || true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "!false && false || true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "5 > 3 > 1",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Operator Precedence"
  },
  {
    "code": "1 < 2 < 3",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "5 > 3 === true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Operator Precedence"
  },
  {
    "code": "1 | 2 && 3",
    "evalExpect": 3,
    "safeExpect": 3,
    "category": "Operator Precedence"
  },
  {
    "code": "true && 1 | 2",
    "evalExpect": 3,
    "safeExpect": 3,
    "category": "Operator Precedence"
  },
  {
    "code": "4 & 5 || 0",
    "evalExpect": 4,
    "safeExpect": 4,
    "category": "Operator Precedence"
  },
  {
    "code": "2 + 3 << 1",
    "evalExpect": 10,
    "safeExpect": 10,
    "category": "Operator Precedence"
  },
  {
    "code": "8 >> 1 + 1",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Operator Precedence"
  },
  {
    "code": "1 << 2 * 2",
    "evalExpect": 16,
    "safeExpect": 16,
    "category": "Operator Precedence"
  },
  {
    "code": "5 & 3 | 2",
    "evalExpect": 3,
    "safeExpect": 3,
    "category": "Operator Precedence"
  },
  {
    "code": "8 | 4 & 2",
    "evalExpect": 8,
    "safeExpect": 8,
    "category": "Operator Precedence"
  },
  {
    "code": "15 ^ 3 & 7",
    "evalExpect": 12,
    "safeExpect": 12,
    "category": "Operator Precedence"
  }
];
