'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  // Basic single default
  {
    code: 'function fn(a = 1) { return a }; return fn()',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Defaults',
  },
  {
    code: 'function fn(a = 1) { return a }; return fn(5)',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Defaults',
  },
  // Multiple defaults
  {
    code: 'function fn(a = 1, b = 2) { return a + b }; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  {
    code: 'function fn(a = 1, b = 2) { return a + b }; return fn(10)',
    evalExpect: 12,
    safeExpect: 12,
    category: 'Defaults',
  },
  {
    code: 'function fn(a = 1, b = 2) { return a + b }; return fn(10, 20)',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Defaults',
  },
  // Mixed required and default
  {
    code: 'function fn(a, b = 2) { return a + b }; return fn(10)',
    evalExpect: 12,
    safeExpect: 12,
    category: 'Defaults',
  },
  {
    code: 'function fn(a, b = 2) { return a + b }; return fn(10, 20)',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Defaults',
  },
  // Default with expression
  {
    code: 'function fn(a = 1 + 2) { return a }; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  // Default referencing earlier param
  {
    code: 'function fn(a = 1, b = a + 1) { return b }; return fn()',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Defaults',
  },
  // Arrow function with defaults
  {
    code: 'const fn = (a = 10) => a; return fn()',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Defaults',
  },
  {
    code: 'const fn = (a = 10) => a; return fn(5)',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Defaults',
  },
  {
    code: 'const fn = (a = 1, b = 2) => a + b; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  // Default with null (only undefined triggers default)
  {
    code: 'function fn(a = 99) { return a }; return fn(null)',
    evalExpect: null,
    safeExpect: null,
    category: 'Defaults',
  },
  // Default with rest params
  {
    code: 'function fn(a = 1, ...rest) { return a + rest.length }; return fn()',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Defaults',
  },
  {
    code: 'function fn(a = 1, ...rest) { return a + rest.length }; return fn(10, 20, 30)',
    evalExpect: 12,
    safeExpect: 12,
    category: 'Defaults',
  },
  // Default with string value
  {
    code: 'function fn(name = "world") { return "hello " + name }; return fn()',
    evalExpect: 'hello world',
    safeExpect: 'hello world',
    category: 'Defaults',
  },
  {
    code: 'function fn(name = "world") { return "hello " + name }; return fn("there")',
    evalExpect: 'hello there',
    safeExpect: 'hello there',
    category: 'Defaults',
  },
  // Default is a function call
  {
    code: 'function make() { return 42 }; function fn(a = make()) { return a }; return fn()',
    evalExpect: 42,
    safeExpect: 42,
    category: 'Defaults',
  },
  // Default is only evaluated when needed
  {
    code: 'let calls = 0; function make() { calls++; return 1 }; function fn(a = make()) { return a }; fn(99); return calls',
    evalExpect: 0,
    safeExpect: 0,
    category: 'Defaults',
  },
  // Default evaluated each call
  {
    code: 'let n = 0; function next() { return ++n }; function fn(a = next()) { return a }; fn(); fn(); return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  // Default references earlier param (already tested b = a+1, now more complex)
  {
    code: 'function fn(a = 2, b = a * 3, c = a + b) { return c }; return fn()',
    evalExpect: 8,
    safeExpect: 8,
    category: 'Defaults',
  },
  // Default with destructuring param
  {
    code: 'function fn({a = 1, b = 2} = {}) { return a + b }; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  {
    code: 'function fn({a = 1, b = 2} = {}) { return a + b }; return fn({a: 10})',
    evalExpect: 12,
    safeExpect: 12,
    category: 'Defaults',
  },
  {
    code: 'function fn([a = 10, b = 20] = []) { return a + b }; return fn()',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Defaults',
  },
  {
    code: 'function fn([a = 10, b = 20] = []) { return a + b }; return fn([1])',
    evalExpect: 21,
    safeExpect: 21,
    category: 'Defaults',
  },
  // Default in method
  {
    code: 'const obj = { fn(a = 7) { return a } }; return obj.fn()',
    evalExpect: 7,
    safeExpect: 7,
    category: 'Defaults',
  },
  // Default in recursive function
  {
    code: 'function sum(n, acc = 0) { if (n <= 0) return acc; return sum(n - 1, acc + n) }; return sum(5)',
    evalExpect: 15,
    safeExpect: 15,
    category: 'Defaults',
  },
  // Passing undefined explicitly triggers default
  {
    code: 'function fn(a = 5, b = 6) { return a + b }; return fn(undefined, 10)',
    evalExpect: 15,
    safeExpect: 15,
    category: 'Defaults',
  },
  // Default with array literal
  {
    code: 'function fn(a = [1, 2, 3]) { return a.length }; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  // Default with object literal
  {
    code: 'function fn(opts = { x: 10, y: 20 }) { return opts.x + opts.y }; return fn()',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Defaults',
  },
  // Async function with defaults
  {
    code: 'async function fn(a = 1, b = 2) { return a + b }; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  // Arrow with destructuring default
  {
    code: 'const fn = ({x = 1, y = 2} = {}) => x + y; return fn()',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Defaults',
  },
  {
    code: 'const fn = ({x = 1, y = 2} = {}) => x + y; return fn({x: 5})',
    evalExpect: 7,
    safeExpect: 7,
    category: 'Defaults',
  },
];
