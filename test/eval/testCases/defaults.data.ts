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
];
