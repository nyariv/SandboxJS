import { Sandbox } from '../dist/esm/Sandbox.js'
import { Bench } from 'tinybench';
import Table from 'cli-table3';
import chalk from 'chalk';


const bench = new Bench({ name: 'simple benchmark', time: 2000 });

const sandbox = new Sandbox();

const code = `
let a = [1];
let count = 1000;
while(count--) {
  a.at(0);
}
return a;
`;

const codeComplex = `
function LinkedListNode(value) {
  this.value = value;
  this.next = null;
}

function reverse(head) {
  let node = head,
    previous,
    tmp;

  while (node) {
    // save next before we overwrite node.next!
    tmp = node.next;

    // reverse pointer
    node.next = previous;

    // step forward in the list
    previous = node;
    node = tmp;
  }

  return previous;
}

function reverse(head) {
  if (!head || !head.next) {
    return head;
  }
  let tmp = reverse(head.next);
  head.next.next = head;
  head.next = undefined;
  return tmp;
}

const root = new LinkedListNode(0);
let current = root;
for (let i = 1; i < 100; i++) {
  const node = new LinkedListNode(i);
  current.next = node;
  current = node;
}

reverse(root);
`;

const ciMultiplier = process.env.CI ? 1 : 1;

const tests = [
  {
    name: '1k loop',
    code,
    max: Math.round(2.950 * ciMultiplier * 1000)/1000
  },
  {
    name: 'reverse linked list',
    code: codeComplex,
    max: Math.round(1.750 * ciMultiplier * 1000)/1000
  }
];

// const exec = sandbox.compile(codeComplex);
// exec({}).run();


const passes = (bool) => bool ? chalk.green('PASS') : chalk.red('FAIL');
const tpColor = (max, tp) => {
  const ratio = max / tp;
  return ratio < .99 ? chalk.red(tp) : ratio < 1.1 ? chalk.yellow(tp) : ratio < 1.3 ? chalk.green(tp) : chalk.blue(tp);
}

(async () => {
  for (const test of tests) {
    const exec = sandbox.compile(test.code);
    bench.add(test.name, () => exec({}).run());
  }
  const start = performance.now();
  await bench.run();
  const duration = Math.round((performance.now() - start)/100)/10;

  const output = bench.results.map((res, i) => {
    const test = tests[i];
    if (res.state !== 'completed') return [bench.tasks[i].name, '-', '-', '-', '-'];
    const tp = Math.round(res.latency.p50*1000)/1000;
    const exec = sandbox.compile(test.code)({});
    exec.context.ctx.ticks.ticks = 0n;
    exec.run();
    return Object.values({
      name: bench.tasks[i].name,
      latency: tpColor(test.max, tp),
      maximum: tests[i].max.toString(),
      ticks: exec.context.ctx.ticks.ticks,
      passes: passes(test.max / .99 > tp)
    })
  })
  

  const table = new Table({
    head: ['name', 'latency (ms)', 'maximum (ms)', 'ticks', 'result'],
    style: {
      head: []
    }
  })
  // console.log(bench.results)
  table.push(...output);
  // console.table(bench.table());
  console.log(table.toString());
  console.log(`ran for ${duration}s`);

  let fail = false;
  for (const i in bench.results) {
    const res = bench.results[i];
    const test = tests[i];
    if (res.state === 'errored') {
      console.error(chalk.red(`ERROR: ${test.name} - ${res.error}`));
      fail = true;
    }
    if (res.state !== 'completed') continue;
    
    if (res.latency.p50 > test.max / .99) {
      console.error(chalk.red(`FAILED: ${test.name} (${(res.latency.p50 / test.max * 100).toFixed(2)}%)`));
      fail = true;
    }
  }
  if (fail) process.exit(1);
})();
