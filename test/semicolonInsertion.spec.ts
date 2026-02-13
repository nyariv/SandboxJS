import Sandbox from '../src/Sandbox.js';

describe('Semicolon Insertion Tests', () => {
  beforeEach(() => {});

  it('should handle one-line if statement without braces', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

if (false) throw new Error('test')

console.log(2)

console.log(3)
    `;
    const jsExecutor = sandbox.compile(script);

    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3]);
  });

  it('should handle do-while loop correctly', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

do {
  console.log(2)

  break
} while (true)

console.log(3)

console.log(4)
    `;

    const jsExecutor = sandbox.compile(script);

    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4]);
  });

  it('should handle one-line while statement without braces', () => {
    const script = `
console.log(1)

let x = 0
while (x < 1) x++

console.log(2)

console.log(3)
    `;

    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3]);
  });

  it('should handle one-line for statement without braces', () => {
    const script = `
console.log(1)

for (let i = 0; i < 1; i++) console.log('loop')

console.log(2)

console.log(3)
    `;

    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });

    const jsExecutor = sandbox.compile(script);

    jsExecutor({}).run();

    expect(logs).toEqual([1, 'loop', 2, 3]);
  });

  it('should handle nested if statements without braces', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

if (true) 
  if (true) console.log(2)

console.log(3)

if (false) console.log('skip')

console.log(4)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4]);
  });

  it('should handle functions with control flow statements', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

function test() {
  if (true) console.log(2)
  
  console.log(3)
  
  for (let i = 0; i < 2; i++) console.log(4)
  
  console.log(5)
}

test()

console.log(6)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4, 4, 5, 6]);
  });

  it('should handle switch with control flow in cases', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

let x = 2

switch (x) {
  case 1:
    if (true) console.log('a')
    console.log('b')
    break
  case 2:
    console.log(2)
    
    if (true) console.log(3)
    
    console.log(4)
    break
}

console.log(5)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle multiple loops with single-line bodies', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

for (let i = 0; i < 2; i++) console.log(2)

console.log(3)

let j = 0
while (j < 2) j++

console.log(4)

do {
  console.log(5)
  break
} while (true)

console.log(6)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 2, 3, 4, 5, 6]);
  });

  it('should handle complex nested structures', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

if (true) {
  console.log(2)
  
  for (let i = 0; i < 2; i++) {
    if (i === 1) console.log(3)
  }
  
  console.log(4)
}

console.log(5)

function nested() {
  if (false) return
  
  console.log(6)
  
  do {
    console.log(7)
    break
  } while (true)
  
  console.log(8)
}

nested()

console.log(9)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should handle if-else chains without braces', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

let x = 2

if (x === 1) console.log('a')
else if (x === 2) console.log(2)
else console.log('c')

console.log(3)

if (x === 3) console.log('d')
else if (x === 4) console.log('e')

console.log(4)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4]);
  });

  it('should handle try-catch with control flow', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

try {
  console.log(2)
  
  if (false) throw new Error('test')
  
  console.log(3)
} catch (e) {
  console.log('error')
}

console.log(4)

try {
  if (true) throw new Error('test2')
  
  console.log('skip')
} catch (e) {
  console.log(5)
}

console.log(6)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should handle arrow functions with control flow', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

const fn = () => {
  if (true) console.log(2)
  
  console.log(3)
}

fn()

console.log(4)

const arr = [1, 2]
arr.forEach(x => {
  if (x === 2) console.log(5)
})

console.log(6)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should handle deeply nested control structures', () => {
    const logs: any[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(...args) };
    const sandbox = new Sandbox({
      globals: {
        console: mockConsole,
      },
    });
    const script = `
console.log(1)

for (let i = 0; i < 2; i++) {
  if (i === 0) {
    console.log(2)
    
    while (false) console.log('skip')
    
    console.log(3)
  } else {
    for (let j = 0; j < 2; j++) {
      if (j === 1) console.log(4)
    }
    
    console.log(5)
  }
}

console.log(6)

do {
  if (true) {
    console.log(7)
    
    if (false) console.log('skip')
    
    console.log(8)
  }
  break
} while (true)

console.log(9)
    `;
    const jsExecutor = sandbox.compile(script);
    jsExecutor({}).run();

    expect(logs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('should handle multiple do-while loops in sequence', () => {
    const code = `
      let x = 0;
      do {
        x++
      } while (x < 3)
      
      do {
        x++
      } while (x < 6)
      
      return x
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(6);
  });

  test('should handle nested do-while loops', () => {
    const code = `
      let x = 0, y = 0;
      do {
        y = 0;
        do {
          y++
        } while (y < 2)
        x++
      } while (x < 3)
      return x + y
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(5);
  });

  test('should handle do-while with complex preceding code', () => {
    const code = `
      function test() {
        let x = 0;
        if (true) {
          x = 5
        }
        return x
      }
      let y = 0;
      do {
        y++
      } while (y < 2)
      return test() + y
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(7);
  });

  test('should handle do-while inside if without braces', () => {
    const code = `
      let count = 0;
      if (true)
        do {
          count++
        } while (count < 3)
      return count
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(3);
  });

  test('should handle multiple control structures with mixed brace styles', () => {
    const code = `
      let result = 0;
      if (true) {
        result = 1
      }
      
      if (result > 0)
        result = 2
      else
        result = 0
      
      while (result < 5)
        result++
      
      do {
        result++
      } while (result < 10)
      
      return result
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(10);
  });

  test('should handle large script with functions and callbacks', () => {
    const code = `
      // Utility functions at the top
      function add(a, b) {
        return a + b
      }
      
      function multiply(x, y) {
        let result = 0;
        let count = 0;
        do {
          result += x
          count++
        } while (count < y)
        return result
      }
      
      // Main processing function with nested structures
      function processData(data) {
        let total = 0;
        let index = 0;
        
        // Nested callback
        const callback = function(item) {
          if (item > 0)
            return item * 2
          else
            return 0
        }
        
        // Do-while inside function
        do {
          if (data[index]) {
            total += callback(data[index])
          }
          index++
        } while (index < data.length)
        
        return total
      }
      
      // Another function with complex control flow
      function calculate(n) {
        let sum = 0;
        let i = 0;
        
        while (i < n) {
          if (i % 2 === 0)
            sum += i
          else
            sum += i * 2
          i++
        }
        
        // Do-while at the end
        do {
          sum++
        } while (sum < 20)
        
        return sum
      }
      
      // Nested closures
      function outer(x) {
        return function inner(y) {
          let result = x + y;
          
          if (result > 10)
            result = 10
          else if (result > 5)
            result = 5
          else
            result = 0
          
          return result
        }
      }
      
      // Execute everything
      const data = [1, 2, 3, 4, 5];
      let finalResult = 0;
      
      finalResult += processData(data)
      finalResult += calculate(5)
      finalResult += outer(3)(4)
      finalResult += multiply(3, 4)
      
      return finalResult
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    // processData: (1*2 + 2*2 + 3*2 + 4*2 + 5*2) = 30
    // calculate: (0 + 2 + 4 + 2*1 + 2*3) = 14, then incremented to 20
    // outer(3)(4): 7 > 5, so returns 5
    // multiply(3, 4): 12
    // Total: 30 + 20 + 5 + 12 = 67
    expect(result({}).run()).toBe(67);
  });

  test('should handle deeply nested callbacks with do-while', () => {
    const code = `
      function outer() {
        let x = 0;
        
        const middle = function() {
          let y = 0;
          
          const inner = function() {
            let z = 0;
            do {
              z++
            } while (z < 2)
            return z
          }
          
          do {
            y += inner()
          } while (y < 5)
          
          return y
        }
        
        do {
          x += middle()
        } while (x < 10)
        
        return x
      }
      
      return outer()
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(12);
  });

  test('should handle mixed control structures across function boundaries', () => {
    const code = `
      let globalCount = 0;
      
      // Top-level if-else
      if (globalCount < 10)
        globalCount = 10
      
      // Function declaration after control structure
      function looper() {
        return 3
      }
      
      return globalCount + looper()
    `;
    const sandbox = new Sandbox();
    const result = sandbox.compile(code);
    expect(result({}).run()).toBe(13);
  });
});
