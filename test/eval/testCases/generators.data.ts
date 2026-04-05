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
  // yield* invalid target throws
  {
    code: 'function* gen() { yield* 1; } return [...gen()]',
    safeExpect: '/not iterable/',
    category: 'Generators',
  },
  // Inline generator function expression
  {
    code: 'const gen = function* () { yield 1; yield 2; }; return [...gen()]',
    safeExpect: [1, 2],
    category: 'Generators',
  },
  // Anonymous generator IIFE
  {
    code: 'return (function* () { yield 1; yield 2; })().next().value',
    safeExpect: 1,
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
  // Generator with if and no else branch
  {
    code: 'function* gen(flag) { if (flag) { yield 1; } } return [...gen(false)]',
    safeExpect: [],
    category: 'Generators',
  },
  // Generator with if and no else branch
  {
    code: 'function* gen() { if (false) { yield 1; } yield 2; } return [...gen()]',
    safeExpect: [2],
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
  // next(value) injection — yield as expression
  {
    code: 'function* gen() { const x = yield 1; const y = yield 2; return x + y; } const g = gen(); g.next(); g.next(10); return g.next(20).value',
    safeExpect: 30,
    category: 'Generators',
  },
  // yield expression returns undefined when no value injected
  {
    code: 'function* gen() { const x = yield 1; return x; } const g = gen(); g.next(); return g.next().value',
    safeExpect: undefined,
    category: 'Generators',
  },
  // Generator return() runs finally block
  {
    code: 'const log = []; function* gen() { try { yield 1; } finally { log.push("F"); } } const g = gen(); g.next(); g.return(99); return log',
    safeExpect: ['F'],
    category: 'Generators',
  },
  // Generator throw() triggers catch block
  {
    code: 'function* gen() { try { yield 1; } catch(e) { yield e.message; } } const g = gen(); g.next(); return g.throw(new Error("boom")).value',
    safeExpect: 'boom',
    category: 'Generators',
  },
  // yield inside for loop — correct iteration count
  {
    code: 'function* range(n) { for (let i = 0; i < n; i++) yield i; } return [...range(4)]',
    safeExpect: [0, 1, 2, 3],
    category: 'Generators',
  },
  // yield* delegation with next(value) forwarding
  {
    code: 'function* inner() { const x = yield 1; return x * 2; } function* outer() { const r = yield* inner(); yield r; } const g = outer(); g.next(); const r = g.next(5); return [r.value, r.done, g.next().done]',
    safeExpect: [10, false, true],
    category: 'Generators',
  },
  // yield* wraps iterators that do not expose Symbol.iterator themselves
  {
    code: 'const iterable = {}; iterable[Symbol.iterator] = function() { return { step: 0, next(value) { if (this.step++ === 0) return { value: 1, done: false }; return { value: value * 2, done: true }; } }; }; function* gen() { return yield* iterable; } const g = gen(); const a = g.next(); const b = g.next(7); return [[a.value, a.done], [b.value, b.done]]',
    safeExpect: [
      [1, false],
      [14, true],
    ],
    category: 'Generators',
  },
  // yield* forwards return() into wrapped iterators
  {
    code: 'const log = []; const iterable = {}; iterable[Symbol.iterator] = function() { return { next() { return { value: 1, done: false }; }, return(value) { log.push(value); return { value: value + 1, done: true }; } }; }; function* gen() { yield* iterable; } const g = gen(); g.next(); const r = g.return(9); return [r.value, r.done, log]',
    safeExpect: [10, true, [9]],
    category: 'Generators',
  },
  // yield* forwards throw() into wrapped iterators
  {
    code: 'const log = []; const iterable = {}; iterable[Symbol.iterator] = function() { return { next() { return { value: 1, done: false }; }, throw(err) { log.push(err.message); return { value: "caught", done: true }; } }; }; function* gen() { return yield* iterable; } const g = gen(); g.next(); const r = g.throw(new Error("boom")); return [r.value, r.done, log]',
    safeExpect: ['caught', true, ['boom']],
    category: 'Generators',
  },
  // Generator loop with continue and break
  {
    code: 'function* gen() { for (let i = 0; i < 5; i++) { if (i === 1) continue; if (i === 3) break; yield i; } } return [...gen()]',
    safeExpect: [0, 2],
    category: 'Generators',
  },
  // Generator labeled break exits outer loop
  {
    code: 'function* gen() { outer: for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { if (i === 1 && j === 1) break outer; yield `${i}${j}`; } } } return [...gen()]',
    safeExpect: ['00', '01', '02', '10'],
    category: 'Generators',
  },
  // Generator labeled statement handles break target
  {
    code: 'function* gen() { outer: { yield 1; break outer; yield 2; } yield 3; } return [...gen()]',
    safeExpect: [1, 3],
    category: 'Generators',
  },
  // Generator catches internal throws
  {
    code: 'function* gen() { try { throw new Error("boom"); } catch (e) { yield e.message; } } return [...gen()]',
    safeExpect: ['boom'],
    category: 'Generators',
  },
  // Generator rethrows internal throws when no catch is present
  {
    code: 'function* gen() { try { throw new Error("boom"); } finally { } } const g = gen(); try { g.next(); } catch (e) { return e.message; }',
    safeExpect: 'boom',
    category: 'Generators',
  },
  // Generator labeled statement falls through when not broken
  {
    code: 'function* gen() { outer: { yield 1; } return 2; } const g = gen(); return [g.next().value, g.next().value]',
    safeExpect: [1, 2],
    category: 'Generators',
  },
  // for-await-of inside sync generator throws
  {
    code: 'function* gen() { for await (const x of [1, 2]) { yield x; } } return [...gen()]',
    safeExpect: 'error',
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
  // Async inline generator function expression
  {
    code: 'const gen = async function* () { yield 1; yield 2; }; const g = gen(); return [(await g.next()).value, (await g.next()).value]',
    safeExpect: [1, 2],
    category: 'Generators',
  },
  // Anonymous async generator IIFE
  {
    code: 'return (await (async function* () { yield 1; yield 2; })().next()).value',
    safeExpect: 1,
    category: 'Generators',
  },
  // Async generator next(value) injection
  {
    code: 'async function* gen() { const x = yield 1; const y = yield 2; return x + y; } const g = gen(); await g.next(); await g.next(10); return (await g.next(20)).value',
    safeExpect: 30,
    category: 'Generators',
  },
  // Async generator yield* delegation with next(value) forwarding
  {
    code: 'async function* inner() { const x = yield 1; return x * 2; } async function* outer() { const r = yield* inner(); yield r; } const g = outer(); await g.next(); const r = await g.next(5); return [r.value, r.done, (await g.next()).done]',
    safeExpect: [10, false, true],
    category: 'Generators',
  },
  // Async yield* invalid target throws
  {
    code: 'async function* gen() { yield* 1; } const g = gen(); await g.next()',
    safeExpect: '/not iterable/',
    category: 'Generators',
  },
  // Async yield* can delegate to sync iterables
  {
    code: 'const iterable = {}; iterable[Symbol.iterator] = function() { return { step: 0, next(value) { if (this.step++ === 0) return { value: 1, done: false }; return { value: value * 2, done: true }; } }; }; async function* gen() { return yield* iterable; } const g = gen(); const a = await g.next(); const b = await g.next(7); return [[a.value, a.done], [b.value, b.done]]',
    safeExpect: [
      [1, false],
      [14, true],
    ],
    category: 'Generators',
  },
  // Async yield* forwards return() into sync iterators
  {
    code: 'const log = []; const iterable = {}; iterable[Symbol.iterator] = function() { return { next() { return { value: 1, done: false }; }, return(value) { log.push(value); return { value: value + 1, done: true }; } }; }; async function* gen() { yield* iterable; } const g = gen(); await g.next(); const r = await g.return(9); return [r.value, r.done, log]',
    safeExpect: [10, true, [9]],
    category: 'Generators',
  },
  // Async yield* forwards throw() into sync iterators
  {
    code: 'const log = []; const iterable = {}; iterable[Symbol.iterator] = function() { return { next() { return { value: 1, done: false }; }, throw(err) { log.push(err.message); return { value: "caught", done: true }; } }; }; async function* gen() { return yield* iterable; } const g = gen(); await g.next(); const r = await g.throw(new Error("boom")); return [r.value, r.done, log]',
    safeExpect: ['caught', true, ['boom']],
    category: 'Generators',
  },
  // Async yield* return() works even when delegate lacks return()
  {
    code: 'const iterable = {}; iterable[Symbol.iterator] = function() { return { next() { return { value: 1, done: false }; } }; }; async function* gen() { yield* iterable; } const g = gen(); await g.next(); const r = await g.return(9); return [r.value, r.done]',
    safeExpect: [9, true],
    category: 'Generators',
  },
  // Async yield* throw() rethrows when delegate lacks throw()
  {
    code: 'const iterable = {}; iterable[Symbol.iterator] = function() { return { next() { return { value: 1, done: false }; } }; }; async function* gen() { try { return yield* iterable; } catch (e) { return e.message; } } const g = gen(); await g.next(); const r = await g.throw(new Error("boom")); return [r.value, r.done]',
    safeExpect: ['boom', true],
    category: 'Generators',
  },
  // Async generator surfaces body errors after resuming
  {
    code: 'async function* gen() { yield 1; throw new Error("boom"); } const g = gen(); await g.next(); try { await g.next(); } catch (e) { return e.message; }',
    safeExpect: 'boom',
    category: 'Generators',
  },
];
