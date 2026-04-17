'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: 'a.b.c',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Objects & Arrays',
  },
  {
    code: '[test2, 2]',
    evalExpect: [1, 2],
    safeExpect: [1, 2],
    category: 'Objects & Arrays',
  },
  {
    code: '{"aa": test[0](), b: test2 * 3}',
    evalExpect: {
      aa: 1,
      b: 3,
    },
    safeExpect: {
      aa: 1,
      b: 3,
    },
    category: 'Objects & Arrays',
  },
  {
    code: '{"\\\\":"\\\\"}',
    evalExpect: {
      '\\': '\\',
    },
    safeExpect: {
      '\\': '\\',
    },
    category: 'Objects & Arrays',
  },
  {
    code: 'Object.keys({a:1})',
    evalExpect: ['a'],
    safeExpect: ['a'],
    category: 'Objects & Arrays',
  },
  {
    code: '[1, ...[2, [test2, 4]], 5]',
    evalExpect: [1, 2, [1, 4], 5],
    safeExpect: [1, 2, [1, 4], 5],
    category: 'Objects & Arrays',
  },
  {
    code: 'const obj1 = {a: 1, b: 2}; const obj2 = {c: 3, ...obj1}; return obj2.a',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Objects & Arrays',
  },
  {
    code: 'const obj1 = {a: 1, b: 2}; const obj2 = {...obj1, b: 5}; return obj2.b',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Objects & Arrays',
  },
  {
    code: 'const obj1 = {x: 10}; const obj2 = {y: 20}; const obj3 = {...obj1, ...obj2}; return obj3.x + obj3.y',
    evalExpect: 30,
    safeExpect: 30,
    category: 'Objects & Arrays',
  },
  {
    code: 'const arr1 = [1, 2, 3]; const arr2 = [...arr1, 4, 5]; return arr2.length',
    evalExpect: 5,
    safeExpect: 5,
    category: 'Objects & Arrays',
  },
  {
    code: 'const arr1 = [1, 2]; const arr2 = [3, 4]; return [...arr1, ...arr2]',
    evalExpect: [1, 2, 3, 4],
    safeExpect: [1, 2, 3, 4],
    category: 'Objects & Arrays',
  },
  {
    code: 'const a = [1]; const b = [2]; const c = [3]; return [...a, ...b, ...c]',
    evalExpect: [1, 2, 3],
    safeExpect: [1, 2, 3],
    category: 'Objects & Arrays',
  },
  {
    code: 'const data = []; return {data}',
    evalExpect: { data: [] },
    safeExpect: { data: [] },
    category: 'Objects & Arrays',
  },
  {
    code: 'const x = 1; const y = 2; return {x, y}',
    evalExpect: { x: 1, y: 2 },
    safeExpect: { x: 1, y: 2 },
    category: 'Objects & Arrays',
  },
  {
    code: 'const name = "Alice"; const age = 30; return {name, age, city: "NYC"}',
    evalExpect: { name: 'Alice', age: 30, city: 'NYC' },
    safeExpect: { name: 'Alice', age: 30, city: 'NYC' },
    category: 'Objects & Arrays',
  },
  {
    code: 'const a = 1; const obj = {a, b: a + 1}; return obj.a + obj.b',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Objects & Arrays',
  },
  // Computed property names - basic
  {
    code: '({["a" + "b"]: 1})',
    evalExpect: { ab: 1 },
    safeExpect: { ab: 1 },
    category: 'Objects & Arrays',
  },
  {
    code: 'let k = "x"; return ({[k]: 42})',
    evalExpect: { x: 42 },
    safeExpect: { x: 42 },
    category: 'Objects & Arrays',
  },
  {
    code: '({[1 + 2]: "three"})',
    evalExpect: { 3: 'three' },
    safeExpect: { 3: 'three' },
    category: 'Objects & Arrays',
  },
  {
    code: 'let n = "world"; return ({[`hello_${n}`]: 1})',
    evalExpect: { hello_world: 1 },
    safeExpect: { hello_world: 1 },
    category: 'Objects & Arrays',
  },
  {
    code: 'function k() { return "key" }; return ({[k()]: "val"})',
    evalExpect: { key: 'val' },
    safeExpect: { key: 'val' },
    category: 'Objects & Arrays',
  },
  {
    code: 'let t = true; return ({[t ? "a" : "b"]: 1})',
    evalExpect: { a: 1 },
    safeExpect: { a: 1 },
    category: 'Objects & Arrays',
  },
  // Computed property names - multiple and mixed
  {
    code: 'let a = "x", b = "y"; return ({[a]: 1, [b]: 2})',
    evalExpect: { x: 1, y: 2 },
    safeExpect: { x: 1, y: 2 },
    category: 'Objects & Arrays',
  },
  {
    code: '({a: 1, ["b"]: 2, c: 3})',
    evalExpect: { a: 1, b: 2, c: 3 },
    safeExpect: { a: 1, b: 2, c: 3 },
    category: 'Objects & Arrays',
  },
  {
    code: '({a: 1, ["a"]: 2})',
    evalExpect: { a: 2 },
    safeExpect: { a: 2 },
    category: 'Objects & Arrays',
  },
  {
    code: 'let arr = ["key"]; return ({[arr[0]]: "val"})',
    evalExpect: { key: 'val' },
    safeExpect: { key: 'val' },
    category: 'Objects & Arrays',
  },
  // Computed property names - edge cases
  {
    code: 'let c = 0; function k() { c++; return "a" } let o = {[k()]: 1}; return c',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Objects & Arrays',
  },
  {
    code: '({[""]: 1})',
    evalExpect: { '': 1 },
    safeExpect: { '': 1 },
    category: 'Objects & Arrays',
  },
  {
    code: '({[0]: "zero"})',
    evalExpect: { 0: 'zero' },
    safeExpect: { 0: 'zero' },
    category: 'Objects & Arrays',
  },
  {
    code: '({[true]: 1})',
    evalExpect: { true: 1 },
    safeExpect: { true: 1 },
    category: 'Objects & Arrays',
  },
  {
    code: '({[null]: 1})',
    evalExpect: { null: 1 },
    safeExpect: { null: 1 },
    category: 'Objects & Arrays',
  },
  {
    code: '({[undefined]: 1})',
    evalExpect: { undefined: 1 },
    safeExpect: { undefined: 1 },
    category: 'Objects & Arrays',
  },
  // Computed property names - with spread
  {
    code: 'let rest = {b: 2}; return ({["a"]: 1, ...rest})',
    evalExpect: { a: 1, b: 2 },
    safeExpect: { a: 1, b: 2 },
    category: 'Objects & Arrays',
  },
  {
    code: 'let rest = {a: 1}; return ({...rest, ["b"]: 2})',
    evalExpect: { a: 1, b: 2 },
    safeExpect: { a: 1, b: 2 },
    category: 'Objects & Arrays',
  },
  {
    code: 'let rest = {a: 1}; return ({...rest, ["a"]: 2})',
    evalExpect: { a: 2 },
    safeExpect: { a: 2 },
    category: 'Objects & Arrays',
  },
  {
    code: 'let o = {k: "deep"}; return ({[o.k]: 1})',
    evalExpect: { deep: 1 },
    safeExpect: { deep: 1 },
    category: 'Objects & Arrays',
  },
  {
    code: '({[(0, "a")]: 1})',
    evalExpect: { a: 1 },
    safeExpect: { a: 1 },
    category: 'Objects & Arrays',
  },
  // Computed method names
  {
    code: 'let m = "greet"; let o = {[m]() { return "hi" }}; return o.greet()',
    evalExpect: 'hi',
    safeExpect: 'hi',
    category: 'Objects & Arrays',
  },
  {
    code: 'let o = {["say"]() { return "hello" }}; return o.say()',
    evalExpect: 'hello',
    safeExpect: 'hello',
    category: 'Objects & Arrays',
  },
  {
    code: 'let o = {["a" + "b"]() { return 1 }}; return o.ab()',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Objects & Arrays',
  },
  {
    code: 'let o = {x: 10, ["getX"]() { return this.x }}; return o.getX()',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Objects & Arrays',
  },
  {
    code: '[1,2,3,].length',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Objects & Arrays',
  },
  {
    code: 'Object.keys({a:1,b:2,}).length',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Objects & Arrays',
  },
  {
    code: '[,].length',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Objects & Arrays',
  },
  {
    code: '0 in [,]',
    evalExpect: false,
    safeExpect: false,
    category: 'Objects & Arrays',
  },
  {
    code: '[,,].length',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Objects & Arrays',
  },
  {
    code: '[1,,].length',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Objects & Arrays',
  },
  {
    code: '1 in [1,,]',
    evalExpect: false,
    safeExpect: false,
    category: 'Objects & Arrays',
  },
  {
    code: '[1,,2].length',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Objects & Arrays',
  },
  {
    code: '1 in [1,,2]',
    evalExpect: false,
    safeExpect: false,
    category: 'Objects & Arrays',
  },
  {
    code: '[1,,2][2]',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Objects & Arrays',
  },
];
