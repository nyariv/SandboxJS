'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "let a = 1; let b = 2; switch(1) {case a: b = 1; case b: return b; default: return 0;}",
    "evalExpect": 1,
    "safeExpect": 1,
    "category": "Switch"
  },
  {
    "code": "let b = 1; switch(1) {case 1: b = 2; break; case 2: b = 3; default: b = 4}; return b",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Switch"
  },
  {
    "code": "let b = 1; switch(3) {case 1: b = 2; break; case 2: b = 3; default: b = 4}; return b",
    "evalExpect": 4,
    "safeExpect": 4,
    "category": "Switch"
  },
  {
    "code": "let b = 1; switch(1) {case 1:b = 2; case 2: b = 3; default: b = 4}; return b",
    "evalExpect": 4,
    "safeExpect": 4,
    "category": "Switch"
  },
  {
    "code": "let a = 1; switch(a) {case 1: return 2}; return 1",
    "evalExpect": 2,
    "safeExpect": 2,
    "category": "Switch"
  }
];
