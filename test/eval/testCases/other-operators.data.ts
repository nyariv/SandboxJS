'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "typeof '1'",
    "evalExpect": "string",
    "safeExpect": "string",
    "category": "Other Operators"
  },
  {
    "code": "typeof x === 'undefined'",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Other Operators"
  },
  {
    "code": "{} instanceof Object",
    "evalExpect": "error",
    "safeExpect": true,
    "category": "Other Operators"
  },
  {
    "code": "{} instanceof undefined",
    "evalExpect": "error",
    "safeExpect": "error",
    "category": "Other Operators"
  },
  {
    "code": "'a' in {a: 1}",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Other Operators"
  },
  {
    "code": "1,2",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Other Operators"
  },
  {
    "code": "void 2 == '2'",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Other Operators"
  },
  {
    "code": "void (2 == '2')",
    "category": "Other Operators"
  },
  {
    "code": "new Date(0).toISOString()",
    "evalExpect": "1970-01-01T00:00:00.000Z",
    "safeExpect": "1970-01-01T00:00:00.000Z",
    "category": "Other Operators"
  },
  {
    "code": "typeof 5 + \"2\"",
    "evalExpect": "number2",
    "safeExpect": "number2",
    "category": "Other Operators"
  },
  {
    "code": "typeof (5 + 2)",
    "evalExpect": "number",
    "safeExpect": "number",
    "category": "Other Operators"
  },
  {
    "code": "typeof 5 === \"number\"",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Other Operators"
  },
  {
    "code": "void 0 === undefined",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Other Operators"
  },
  {
    "code": "void 5 + 10",
    "evalExpect": "NaN",
    "safeExpect": "NaN",
    "category": "Other Operators"
  },
  {
    "code": "typeof void 0",
    "evalExpect": "undefined",
    "safeExpect": "undefined",
    "category": "Other Operators"
  },
  {
    "code": "null?.[0]",
    "category": "Other Operators"
  },
  {
    "code": "null?.fn?.()",
    "category": "Other Operators"
  }
];
