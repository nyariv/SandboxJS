'use strict';
const Sandbox = require('../dist/node/Sandbox.js').default;
const tests = require('./tests.json');
const { expect } = require('chai');

const sandbox = new Sandbox();
globalThis.bypassed = false;

async function run(test, state, isAsync) {
  globalThis.bypassed = false;
  let ret;
  try {
    const c = `${test.code.includes(';') || test.code.startsWith('throw') ? '' : 'return '}${test.code}`;
    let fn = isAsync ? sandbox.compileAsync(c, true) : sandbox.compile(c, true);
    ret = await fn(state, {}).run();
  } catch (e) {
    ret = e;
  }
  let res;

  try {
    res = await ret;
  } catch (e) {
    res = e;
  }

  expect(globalThis.bypassed, 'Bypassed').to.eql(false);

  if (test.safeExpect === 'error') {
    expect(res, 'Result').to.be.an.instanceof(Error);
  } else if (typeof test.safeExpect === 'string' && test.safeExpect.startsWith('/')) {
    const regex = new RegExp(test.safeExpect.slice(1, -1));
    expect(res, 'Result').to.be.an.instanceof(Error);
    expect(res.message, 'Result').to.match(regex);
  } else if (test.safeExpect === 'NaN') {
    expect(res, 'Result').to.be.NaN;
  } else {
    expect(res, 'Result').to.eql(test.safeExpect);
  }
}

function getState() {
  return {
    type: 'Sandbox',
    test: [
      (a, b) => {
        return 1;
      },
    ],
    test2: 1,
    a: { b: { c: 2 } },
  };
}

describe('Positive Tests', () => {
  describe('Sync', async () => {
    let state = getState();
    for (let test of tests) {
      it(test.code.substring(0, 100), async () => {
        await run(test, state, false);
      });
    }
  });

  describe('Async', async () => {
    let state = getState();
    for (let test of tests) {
      it(test.code.substring(0, 100), async () => {
        await run(test, state, true);
      });
    }
  });
});
