'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    code: 'let x; for(let i = 0; i < 2; i++){ x = i }; return x;',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Loops',
  },
  {
    code: 'let x; for(let i = 0; i < 2; i++){ x = i; break; }; return x;',
    evalExpect: 0,
    safeExpect: 0,
    category: 'Loops',
  },
  {
    code: 'let x; for(let i = 0; i < 2; i++){ x = i; continue; x++ }; return x;',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Loops',
  },
  {
    code: 'break;',
    evalExpect: 'error',
    safeExpect: 'error',
    category: 'Loops',
  },
  {
    code: 'continue;',
    evalExpect: 'error',
    safeExpect: 'error',
    category: 'Loops',
  },
  {
    code: 'let sum = 0; for (let i = 0; i < 5; i++) { if (i === 2) continue; sum += i; }; return sum;',
    evalExpect: 8,
    safeExpect: 8,
    category: 'Loops',
  },
  {
    code: 'let sum = 0; for (let i = 0; i < 10; i++) { if (i === 3) break; sum += i; }; return sum;',
    evalExpect: 3,
    safeExpect: 3,
    category: 'Loops',
  },
  {
    code: 'let sum = 0; for (let i = 0; i < 5; i++) { if (i > 0) { if (i === 2) continue; } sum += i; }; return sum;',
    evalExpect: 8,
    safeExpect: 8,
    category: 'Loops',
  },
  {
    code: 'let sum = 0; for (let i = 0; i < 5; i++) { if (i === 2) { continue; } sum += i; }; return sum;',
    evalExpect: 8,
    safeExpect: 8,
    category: 'Loops',
  },
  {
    code: 'let x = 0; while (x < 5) { x++; if (x === 3) continue; if (x === 4) break; }; return x;',
    evalExpect: 4,
    safeExpect: 4,
    category: 'Loops',
  },
  {
    code: 'let sum = 0; for (let i = 0; i < 5; i++) { sum += i === 2 ? continue : i; }; return sum;',
    evalExpect: 'error',
    safeExpect: 'error',
    category: 'Loops',
  },
  {
    code: 'let x = 2; while(--x){ }; return x;',
    evalExpect: 0,
    safeExpect: 0,
    category: 'Loops',
  },
  {
    code: 'let x = 1; do {x++} while(x < 1); return x;',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Loops',
  },
  {
    code: 'for(let i of [1,2]){ return i };',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Loops',
  },
  {
    code: 'let arr = [1,2]; for(let i of arr){ return i };',
    evalExpect: 1,
    safeExpect: 1,
    category: 'Loops',
  },
  {
    code: 'for(let i in [1,2]){ return i };',
    evalExpect: '0',
    safeExpect: '0',
    category: 'Loops',
  },
  {
    code: 'let i = 1; {let j = 1; i += j;}; return i',
    evalExpect: 2,
    safeExpect: 2,
    category: 'Loops',
  },
  {
    code: 'let c = 0; for (let i = 0; i < 10; i++) {c++} return c',
    evalExpect: 10,
    safeExpect: 10,
    category: 'Loops',
  },
  {
    code: "outer: for(let i = 0; i < 3; i++) { for(let j = 0; j < 3; j++) { if(i === 1 && j === 1) break outer; } } return 'done'",
    evalExpect: 'done',
    safeExpect: 'done',
    category: 'Loops',
  },
  {
    code: "for(let i = 0, j = 10; i < 3; i++, j--) { } return 'done'",
    evalExpect: 'done',
    safeExpect: 'done',
    category: 'Loops',
  },
];
