'use strict';
import { TestCase } from './types.js';

function toEvalTest(code: string, safeExpect: string): TestCase {
  return {
    code: `return eval(${JSON.stringify(code)});`,
    evalExpect: 'error',
    safeExpect,
    category: 'Syntax Errors',
  };
}

export const tests: TestCase[] = [
  // Entry and delimiter guards
  toEvalTest("const value = 'oops", "/Unclosed '\\''/"),
  toEvalTest('const value = "oops', '/Unclosed \'"/'),
  toEvalTest('const value = `oops', "/Unclosed '`'/"),
  toEvalTest('const value = 1; /* open comment', "/Unclosed comment '\\/\\*'/"),

  // Expression and property guards
  toEvalTest('const value =', '/Unexpected end of expression/'),
  toEvalTest('const value = [1 2];', '/Unexpected token/'),
  toEvalTest('const value = { a: 1 b: 2 };', '/Unexpected token/'),
  toEvalTest('fn(, value);', '/Unexpected end of expression/'),
  toEvalTest('const obj = { [key] };', '/Unexpected token in computed property/'),
  toEvalTest(
    'return -2 ** 3;',
    '/Unary operator used immediately before exponentiation expression/',
  ),
  toEvalTest('value.', '/Unexpected token after prop: \\./'),
  toEvalTest('const value = for;', "/Unexpected token 'for'/"),
  toEvalTest('return 1 + ;', '/Unexpected end of expression/'),
  toEvalTest('return 1,;', '/Unexpected token/'),
  toEvalTest('return value ? truthy :;', '/Unexpected end of expression/'),
  toEvalTest('({}).a?.;', '/Unexpected token/'),
  toEvalTest('({}).a?.[;', "/Unclosed '\\['/"),
  toEvalTest('a?.b = 1;', '/Invalid left-hand side in assignment/'),
  toEvalTest('new Map?.();', '/optional chain|Unexpected/'),
  toEvalTest('a[];', '/Unexpected end of expression/'),
  toEvalTest('a[;', "/Unclosed '\\['/"),
  toEvalTest('return (1 + 2;', "/Unclosed '\\('/"),
  toEvalTest('const value = [1, 2;', "/Unclosed '\\['/"),
  toEvalTest('const value = { a: 1;', "/Unclosed '\\{'/"),
  toEvalTest('fn(value;', "/Unclosed '\\('/"),

  // Statement-form guards
  toEvalTest('switch (value) case 1: break;', '/Invalid switch/'),
  toEvalTest(
    'switch (value) { default: break; default: break; }',
    '/Only one default switch case allowed/',
  ),
  toEvalTest('function fn(for) { return for; }', "/Unexpected token 'for'/"),
  toEvalTest('async function fn(await) {}', "/Unexpected token 'await'/"),
  toEvalTest('const [value];', '/Destructuring declaration requires an initializer/'),
  toEvalTest('const [value + 1] = arr;', '/Invalid destructuring target/'),
  toEvalTest('const { a: value + 1 } = obj;', '/Invalid destructuring target/'),
  toEvalTest(
    'function fn(...rest, last) { return rest; }',
    '/Rest parameter must be last formal parameter/',
  ),
  toEvalTest('(first, ...rest, last) => first', '/Rest parameter must be last formal parameter/'),
  toEvalTest('for (const [a, b] from pairs) {}', '/Invalid for loop definition/'),
  toEvalTest('for (let i = 0; i < 2) {}', '/Invalid for loop definition/'),
  toEvalTest('if (value) else return 1;', '/Unexpected token/'),
  toEvalTest('while () {}', '/Unexpected end of expression/'),
  toEvalTest('do { value++; }', "/Unclosed '\\('/"),
  toEvalTest('try {} catch () {}', "/Unexpected token '\\)'/"),
  toEvalTest('try { value++; }', '/Missing catch or finally after try/'),
  toEvalTest('try {} catch (for) {}', "/Unexpected token 'for'/"),
  toEvalTest('try {} finally', '/Unexpected token/'),
  toEvalTest('throw ;', '/Unexpected end of expression/'),
  toEvalTest('new ;', '/Unexpected end of expression/'),
  toEvalTest('typeof ;', '/Unexpected end of expression/'),
  toEvalTest('delete ;', '/Unexpected end of expression/'),
  toEvalTest('void ;', '/Unexpected end of expression/'),
  toEvalTest('"a" in ;', '/Unexpected end of expression/'),
  toEvalTest('value instanceof ;', '/Unexpected end of expression/'),
  toEvalTest('const value = [...];', '/Unexpected end of expression/'),
  toEvalTest('const value = {...};', '/Unexpected end of expression/'),
  toEvalTest('fn(...);', '/Unexpected end of expression/'),
  toEvalTest('while (true) { break 1; }', "/Unexpected token '1'/"),
  toEvalTest('while (true) { continue 1; }', "/Unexpected token '1'/"),

  // Known parser gaps
  toEvalTest('for (const { a } of) {}', '/Unexpected end of expression/'),
  toEvalTest('const { ...rest, value } = obj;', '/Rest element must be last element/'),
  toEvalTest(
    'function fn(...[rest], last) { return last; }',
    '/Rest parameter must be last formal parameter/',
  ),
  toEvalTest('yield 1;', '/Unexpected token/'),
  toEvalTest('function* gen(){ yield* ; }', '/Unexpected end of expression/'),
  toEvalTest('async function fn(){ await ; }', '/Unexpected end of expression/'),
  toEvalTest('async function* gen(){ yield* ; }', '/Unexpected end of expression/'),
  toEvalTest('switch (x) { case: break; }', '/Unexpected end of expression/'),
  toEvalTest('switch (x) { case 1 break; }', '/switch|case|Unexpected/'),
  toEvalTest('1++;', '/Invalid left-hand side expression in postfix operation/'),
  toEvalTest('--1;', '/left-hand side|Unexpected/'),
  toEvalTest('async function run() { for await (const key in obj) {} }', "/Unexpected token 'in'/"),
  toEvalTest(
    'async function run(){ for await (const item of) {} }',
    '/Unexpected end of expression/',
  ),
  toEvalTest('const re = /(/;', '/Invalid regular expression/'),
  toEvalTest('const re = /a/zz;', '/Invalid flags/'),
  toEvalTest('tag`${}`;', '/Unexpected end of expression/'),
  toEvalTest('tag`${value`;', '/Unclosed/'),
  toEvalTest('({a:1,,b:2})', '/Unexpected token ,/'),
];
