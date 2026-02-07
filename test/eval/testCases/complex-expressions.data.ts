'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: 'let a = null; let b = [a?.a]; return b[0] === undefined && b.length',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Complex Expressions',
  },
  {
    code: '{a: 1, ...{b: 2, c: {d: test2,}}, e: 5}',
    evalExpect: {
      a: 1,
      b: 2,
      c: {
        d: 1,
      },
      e: 5,
    },
    safeExpect: {
      a: 1,
      b: 2,
      c: {
        d: 1,
      },
      e: 5,
    },
    category: 'Complex Expressions',
  },
  {
    code: '{a: 1,b: 2, /*,*/}',
    evalExpect: {
      a: 1,
      b: 2,
    },
    safeExpect: {
      a: 1,
      b: 2,
    },
    category: 'Complex Expressions',
  },
  {
    code: 'test2 = 1,(() => 2)(),test2',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Complex Expressions',
  },
  {
    code: 'const a = () => {return 1}; const b = () => {return 2}; return (() => a() + b())()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Complex Expressions',
  },
  {
    code: '({}).a?.toString()',
    category: 'Complex Expressions',
  },
  {
    code: '({}).a?.toSring() + ({}).b?.toString()',
    evalExpect: 'NaN',
    safeExpect: 'NaN',
    category: 'Complex Expressions',
  },
  {
    code: "({})['b']?.toString() === undefined",
    evalExpect: true,
    safeExpect: true,
    category: 'Complex Expressions',
  },
  {
    code: '({}).c?.()() ? 1 : 2',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Complex Expressions',
  },
  {
    code: 'function plus(n,u){return n+u};function minus(n,u){return n-u};var added=plus(1,10);return minus(added,5);',
    evalExpect: 6,
    safeExpect: 6,
    category: 'Complex Expressions',
  },
  {
    code: 'function LinkedListNode(e){this.value=e,this.next=null}function reverse(e){let n,t,r=e;for(;r;)t=r.next,r.next=n,n=r,r=t;return n}function reverse(e){if(!e||!e.next)return e;let n=reverse(e.next);return e.next.next=e,e.next=null,n} let l1 = new LinkedListNode(1); l1.next = new LinkedListNode(2); return reverse(l1);',
    evalExpect: {
      value: 2,
      next: {
        value: 1,
        next: null,
      },
    },
    safeExpect: {
      value: 2,
      next: {
        value: 1,
        next: null,
      },
    },
    category: 'Complex Expressions',
  },
  {
    code: 'const f = function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }; return f(5)',
    evalExpect: 120,
    safeExpect: 120,
    category: 'Complex Expressions',
  },
  {
    code: '({a: 10}).a?.toString() + 5',
    evalExpect: '105',
    safeExpect: '105',
    category: 'Complex Expressions',
  },
  {
    code: 'let arr = [1, 2, 3]; return arr?.[1]',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Complex Expressions',
  },
  {
    code: 'let obj = {fn: () => 42}; return obj?.fn?.()',
    evalExpect: 42,
    safeExpect: 42,
    category: 'Complex Expressions',
  },
];
