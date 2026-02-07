'use strict';
import Sandbox from '../../../src/Sandbox.js';
import { LocalScope } from '../../../src/utils.js';
import { TestCase } from './types.js';

declare global {
  var bypassed: boolean;
}

const sandbox = new Sandbox();

export async function run(test: TestCase, state: any, isAsync: boolean) {
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
    expect((res as Error).message).toMatch(regex);
  } else if (test.safeExpect === 'NaN') {
    expect(res).toBeNaN();
  } else {
    expect(res).toEqual(test.safeExpect);
  }
}

export function getState() {
  const a = {
    type: 'Sandbox',
    test: [
      (a: any, b: any) => {
        return 1;
      },
    ],
    test2: 1,
    a: { b: { c: 2 } },
  };

  Object.setPrototypeOf(a, LocalScope.prototype);

  return a;
}
