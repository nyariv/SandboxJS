'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "1+1",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Arithmetic Operators"
  },
  {
    "code": "1 * 2 + 3 * (4 + 5) * 6",
    "evalExpect": 164,
    "safeExpect": 164,
    "category": "Arithmetic Operators"
  },
  {
    "code": "(test2 * (2 + 3 * (4 + 5))) * 6",
    "evalExpect": 174,
    "safeExpect": 174,
    "category": "Arithmetic Operators"
  },
  {
    "code": "1+2*4/5-6+7/8 % 9+10-11-12/13*14",
    "evalExpect": -16.448076923076925,
    "safeExpect": -16.448076923076925,
    "category": "Arithmetic Operators"
  },
  {
    "code": "test2 **= 0",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Arithmetic Operators"
  },
  {
    "code": "2 ** 3",
    "evalExpect": 8,
    "safeExpect": 8,
    "category": "Arithmetic Operators"
  },
  {
    "code": "10 ** 0",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Arithmetic Operators"
  },
  {
    "code": "2 ** 10",
    "evalExpect": 1024,
    "safeExpect": 1024,
    "category": "Arithmetic Operators"
  },
  {
    "code": "3 ** 2 ** 2",
    "evalExpect": 81,
    "safeExpect": 81,
    "category": "Arithmetic Operators"
  },
  {
    "code": "test2 %= 1",
    "evalExpect": 0,
    "safeExpect": 0,
    "category": "Arithmetic Operators"
  },
  {
    "code": "+'1'",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Arithmetic Operators"
  },
  {
    "code": "-'1'",
    "evalExpect": -1,
    "safeExpect": -1,
    "category": "Arithmetic Operators"
  },
  {
    "code": "var i = 1; return i + 1",
    "evalExpect": "error",
    "safeExpect": 2,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let j = 1; return j + 1",
    "evalExpect": "error",
    "safeExpect": 2,
    "category": "Arithmetic Operators"
  },
  {
    "code": "const k = 1; return k + 1",
    "evalExpect": "error",
    "safeExpect": 2,
    "category": "Arithmetic Operators"
  },
  {
    "code": "null?.a + 5",
    "evalExpect": "NaN",
    "safeExpect": "NaN",
    "category": "Arithmetic Operators"
  },
  {
    "code": "({}).a ?? 10 + 5",
    "evalExpect": 15,
    "safeExpect": 15,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let x = 5; return x++ + 2",
    "evalExpect": 7,
    "safeExpect": 7,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let y = 5; return ++y + 2",
    "evalExpect": 8,
    "safeExpect": 8,
    "category": "Arithmetic Operators"
  },
  {
    "code": "+-5",
    "evalExpect": -5,
    "safeExpect": -5,
    "category": "Arithmetic Operators"
  },
  {
    "code": "~-1",
    "evalExpect": 0,
    "safeExpect": 0,
    "category": "Arithmetic Operators"
  },
  {
    "code": "(1, 2) + (3, 4)",
    "evalExpect": 6,
    "safeExpect": 6,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let z = 5; return --z * 2",
    "evalExpect": 8,
    "safeExpect": 8,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let z = 5; return z-- * 2",
    "evalExpect": 10,
    "safeExpect": 10,
    "category": "Arithmetic Operators"
  },
  {
    "code": "1 + 2 + 3 + 4",
    "evalExpect": 10,
    "safeExpect": 10,
    "category": "Arithmetic Operators"
  },
  {
    "code": "10 - 5 - 2",
    "evalExpect": 3,
    "safeExpect": 3,
    "category": "Arithmetic Operators"
  },
  {
    "code": "2 * 3 * 4",
    "evalExpect": 24,
    "safeExpect": 24,
    "category": "Arithmetic Operators"
  },
  {
    "code": "100 / 5 / 2",
    "evalExpect": 10,
    "safeExpect": 10,
    "category": "Arithmetic Operators"
  },
  {
    "code": "17 % 5 % 2",
    "evalExpect": 0,
    "safeExpect": 0,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let a = 1, b = 2, c = 3; return a + b + c",
    "evalExpect": 6,
    "safeExpect": 6,
    "category": "Arithmetic Operators"
  },
  {
    "code": "const a = 1, b = 2; return a * b",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Arithmetic Operators"
  },
  {
    "code": "(false ? 1 : 2) + (true ? 3 : 4)",
    "evalExpect": 5,
    "safeExpect": 5,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let x = 5; x++; return x",
    "evalExpect": 6,
    "safeExpect": 6,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let x = 5; return ++x",
    "evalExpect": 6,
    "safeExpect": 6,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let x = 5; x--; return x",
    "evalExpect": 4,
    "safeExpect": 4,
    "category": "Arithmetic Operators"
  },
  {
    "code": "let x = 5; return --x",
    "evalExpect": 4,
    "safeExpect": 4,
    "category": "Arithmetic Operators"
  }
];
