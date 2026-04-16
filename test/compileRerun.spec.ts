import Sandbox from '../src/Sandbox.js';

describe('Compiled code rerun', () => {
  it('should correctly rerun compiled code with named function declarations', () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compile<number>('function double(x) { return x * 2; } return double(21);');
    expect(exec({}).run()).toBe(42);
    expect(exec({}).run()).toBe(42);
  });

  it('should correctly rerun compiled code with recursive functions', () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compile<number>(`
      function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }
      return fact(5);
    `);
    expect(exec({}).run()).toBe(120);
    expect(exec({}).run()).toBe(120);
  });

  it('should correctly rerun compiled code with constructor functions', () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compile<number>(`
      function Point(x, y) { this.x = x; this.y = y; }
      const p = new Point(3, 4);
      return p.x + p.y;
    `);
    expect(exec({}).run()).toBe(7);
    expect(exec({}).run()).toBe(7);
  });

  it('should correctly rerun compiled code with multiple function declarations', () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compile<number>(`
      function LinkedListNode(value) {
        this.value = value;
        this.next = null;
      }
      function reverse(head) {
        if (!head || !head.next) return head;
        let tmp = reverse(head.next);
        head.next.next = head;
        head.next = undefined;
        return tmp;
      }
      const root = new LinkedListNode(0);
      let current = root;
      for (let i = 1; i < 5; i++) {
        const node = new LinkedListNode(i);
        current.next = node;
        current = node;
      }
      return reverse(root).value;
    `);
    expect(exec({}).run()).toBe(4);
    expect(exec({}).run()).toBe(4);
  });

  it('should correctly rerun compiled async code with named function declarations', async () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compileAsync<number>(`
      async function add(a, b) { return a + b; }
      return add(1, 2);
    `);
    expect(await exec({}).run()).toBe(3);
    expect(await exec({}).run()).toBe(3);
  });

  it('should correctly rerun compiled code with arrow functions', () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compile<number>('const fn = (x) => x + 1; return fn(5);');
    expect(exec({}).run()).toBe(6);
    expect(exec({}).run()).toBe(6);
  });

  it('should correctly rerun compiled code with async arrow functions', async () => {
    const sandbox = new Sandbox();
    const exec = sandbox.compileAsync<number>('const fn = async (x) => x + 1; return fn(5);');
    expect(await exec({}).run()).toBe(6);
    expect(await exec({}).run()).toBe(6);
  });
});
