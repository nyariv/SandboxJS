'use strict';
import { run, getState } from './test-utils.js';
import { tests, asyncTests } from './generators.data.js';

describe('Generator Tests', () => {
  describe('Sync', () => {
    tests.forEach((test) => {
      let state = getState();
      it(test.code.substring(0, 100), async () => {
        await run(test, state, false);
      });
    });
  });

  describe('Async', () => {
    [...tests, ...asyncTests].forEach((test) => {
      let state = getState();
      it(test.code.substring(0, 100), async () => {
        await run(test, state, true);
      });
    });
  });
});
