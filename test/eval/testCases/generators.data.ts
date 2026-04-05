'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  // Basic generator
  {
    code: 'function* gen() { yield 1; yield 2; yield 3; } const g = gen(); return [g.next().value, g.next().value, g.next().value]',
    safeExpect: [1, 2, 3],
    category: 'Generators',
  },
  // Generator done state
  {
    code: 'function* gen() { yield 1; } const g = gen(); g.next(); return g.next().done',
    safeExpect: true,
    category: 'Generators',
  },
  // Generator return value
  {
    code: 'function* gen() { yield 1; return 42; } const g = gen(); g.next(); return g.next().value',
    safeExpect: 42,
    category: 'Generators',
  },
  // for-of with generator
  {
    code: 'function* gen() { yield 1; yield 2; yield 3; } const arr = []; for (const x of gen()) { arr.push(x); } return arr',
    safeExpect: [1, 2, 3],
    category: 'Generators',
  },
  // Spread with generator
  {
    code: 'function* gen() { yield 1; yield 2; yield 3; } return [...gen()]',
    safeExpect: [1, 2, 3],
    category: 'Generators',
  },
  // yield* delegation
  {
    code: 'function* inner() { yield 2; yield 3; } function* outer() { yield 1; yield* inner(); yield 4; } return [...outer()]',
    safeExpect: [1, 2, 3, 4],
    category: 'Generators',
  },
  // yield* with array
  {
    code: 'function* gen() { yield 1; yield* [2, 3]; yield 4; } return [...gen()]',
    safeExpect: [1, 2, 3, 4],
    category: 'Generators',
  },
  // Inline generator function expression
  {
    code: 'const gen = function* () { yield 1; yield 2; }; return [...gen()]',
    safeExpect: [1, 2],
    category: 'Generators',
  },
  // Generator with arguments
  {
    code: 'function* range(start, end) { for (let i = start; i < end; i++) yield i; } return [...range(0, 4)]',
    safeExpect: [0, 1, 2, 3],
    category: 'Generators',
  },
  // Generator with return in middle
  {
    code: 'function* gen() { yield 1; return; yield 2; } return [...gen()]',
    safeExpect: [1],
    category: 'Generators',
  },
  // yield outside generator throws
  {
    code: 'function f() { yield 1; } f()',
    safeExpect: 'error',
    category: 'Generators',
  },
  // yield inside nested regular function inside generator throws
  {
    code: 'function* gen() { function inner() { yield 1; } inner(); } [...gen()]',
    safeExpect: 'error',
    category: 'Generators',
  },
  // yield inside arrow function inside generator throws
  {
    code: 'function* gen() { const f = () => { yield 1; }; f(); } [...gen()]',
    safeExpect: 'error',
    category: 'Generators',
  },
  // yield inside method of object literal inside generator throws
  {
    code: 'function* gen() { const obj = { m() { yield 1; } }; obj.m(); } [...gen()]',
    safeExpect: 'error',
    category: 'Generators',
  },
  // Generator with conditional yields
  {
    code: 'function* gen(n) { if (n > 0) { yield 1; yield 2; } else { yield -1; } } return [...gen(1)]',
    safeExpect: [1, 2],
    category: 'Generators',
  },
  {
    code: 'function* gen(n) { if (n > 0) { yield 1; yield 2; } else { yield -1; } } return [...gen(-1)]',
    safeExpect: [-1],
    category: 'Generators',
  },
  // Generator with try/finally
  {
    code: 'const log = []; function* gen() { try { yield 1; yield 2; } finally { log.push("done"); } }; [...gen()]; return log',
    safeExpect: ['done'],
    category: 'Generators',
  },
  // Generator with try/catch (no throw, catch block not entered)
  {
    code: 'const log = []; function* gen() { try { yield 1; } catch(e) { log.push("caught"); } yield 2; }; [...gen()]; return log',
    safeExpect: [],
    category: 'Generators',
  },
  // Generator with destructuring in for-of
  {
    code: 'function* pairs() { yield [1, "a"]; yield [2, "b"]; yield [3, "c"]; } const arr = []; for (const [n, s] of pairs()) { arr.push(s + n); } return arr',
    safeExpect: ['a1', 'b2', 'c3'],
    category: 'Generators',
  },
  // Multiple yield* delegations in sequence
  {
    code: 'function* genA() { yield 1; yield 2; } function* genB() { yield 3; yield 4; } function* genC() { yield* genA(); yield* genB(); yield 5; } return [...genC()]',
    safeExpect: [1, 2, 3, 4, 5],
    category: 'Generators',
  },
  // Nested yield* delegation
  {
    code: 'function* genX() { yield 1; } function* genY() { yield* genX(); yield 2; } function* genZ() { yield* genY(); yield 3; } return [...genZ()]',
    safeExpect: [1, 2, 3],
    category: 'Generators',
  },
  // Generator with while loop
  {
    code: 'function* countdown(n) { while (n > 0) { yield n; n = n - 1; } } return [...countdown(3)]',
    safeExpect: [3, 2, 1],
    category: 'Generators',
  },
  // Generator return() ends iteration
  {
    code: 'function* gen() { yield 1; yield 2; yield 3; } const g = gen(); g.next(); const r = g.return(42); return [r.value, r.done, g.next().done]',
    safeExpect: [42, true, true],
    category: 'Generators',
  },
  // Generator throw() propagates error
  {
    code: 'function* gen() { yield 1; yield 2; } const g = gen(); try { g.throw(new Error("boom")); } catch(e) { return e.message }',
    safeExpect: 'boom',
    category: 'Generators',
  },
  // Generator throw() after partial consumption
  {
    code: 'function* gen() { yield 1; yield 2; } const g = gen(); g.next(); try { g.throw(new Error("x")); } catch(e) { return e.message }',
    safeExpect: 'x',
    category: 'Generators',
  },
];

// These tests require async compilation (use of await / for-await-of at top level).
export const asyncTests: TestCase[] = [
  // Async generator
  {
    code: 'async function* gen() { yield 1; yield 2; } const g = gen(); return [(await g.next()).value, (await g.next()).value]',
    safeExpect: [1, 2],
    category: 'Generators',
  },
  // Async generator with for-await-of
  {
    code: 'async function* gen() { yield 1; yield 2; yield 3; } const arr = []; for await (const x of gen()) { arr.push(x); } return arr',
    safeExpect: [1, 2, 3],
    category: 'Generators',
  },
];
