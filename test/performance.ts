import { Sandbox } from '../dist/esm/Sandbox.js';
import { Bench } from 'tinybench';

const bench = new Bench({ name: 'simple benchmark', time: 8000 });

const sandbox = new Sandbox();

const code = `
let a = [1];
let count = 1000;
while(count--) {
  a.at(0);
}
return a;
`;

(async () => {
  const exec = sandbox.compile(code);
  const evall = new Function(code);
  bench.add('1k loop - eval', () => evall()).add('1k loop', () => exec({}).run());

  await bench.run();

  console.table(bench.table());
})();
