'use strict';
import { run, getState } from './test-utils.js';
import { tests } from './function-replacements.data.js';

describe('Function Replacements Tests', () => {
  describe('Sync', () => {
    tests.forEach((test) => {
      const state = getState();
      it(test.code.substring(0, 100), async () => {
        await run(test, state, false);
      });
    });
  });

  describe('Async', () => {
    tests.forEach((test) => {
      const state = getState();
      it(test.code.substring(0, 100), async () => {
        await run(test, state, true);
      });
    });
  });
});
