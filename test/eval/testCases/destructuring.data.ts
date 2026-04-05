'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  // Array destructuring - basic
  {
    code: 'const [a, b] = [1, 2]; return a',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Destructuring',
  },
  {
    code: 'const [a, b] = [1, 2]; return b',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Destructuring',
  },
  {
    code: 'const [a, b, c] = [1, 2, 3]; return a + b + c',
    evalExpect: 6,
    safeExpect: 6,
    category: 'Destructuring',
  },
  // Array destructuring - skipping elements
  {
    code: 'const [, b] = [1, 2]; return b',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Destructuring',
  },
  {
    code: 'const [a, , c] = [1, 2, 3]; return a + c',
    evalExpect: 4,
    safeExpect: 4,
    category: 'Destructuring',
  },
  // Array destructuring - defaults
  {
    code: 'const [a = 10] = []; return a',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Destructuring',
  },
  {
    code: 'const [a = 10] = [5]; return a',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Destructuring',
  },
  {
    code: 'const [a = 1, b = 2] = [10]; return a + b',
    evalExpect: 12,
    safeExpect: 12,
    category: 'Destructuring',
  },
  // Array destructuring - rest
  {
    code: 'const [a, ...rest] = [1, 2, 3]; return rest',
    evalExpect: [2, 3],
    safeExpect: [2, 3],
    category: 'Destructuring',
  },
  {
    code: 'const [a, b, ...rest] = [1, 2, 3, 4, 5]; return rest.length',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  {
    code: 'const [...all] = [1, 2, 3]; return all',
    evalExpect: [1, 2, 3],
    safeExpect: [1, 2, 3],
    category: 'Destructuring',
  },
  {
    code: 'const res = []; const a = [1,2,3]; for (let i = 0; i < a.length; i++) { const [...[a]] = a; res.push(a); } return res',
    evalExpect: [1, 1, 1],
    safeExpect: [1, 1, 1],
    category: 'Destructuring',
  },
  // Object destructuring - basic
  {
    code: 'const {a} = {a: 1}; return a',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Destructuring',
  },
  {
    code: 'const {a, b} = {a: 1, b: 2}; return a + b',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  // Object destructuring - renaming (custom variable names)
  {
    code: 'const {a: myA} = {a: 1}; return myA',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Destructuring',
  },
  {
    code: 'const {a: x, b: y} = {a: 10, b: 20}; return x + y',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Destructuring',
  },
  {
    code: 'const {firstName: first, lastName: last} = {firstName: "John", lastName: "Doe"}; return first + " " + last',
    evalExpect: 'John Doe',
    safeExpect: 'John Doe',
    category: 'Destructuring',
  },
  // Object destructuring - defaults
  {
    code: 'const {a = 5} = {}; return a',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Destructuring',
  },
  {
    code: 'const {a = 5} = {a: 10}; return a',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Destructuring',
  },
  {
    code: 'const {a = 1, b = 2} = {a: 10}; return a + b',
    evalExpect: 12,
    safeExpect: 12,
    category: 'Destructuring',
  },
  // Object destructuring - rename with default
  {
    code: 'const {a: x = 99} = {}; return x',
    evalExpect: 99,
    safeExpect: 99,
    category: 'Destructuring',
  },
  {
    code: 'const {a: x = 99} = {a: 1}; return x',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Destructuring',
  },
  // Object destructuring - rest
  {
    code: 'const {a, ...rest} = {a: 1, b: 2, c: 3}; return rest.b + rest.c',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Destructuring',
  },
  {
    code: 'const {a, b, ...rest} = {a: 1, b: 2, c: 3, d: 4}; return Object.keys(rest).length',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Destructuring',
  },
  {
    code: 'const {...all} = {a: 1, b: 2}; return all.a + all.b',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  // Nested destructuring - arrays
  {
    code: 'const [a, [b, c]] = [1, [2, 3]]; return a + b + c',
    evalExpect: 6,
    safeExpect: 6,
    category: 'Destructuring',
  },
  {
    code: 'const [[a]] = [[1]]; return a',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Destructuring',
  },
  // Nested destructuring - objects
  {
    code: 'const {a: {b}} = {a: {b: 42}}; return b',
    evalExpect: 42,
    safeExpect: 42,
    category: 'Destructuring',
  },
  {
    code: 'const {a: {b, c}} = {a: {b: 1, c: 2}}; return b + c',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  // Mixed nested
  {
    code: 'const {a: [x, y]} = {a: [1, 2]}; return x + y',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  {
    code: 'const [a, {b, c}] = [1, {b: 2, c: 3}]; return a + b + c',
    evalExpect: 6,
    safeExpect: 6,
    category: 'Destructuring',
  },
  // Nested with defaults
  {
    code: 'const {a: {b = 10} = {}} = {}; return b',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Destructuring',
  },
  {
    code: 'const [a = 1, [b = 2] = []] = []; return a + b',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  // var and let
  {
    code: 'var [p, q] = [1, 2]; return p + q',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  {
    code: 'let {x, y} = {x: 10, y: 20}; return x + y',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Destructuring',
  },
  // Computed property names
  {
    code: 'const key = "a"; const {[key]: val} = {a: 42}; return val',
    evalExpect: 42,
    safeExpect: 42,
    category: 'Destructuring',
  },
  // Destructuring in function parameters - array
  {
    code: 'function fn([a, b]) { return a + b }; return fn([1, 2])',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  {
    code: 'const fn = ([a, b]) => a + b; return fn([10, 20])',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Destructuring',
  },
  // Destructuring in function parameters - object
  {
    code: 'function fn({a, b}) { return a + b }; return fn({a: 1, b: 2})',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  {
    code: 'const fn = ({a, b}) => a + b; return fn({a: 5, b: 6})',
    evalExpect: 11,
    safeExpect: 11,
    category: 'Destructuring',
  },
  // Destructuring in function parameters - with rename
  {
    code: 'function fn({a: x, b: y}) { return x + y }; return fn({a: 3, b: 4})',
    evalExpect: 7,
    safeExpect: 7,
    category: 'Destructuring',
  },
  // Destructuring in function parameters - with defaults
  {
    code: 'function fn({a = 10, b = 20} = {}) { return a + b }; return fn({})',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Destructuring',
  },
  {
    code: 'function fn({a = 10, b = 20} = {}) { return a + b }; return fn({a: 1})',
    evalExpect: 21,
    safeExpect: 21,
    category: 'Destructuring',
  },
  // Destructuring in function parameters - mixed
  {
    code: 'function fn({a}, [b, c]) { return a + b + c }; return fn({a: 1}, [2, 3])',
    evalExpect: 6,
    safeExpect: 6,
    category: 'Destructuring',
  },
  // Destructuring in function parameters - rest
  {
    code: 'function fn([first, ...rest]) { return rest.length }; return fn([1, 2, 3, 4])',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
  // RHS evaluated once
  {
    code: 'let count = 0; function makeArr() { count++; return [1, 2]; } const [a, b] = makeArr(); return count',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Destructuring',
  },
  // In loops
  {
    code: 'let sum = 0; for (const [a, b] of [[1, 2], [3, 4]]) { sum += a + b; } return sum',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Destructuring',
  },
  // Shorthand properties with destructuring
  {
    code: 'const obj = {x: 1, y: 2}; const {x, y} = obj; return x + y',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Destructuring',
  },
];
