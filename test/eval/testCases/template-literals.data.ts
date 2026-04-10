'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: 'const a = 1; const b = 2; return `${a} + ${b} = ${a+b}`',
    evalExpect: '1 + 2 = 3',
    safeExpect: '1 + 2 = 3',
    category: 'Template Literals',
  },
  {
    code: "const name = 'world'; return `hello ${name}`",
    evalExpect: 'hello world',
    safeExpect: 'hello world',
    category: 'Template Literals',
  },
  {
    code: 'function tag(strings, ...values) { return strings[0] + values[0] + strings[1]; } return tag`hello ${"world"}`',
    evalExpect: 'hello world',
    safeExpect: 'hello world',
    category: 'Template Literals',
  },
  {
    code: 'function tag(strings, ...values) { return values.reduce((acc, val, i) => acc + val + strings[i + 1], strings[0]); } return tag`a${1}b${2}c${3}d`',
    evalExpect: 'a1b2c3d',
    safeExpect: 'a1b2c3d',
    category: 'Template Literals',
  },
  {
    code: 'const tagging = () => tag; function tag(strings, ...values) { return values.reduce((acc, val, i) => acc + val + strings[i + 1], strings[0]); } return tagging()`a${1}b${2}c${3}d`',
    evalExpect: 'a1b2c3d',
    safeExpect: 'a1b2c3d',
    category: 'Template Literals',
  },
  {
    code: 'function tag(strings) { return strings[0]; } return tag`static template`',
    evalExpect: 'static template',
    safeExpect: 'static template',
    category: 'Template Literals',
  },
  {
    code: 'const tag = (strings, ...values) => strings.length; return tag`test`',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Template Literals',
  },
  {
    code: 'const multiply = (strings, a, b) => a * b; return multiply`${2} * ${3}`',
    evalExpect: 6,
    safeExpect: 6,
    category: 'Template Literals',
  },
  {
    code: 'const tag = (s, ...v) => v.length; return tag`${1}${2}${3}`',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Template Literals',
  },
  {
    code: 'const obj = { tag(s, v) { return v * 2; } }; return obj.tag`${5}`',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Template Literals',
  },
  {
    code: 'const tag = s => s.join("-"); return tag`a${"b"}c`',
    evalExpect: 'a-c',
    safeExpect: 'a-c',
    category: 'Template Literals',
  },
  {
    code: 'const inner = "world"; return `hello ${`${inner.toUpperCase()}!`}`',
    evalExpect: 'hello WORLD!',
    safeExpect: 'hello WORLD!',
    category: 'Template Literals',
  },
  {
    code: 'const values = [1, 2]; return `${values.map(v => `${v * 2}`).join(",")}`',
    evalExpect: '2,4',
    safeExpect: '2,4',
    category: 'Template Literals',
  },
];
