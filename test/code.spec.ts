'use strict';
import Sandbox from '../src/Sandbox.js';
import { LocalScope } from '../src/utils.js';
import tests from './tests.json';

const sandbox = new Sandbox();
globalThis.bypassed = false;

async function run(test, state, isAsync) {
  globalThis.bypassed = false;
  let ret;
  try {
    const c = `${test.code.includes(';') || test.code.startsWith('throw') ? '' : 'return '}${test.code}`;
    let fn = isAsync ? sandbox.compileAsync(c, true) : sandbox.compile(c, true);
    ret = await fn(state, new LocalScope()).run();
  } catch (e) {
    ret = e;
  }
  let res;

  try {
    res = await ret;
  } catch (e) {
    res = e;
  }

  expect(globalThis.bypassed).toBe(false);

  if (test.safeExpect === 'error') {
    expect(res).toBeInstanceOf(Error);
  } else if (typeof test.safeExpect === 'string' && test.safeExpect.startsWith('/')) {
    const regex = new RegExp(test.safeExpect.slice(1, -1));
    expect(res).toBeInstanceOf(Error);
    expect(res.message).toMatch(regex);
  } else if (test.safeExpect === 'NaN') {
    expect(res).toBeNaN();
  } else {
    expect(res).toEqual(test.safeExpect);
  }
}

function getState() {
  const a =  {
    type: 'Sandbox',
    test: [
      (a, b) => {
        return 1;
      },
    ],
    test2: 1,
    a: { b: { c: 2 } },
  };

  Object.setPrototypeOf(a, LocalScope.prototype);

  return a;
}

// Derive unique categories from tests
const categories = [...new Set(tests.map((test) => test.category))].sort();

describe('Sandbox Tests', () => {
  // return
  describe('Sync', () => {
    categories.forEach((category) => {
      const categoryTests = tests.filter((test) => test.category === category)
      
      describe(category, () => {
        categoryTests.forEach((test) => {
          let state = getState();
          it(test.code.substring(0, 100), async () => {
            await run(test, state, false);
          });
        });
      });
    });
  });
  describe('Async', () => {
    categories.forEach((category) => {
      const categoryTests = tests.filter((test) => test.category === category);

      describe(category, () => {
        categoryTests.forEach((test) => {
          let state = getState();
          it(test.code.substring(0, 100), async () => {
            await run(test, state, true);
          });
        });
      });
    });
  });
});
