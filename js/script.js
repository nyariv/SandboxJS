import Sandbox from '../dist/Sandbox.js'
import {tests, error} from './tests.js'

window['Sandbox'] = Sandbox;
(() => {
  window.bypassed = false;

  let allowedPrototypes = Sandbox.SAFE_PROTOTYPES;
  allowedPrototypes.set(HTMLElement, new Set()); 
  let allowedGlobals = Sandbox.SAFE_GLOBALS;
  let sandbox = new Sandbox(allowedGlobals, allowedPrototypes);
  
  window.sandbox = sandbox;
  let state = {
    type: "eval",
    test: [
      (a, b) => {return 1;}
    ], 
    test2: 1,
    a: {b : {c: 2}},
    Object,
    Math
  };

  let state2 = {
    type: "Sandbox",
    test: [
      (a, b) => {return 1;}
    ], 
    test2: 1,
    a: {b : {c: 2}},
  };

  let validate = (value, compare) => {
    if (typeof compare !== 'object') return value === compare;
    if (compare === error) {
      return value instanceof Error;
    }
    let res = value.length === compare.length;
    for (let i in compare) {
      res = res && validate(value[i], compare[i]);
    }
    return res;
  };

  let body = document.querySelector('tbody');
  const start = performance.now();
  tests.forEach((test) => {
    // return;
    bypassed = false;
    let tr = document.createElement('tr');
    let td;
    console.warn(test.code)

    // Code
    td = document.createElement('td');
    td.textContent = test.code.length > 55 ? test.code.substring(0, 55) + '...' : test.code;
    tr.appendChild(td);

    // Eval
    td = document.createElement('td');
    let evall = function nativeEval(prox) {
      return (function nativeCompile() { 
        // return () => {}
        return new Function('sandbox', `with (sandbox) {${test.code.includes(';') ? '' : 'return '}${test.code}}`);
      })()(prox);
    }
    // let evall = () => {};
    let proxy = new Proxy(state, {
      has(target,key,context) {
        if (key in state) {
          return Reflect.has(
              target, key, context
          );
        }
        else {
          throw new Error("Not allowed: " + key);
        }
      }
    });
    let emsg = "";
    try {
      let res = JSON.stringify(evall(proxy));
      td.textContent = bypassed ? 'bypassed' : res;
    } catch (e) {
      console.log('eval error', e);
      emsg = e.message;
      td.classList.add('error');
      td.textContent = 'Error';
    }
    td.setAttribute('title', emsg);
    td.classList.toggle('negative', bypassed);
    tr.appendChild(td);

    // Sandbox.js

    // Test
    bypassed = false;
    emsg = "";
    td = document.createElement('td');
    let res = (() => {
      try {
        return sandbox.compile(`${test.code.includes(';') ? '' : 'return '}${test.code}`)(state2);
      } catch (e) {
        console.log('sandbox error', e);
        emsg = e.message;
        td.classList.add('error');
        return e;
      }
    })();
    td.setAttribute('title', emsg);
    td.textContent = res instanceof Error ? 'Error' : JSON.stringify(res);
    tr.appendChild(td);

    td = document.createElement('td');
    let valid = validate(res, test.safeExpect);
    if (!valid) {
      console.error('sandbox failure', res, test.safeExpect);
    }
    td.textContent = bypassed ? 'bypassed' : valid ? 'PASS' : 'FAIL';
    td.classList.toggle('positive', valid && !bypassed);
    td.classList.toggle('negative', !valid || bypassed);
    tr.appendChild(td);

    body.appendChild(tr);
  });
  console.log(`Total time: ${performance.now() - start}ms`);
})()