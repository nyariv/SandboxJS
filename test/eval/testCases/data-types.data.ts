'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "`${type}`",
    "evalExpect": "eval",
    "safeExpect": "Sandbox",
    "category": "Data Types"
  },
  {
    "code": "test2",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Data Types"
  },
  {
    "code": "2.2204460492503130808472633361816E-16",
    "evalExpect": 2.220446049250313e-16,
    "safeExpect": 2.220446049250313e-16,
    "category": "Data Types"
  },
  {
    "code": "\"test2\"",
    "evalExpect": "test2",
    "safeExpect": "test2",
    "category": "Data Types"
  },
  {
    "code": "`test2 is ${`also ${test2}`}`",
    "evalExpect": "test2 is also 1",
    "safeExpect": "test2 is also 1",
    "category": "Data Types"
  },
  {
    "code": "\"\\\\\"",
    "evalExpect": "\\",
    "safeExpect": "\\",
    "category": "Data Types"
  },
  {
    "code": "`\\\\$$\\${${`\\\\\\`${'ok'}`}\\\\}`",
    "evalExpect": "\\$$${\\`ok\\}",
    "safeExpect": "\\$$${\\`ok\\}",
    "category": "Data Types"
  },
  {
    "code": "[\"\\\\\", \"\\xd9\", \"\\n\", \"\\r\", \"\\u2028\", \"\\u2029\"]",
    "evalExpect": [
      "\\",
      "\u00d9",
      "\n",
      "\r",
      "\u2028",
      "\u2029"
    ],
    "safeExpect": [
      "\\",
      "\u00d9",
      "\n",
      "\r",
      "\u2028",
      "\u2029"
    ],
    "category": "Data Types"
  },
  {
    "code": "/a/.test('a')",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "/a/i.test('A')",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "let reg = /a/g; reg.exec('aaa'); return reg.exec('aaa').index",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Data Types"
  },
  {
    "code": "(1n + 0x1n).toString()",
    "evalExpect": "2",
    "safeExpect": "2",
    "category": "Data Types"
  },
  {
    "code": "0b1010",
    "evalExpect": 10,
    "safeExpect": 10,
    "category": "Data Types"
  },
  {
    "code": "0B1111",
    "evalExpect": 15,
    "safeExpect": 15,
    "category": "Data Types"
  },
  {
    "code": "0b1010n.toString()",
    "evalExpect": "10",
    "safeExpect": "10",
    "category": "Data Types"
  },
  {
    "code": "0b1_000",
    "evalExpect": 8,
    "safeExpect": 8,
    "category": "Data Types"
  },
  {
    "code": "1_000",
    "evalExpect": 1000,
    "safeExpect": 1000,
    "category": "Data Types"
  },
  {
    "code": "0b0",
    "evalExpect": 0,
    "safeExpect": 0,
    "category": "Data Types"
  },
  {
    "code": "0o17",
    "evalExpect": 15,
    "safeExpect": 15,
    "category": "Data Types"
  },
  {
    "code": "0O77",
    "evalExpect": 63,
    "safeExpect": 63,
    "category": "Data Types"
  },
  {
    "code": "0o17n.toString()",
    "evalExpect": "15",
    "safeExpect": "15",
    "category": "Data Types"
  },
  {
    "code": "0o7_777",
    "evalExpect": 4095,
    "safeExpect": 4095,
    "category": "Data Types"
  },
  {
    "code": "0o0",
    "evalExpect": 0,
    "safeExpect": 0,
    "category": "Data Types"
  },
  {
    "code": "0b1010 + 0o17",
    "evalExpect": 25,
    "safeExpect": 25,
    "category": "Data Types"
  },
  {
    "code": "(0b1010n + 0o17n).toString()",
    "evalExpect": "25",
    "safeExpect": "25",
    "category": "Data Types"
  },
  {
    "code": "String(BigInt('12345'))",
    "evalExpect": "12345",
    "safeExpect": "12345",
    "category": "Data Types"
  },
  {
    "code": "(123_456_789n).toString()",
    "evalExpect": "123456789",
    "safeExpect": "123456789",
    "category": "Data Types"
  },
  {
    "code": "/test/gi.test('test')",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "/[a-z]+/i.test('Hello')",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "NaN",
    "evalExpect": "NaN",
    "safeExpect": "NaN",
    "category": "Data Types"
  },
  {
    "code": "typeof Infinity === 'number'",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "typeof undefined === 'undefined'",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "null",
    "evalExpect": null,
    "safeExpect": null,
    "category": "Data Types"
  },
  {
    "code": "true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  },
  {
    "code": "false",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Data Types"
  },
  {
    "code": "undefined === undefined",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Data Types"
  }
];
