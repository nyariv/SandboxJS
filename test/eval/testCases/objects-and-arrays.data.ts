'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "a.b.c",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Objects & Arrays"
  },
  {
    "code": "[test2, 2]",
    "evalExpect": [
      1,
      2
    ],
    "safeExpect": [
      1,
      2
    ],
    "category": "Objects & Arrays"
  },
  {
    "code": "{\"aa\": test[0](), b: test2 * 3}",
    "evalExpect": {
      "aa": 1,
      "b": 3
    },
    "safeExpect": {
      "aa": 1,
      "b": 3
    },
    "category": "Objects & Arrays"
  },
  {
    "code": "{\"\\\\\":\"\\\\\"}",
    "evalExpect": {
      "\\": "\\"
    },
    "safeExpect": {
      "\\": "\\"
    },
    "category": "Objects & Arrays"
  },
  {
    "code": "Object.keys({a:1})",
    "evalExpect": [
      "a"
    ],
    "safeExpect": [
      "a"
    ],
    "category": "Objects & Arrays"
  },
  {
    "code": "[1, ...[2, [test2, 4]], 5]",
    "evalExpect": [
      1,
      2,
      [
        1,
        4
      ],
      5
    ],
    "safeExpect": [
      1,
      2,
      [
        1,
        4
      ],
      5
    ],
    "category": "Objects & Arrays"
  },
  {
    "code": "const obj1 = {a: 1, b: 2}; const obj2 = {c: 3, ...obj1}; return obj2.a",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Objects & Arrays"
  },
  {
    "code": "const obj1 = {a: 1, b: 2}; const obj2 = {...obj1, b: 5}; return obj2.b",
    "evalExpect": 5,
    "safeExpect": 5,
    "category": "Objects & Arrays"
  },
  {
    "code": "const obj1 = {x: 10}; const obj2 = {y: 20}; const obj3 = {...obj1, ...obj2}; return obj3.x + obj3.y",
    "evalExpect": 30,
    "safeExpect": 30,
    "category": "Objects & Arrays"
  },
  {
    "code": "const arr1 = [1, 2, 3]; const arr2 = [...arr1, 4, 5]; return arr2.length",
    "evalExpect": 5,
    "safeExpect": 5,
    "category": "Objects & Arrays"
  },
  {
    "code": "const arr1 = [1, 2]; const arr2 = [3, 4]; return [...arr1, ...arr2]",
    "evalExpect": [
      1,
      2,
      3,
      4
    ],
    "safeExpect": [
      1,
      2,
      3,
      4
    ],
    "category": "Objects & Arrays"
  },
  {
    "code": "const a = [1]; const b = [2]; const c = [3]; return [...a, ...b, ...c]",
    "evalExpect": [
      1,
      2,
      3
    ],
    "safeExpect": [
      1,
      2,
      3
    ],
    "category": "Objects & Arrays"
  }
];
