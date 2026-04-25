'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: "const list = []; const push = list.push; push(1); push(2); return list.join(',')",
    evalExpect: '1,2',
    safeExpect: '1,2',
    category: 'Function Replacements',
  },
  {
    code: 'const list = []; const push = list.push; return push.name',
    evalExpect: 'push',
    safeExpect: 'push',
    category: 'Function Replacements',
  },
  {
    code: "const list = []; const other = []; const push = list.push; const rebound = push.bind(other); rebound(3); return [list.join(','), other.join(','), rebound.name].join('|')",
    evalExpect: '|3|bound push',
    safeExpect: '|3|bound push',
    category: 'Function Replacements',
  },
  {
    code: "const list = []; const other = []; const push = list.push; const rebound = push.bind(other, 3, 4); rebound(); return [list.join(','), other.join(','), rebound.name, rebound.length].join('|')",
    evalExpect: '|3,4|bound push|0',
    safeExpect: '|3,4|bound push|0',
    category: 'Function Replacements',
  },
  {
    code: "const list = []; const other = []; const third = []; const push = list.push; const rebound = push.bind(other, 3); const reboundAgain = rebound.bind(third, 4); reboundAgain(5); return [list.join(','), other.join(','), third.join(','), reboundAgain.name].join('|')",
    evalExpect: '|3,4,5||bound bound push',
    safeExpect: '|3,4,5||bound bound push',
    category: 'Function Replacements',
  },
];
