'use strict';
import { run, getState } from './test-utils.js';
import { tests } from './template-literals.data.js';

describe('Template Literals Tests', () => {
  describe('Sync', () => {
    tests.forEach((test) => {
      let state = getState();
      it(test.code.substring(0, 100), async () => {
        await run(test, state, false);
      });
    });
  });

  describe('Async', () => {
    tests.forEach((test) => {
      let state = getState();
      it(test.code.substring(0, 100), async () => {
        await run(test, state, true);
      });
    });
  });
});
