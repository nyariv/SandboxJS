'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: '((a) => {return a + 1})(1)',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Functions',
  },
  {
    code: "(() => '1' + (() => '22')())()",
    evalExpect: '122',
    safeExpect: '122',
    category: 'Functions',
  },
  {
    code: '(a => a + 1)(1)',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Functions',
  },
  {
    code: 'function f(a) { return a + 1 } return f(2);',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Functions',
  },
  {
    code: '(function () { return 1 })()',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Functions',
  },
  {
    code: 'let list = [0, 1]; return list.sort((a, b) => (a < b) ? 1 : -1)',
    evalExpect: [1, 0],
    safeExpect: [1, 0],
    category: 'Functions',
  },
  {
    code: 'let y = {a: 1, b(x) {return this.a + x}}; return y.b(2)',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Functions',
  },
  {
    code: "let y = {a: '2', b() {return this.a = '1'}}; y.b(); return y.a",
    evalExpect: '1',
    safeExpect: '1',
    category: 'Functions',
  },
  {
    code: '[0,1].filter((...args) => args[1])',
    evalExpect: [1],
    safeExpect: [1],
    category: 'Functions',
  },
  {
    code: 'Math.pow(...[2, 2])',
    evalExpect: 4,
    safeExpect: 4,
    category: 'Functions',
  },
  {
    code: 'return f(); function f() { return 1; }',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Functions',
  },
  {
    code: 'return add(2, 3); function add(a, b) { return a + b; }',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Functions',
  },
  {
    code: 'let x = f(); function f() { return 42; } return x;',
    evalExpect: 42,
    safeExpect: 42,
    category: 'Functions',
  },
];
