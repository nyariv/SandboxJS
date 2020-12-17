import Sandbox from '../build/Sandbox.js'

window['Sandbox'] = Sandbox;
const exec = async () => {
  const tests = await testsPromise;
  window.bypassed = false;
  const isAsync = document.getElementById('runtime-type').value === 'async';

  let prototypeWhitelist = Sandbox.SAFE_PROTOTYPES;
  prototypeWhitelist.set(HTMLElement, new Set());
  const lodash = window["_"];
  prototypeWhitelist.set(lodash, new Set()); 
  let globals = {...Sandbox.SAFE_GLOBALS, lodash};
  let sandbox = new Sandbox({prototypeWhitelist, globals});
  
  window.sandbox = sandbox;
  let state = {
    type: "eval",
    test: [
      (a, b) => {return 1;}
    ], 
    test2: 1,
    a: {b : {c: 2}},
    Object,
    Math,
    Date,
    Array,
    lodash,
    undefined
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
    if (compare === 'error') {
      return value instanceof Error;
    }
    if (compare === null) {
      return compare === value;
    }
    if (compare === 'NaN') {
      return isNaN(value) && typeof value === 'number';
    }
    if (typeof compare !== 'object') {
      return value === compare;
    }
    let res = value?.length === compare?.length;
    for (let i in compare) {
      res = res && validate(value?.[i], compare[i]);
    }
    return res;
  };

  let body = document.querySelector('.tests tbody');
  const jit = document.getElementById('jit-parsing').checked;
  body.innerHTML = '';
  const start = performance.now();
  let totalCompileNative = 0;
  let totalCompileSandbox = 0;
  let totalExecuteNative = 0;
  let totalExecuteSandbox = 0;
  for (let test of tests) {
    // return;
    bypassed = false;
    let tr = document.createElement('tr');
    body.appendChild(tr);
    let td;
    console.warn(test.code);

    // Code
    td = document.createElement('td');
    td.textContent = test.code.length > 55 ? test.code.substring(0, 55) + '...' : test.code;
    td.setAttribute('title', test.code);
    tr.appendChild(td);

    // Eval
    td = document.createElement('td');
    let evall = function nativeEval() {
      if (isAsync) {
        return new Function('sandbox', `return (async () => {with (sandbox) {\n${test.code.includes(';') ? '' : 'return '}${test.code}\n}})()`);;
      }
      return new Function('sandbox', `with (sandbox) {\n${test.code.includes(';') ? '' : 'return '}${test.code}\n}`);;
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
    let time = performance.now();
    try {
      let fn = evall();
      totalCompileNative += performance.now() - time;
      time = performance.now();
      let ret = await fn(proxy);
      totalExecuteNative += performance.now() - time;
      let res = await ret;
      td.textContent = bypassed ? 'bypassed' : (isNaN(ret) && typeof res === 'number' ? 'NaN' : (JSON.stringify(res) + (ret instanceof Promise ? ' (Promise)' : '')));
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
    time = performance.now();
    let ret;
    try {
      const c = `${test.code.includes(';') ? '' : 'return '}${test.code}`;
      let fn = isAsync ? sandbox.compileAsync(c) : sandbox.compile(c);
      totalCompileSandbox += performance.now() - time;
      time = performance.now();
      ret = await fn(state2, {});
      totalExecuteSandbox += performance.now() - time;
    } catch (e) {
      console.log('sandbox error', e);
      emsg = e.message;
      td.classList.add('error');
      ret = e;
    }
    let res;
    try {
      res = await ret;
    } catch (e) {
      console.log('sandbox error', e);
      emsg = e.message;
      td.classList.add('error');
      res = e;
    }
    td.setAttribute('title', emsg);
    td.textContent = bypassed ? 'bypassed' : (res instanceof Error ? 'Error' : (isNaN(res) && typeof res === 'number' ? 'NaN' : (JSON.stringify(res) + (ret instanceof Promise ? ' (Promise)' : ''))));
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

  }
  const timesBody = document.querySelector('#times tbody');
  timesBody.innerHTML = '';
  let tr = document.createElement('tr');
  let td = document.createElement('th');
  tr.appendChild(td);
  td = document.createElement('th');
  td.textContent = 'eval';
  tr.appendChild(td);
  td = document.createElement('th');
  td.textContent = 'Sandbox.js';
  tr.appendChild(td);
  timesBody.appendChild(tr);

  tr = document.createElement('tr');
  td = document.createElement('td');
  td.textContent = 'Compile Time';
  tr.appendChild(td);
  td = document.createElement('td');
  td.textContent = (Math.round(totalCompileNative * 10) / 10) + 'ms';
  tr.appendChild(td);
  td = document.createElement('td');
  td.textContent = (Math.round(totalCompileSandbox * 10) / 10) + 'ms';
  tr.appendChild(td);
  timesBody.appendChild(tr);
  
  tr = document.createElement('tr');
  td = document.createElement('td');
  td.textContent = 'Execute Time';
  tr.appendChild(td);
  td = document.createElement('td');
  td.textContent = (Math.round(totalExecuteNative * 10) / 10) + 'ms';
  tr.appendChild(td);
  td = document.createElement('td');
  td.textContent = (Math.round(totalExecuteSandbox * 10) / 10) + 'ms';
  tr.appendChild(td);
  timesBody.appendChild(tr);
  
  tr = document.createElement('tr');
  td = document.createElement('td');
  td.textContent = 'Total Time';
  tr.appendChild(td);
  td = document.createElement('td');
  td.textContent = (Math.round((totalCompileNative + totalExecuteNative) * 10) / 10) + 'ms';
  tr.appendChild(td);
  td = document.createElement('td');
  td.textContent = (Math.round((totalCompileSandbox + totalExecuteSandbox) * 10) / 10) + 'ms';
  tr.appendChild(td);
  timesBody.appendChild(tr);
  
  (async () => {
    // const code = await (await fetch('https://cdn.jsdelivr.net/npm/mathjs@7.5.1/dist/math.js')).text();
    // const code = await (await fetch('https://code.jquery.com/jquery-3.5.1.min.js')).text();
    // const code = await (await fetch('https://code.jquery.com/jquery-3.5.1.js')).text();
    // const code = await (await fetch('test/jquery.min.js')).text();
    const code = await (await fetch('https://cdn.jsdelivr.net/npm/lodash@4.17.20/lodash.min.js')).text();
    // const code = "";
    let start = performance.now();
    let chars = [];
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "^^") {
        // chars.push(code[i]);
      }
    }
    console.log('lodash loop', performance.now() - start);
    start = performance.now();
    let error = "";
    try {
      // console.log(Sandbox.audit(code));
      new Sandbox().compile(code, !jit);
    } catch (e) {
      console.error(e);
      error = e.message;
    }
    const slodash = performance.now() - start;
    start = performance.now();
    new Function(code);
    const elodash = performance.now() - start;

    tr = document.createElement('tr');
    td = document.createElement('td');
    td.textContent = 'Lodash.js';
    tr.appendChild(td);
    td = document.createElement('td');
    td.textContent = (Math.round(elodash * 10) / 10) + 'ms';
    tr.appendChild(td);
    td = document.createElement('td');
    td.setAttribute('title', error)
    td.textContent = error && false ? 'Error' : (Math.round(slodash * 10) / 10) + 'ms';
    tr.appendChild(td);
    timesBody.appendChild(tr);
  })();

  const total = totalCompileSandbox + totalCompileNative + totalExecuteSandbox + totalExecuteNative;
  console.log(`Total time: ${total}ms, eval: ${totalCompileNative + totalExecuteNative}ms, sandbox: ${totalCompileSandbox + totalExecuteSandbox}`);
}


const testsPromise =  fetch('test/tests.json').then((res) => res.json());

exec();
document.getElementById('runtime-type').addEventListener('change', exec);
document.getElementById('jit-parsing').addEventListener('change', exec);