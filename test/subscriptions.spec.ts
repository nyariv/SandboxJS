import Sandbox from '../src/Sandbox.js';

describe('Subscription Tests', () => {
  describe('subscribeGet', () => {
    it('should track property access', () => {
      const sandbox = new Sandbox();
      const accesses: Array<{ obj: any; name: string }> = [];
      
      const code = `
        const value = obj.property;
        return value;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { property: 42 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeGet((obj, name) => {
        accesses.push({ obj, name });
      }, context);
      
      const result = run();
      
      expect(result).toBe(42);
      expect(accesses.length).toBeGreaterThan(0);
      expect(accesses.some(a => a.name === 'property')).toBe(true);
    });

    it('should track multiple property accesses', () => {
      const sandbox = new Sandbox();
      const accesses: string[] = [];
      
      const code = `
        const a = obj.x;
        const b = obj.y;
        const c = obj.z;
        return a + b + c;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { x: 1, y: 2, z: 3 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeGet((obj, name) => {
        if (typeof name === 'string') {
          accesses.push(name);
        }
      }, context);
      
      const result = run();
      
      expect(result).toBe(6);
      expect(accesses.filter(a => a === 'x').length).toBeGreaterThan(0);
      expect(accesses.filter(a => a === 'y').length).toBeGreaterThan(0);
      expect(accesses.filter(a => a === 'z').length).toBeGreaterThan(0);
    });

    it('should allow unsubscribing from get events', () => {
      const sandbox = new Sandbox();
      let accessCount = 0;
      
      const code = `
        return obj.value;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 10 } };
      const { context, run } = fn(scope);
      
      const subscription = sandbox.subscribeGet((obj, name) => {
        if (name === 'value') accessCount++;
      }, context);
      
      run();
      const countAfterFirstRun = accessCount;
      
      subscription.unsubscribe();
      
      // Run again in same context
      run();
      
      expect(countAfterFirstRun).toBeGreaterThan(0);
      expect(accessCount).toBe(countAfterFirstRun); // Should not increase after unsubscribe
    });

    it('should track nested property access', () => {
      const sandbox = new Sandbox();
      const accesses: string[] = [];
      
      const code = `
        return obj.nested.deep.value;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { nested: { deep: { value: 99 } } } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeGet((obj, name) => {
        if (typeof name === 'string') {
          accesses.push(name);
        }
      }, context);
      
      const result = run();
      
      expect(result).toBe(99);
      expect(accesses).toContain('nested');
      expect(accesses).toContain('deep');
      expect(accesses).toContain('value');
    });
  });

  describe('subscribeSet', () => {
    it('should track property modification', () => {
      const sandbox = new Sandbox();
      const modifications: string[] = [];
      
      const code = `
        obj.property = 100;
        return obj.property;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { property: 42 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'property', (change) => {
        modifications.push(change.type);
      }, context);
      
      const result = run();
      
      expect(result).toBe(100);
      expect(scope.obj.property).toBe(100);
      expect(modifications.length).toBe(1);
      expect(modifications[0]).toBe('replace');
    });

    it('should track multiple modifications to same property', () => {
      const sandbox = new Sandbox();
      const modifications: string[] = [];
      
      const code = `
        obj.value = 1;
        obj.value = 2;
        obj.value = 3;
        return obj.value;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'value', (change) => {
        modifications.push(change.type);
      }, context);
      
      run();
      
      expect(modifications).toEqual(['replace', 'replace', 'replace']);
    });

    it('should only track specified property', () => {
      const sandbox = new Sandbox();
      let xModifications = 0;
      let yModifications = 0;
      
      const code = `
        obj.x = 10;
        obj.y = 20;
        obj.x = 30;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { x: 0, y: 0 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'x', () => {
        xModifications++;
      }, context);
      
      sandbox.subscribeSet(scope.obj, 'y', () => {
        yModifications++;
      }, context);
      
      run();
      
      expect(xModifications).toBe(2);
      expect(yModifications).toBe(1);
    });

    it('should allow unsubscribing from set events', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.value = 100;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      const { context, run } = fn(scope);
      
      const subscription = sandbox.subscribeSet(scope.obj, 'value', () => {
        modificationCount++;
      }, context);
      
      run();
      expect(modificationCount).toBe(1);
      
      subscription.unsubscribe();
      
      const { context: context2, run: run2 } = fn(scope);
      run2();
      
      expect(modificationCount).toBe(1); // Should not increase after unsubscribe
    });

    it('should track changes to nested objects', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.nested.value = 42;
        return obj.nested.value;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { nested: { value: 0 } } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj.nested, 'value', (change) => {
        modificationCount++;
      }, context);
      
      run();
      
      expect(modificationCount).toBe(1);
      expect(scope.obj.nested.value).toBe(42);
    });

    it('should handle increment operations', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.counter++;
        obj.counter++;
        obj.counter++;
        return obj.counter;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { counter: 0 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'counter', (change) => {
        modificationCount++;
      }, context);
      
      const result = run();
      
      expect(result).toBe(3);
      expect(modificationCount).toBe(3);
    });

    it('should handle compound assignments', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.value += 10;
        obj.value *= 2;
        obj.value -= 5;
        return obj.value;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 5 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'value', (change) => {
        modificationCount++;
      }, context);
      
      run();
      
      expect(scope.obj.value).toBe(25);
      expect(modificationCount).toBe(3);
    });
  });

  describe('subscribeSetGlobal', () => {
    it('should track global property modifications', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.value = 999;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      
      sandbox.subscribeSetGlobal(scope.obj, 'value', (change) => {
        modificationCount++;
      });
      
      fn(scope).run();
      
      expect(modificationCount).toBe(1);
      expect(scope.obj.value).toBe(999);
    });

    it('should persist across multiple executions', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.value++;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      
      sandbox.subscribeSetGlobal(scope.obj, 'value', () => {
        modificationCount++;
      });
      
      fn(scope).run();
      fn(scope).run();
      fn(scope).run();
      
      expect(modificationCount).toBe(3);
    });

    it('should allow unsubscribing from global set events', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.value = 5;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      
      const subscription = sandbox.subscribeSetGlobal(scope.obj, 'value', () => {
        modificationCount++;
      });
      
      fn(scope).run();
      expect(modificationCount).toBe(1);
      
      subscription.unsubscribe();
      fn(scope).run();
      
      expect(modificationCount).toBe(1); // Should not increase
    });

    it('should track modifications to different objects', () => {
      const sandbox = new Sandbox();
      let obj1ModCount = 0;
      let obj2ModCount = 0;
      
      const code = `
        obj1.value = 100;
        obj2.value = 200;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { 
        obj1: { value: 0 },
        obj2: { value: 0 }
      };
      
      sandbox.subscribeSetGlobal(scope.obj1, 'value', (change) => {
        obj1ModCount++;
      });
      
      sandbox.subscribeSetGlobal(scope.obj2, 'value', (change) => {
        obj2ModCount++;
      });
      
      fn(scope).run();
      
      expect(obj1ModCount).toBe(1);
      expect(obj2ModCount).toBe(1);
      expect(scope.obj1.value).toBe(100);
      expect(scope.obj2.value).toBe(200);
    });
  });

  describe('Multiple subscribers', () => {
    it('should notify multiple subscribers for same property', () => {
      const sandbox = new Sandbox();
      let subscriber1Called = 0;
      let subscriber2Called = 0;
      let subscriber3Called = 0;
      
      const code = `
        obj.value = 42;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'value', () => {
        subscriber1Called++;
      }, context);
      
      sandbox.subscribeSet(scope.obj, 'value', () => {
        subscriber2Called++;
      }, context);
      
      sandbox.subscribeSet(scope.obj, 'value', () => {
        subscriber3Called++;
      }, context);
      
      run();
      
      expect(subscriber1Called).toBe(1);
      expect(subscriber2Called).toBe(1);
      expect(subscriber3Called).toBe(1);
    });

    it('should independently unsubscribe multiple subscribers', () => {
      const sandbox = new Sandbox();
      let subscriber1Called = 0;
      let subscriber2Called = 0;
      
      const code = `
        obj.value = 10;
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { value: 0 } };
      const { context, run } = fn(scope);
      
      const sub1 = sandbox.subscribeSet(scope.obj, 'value', () => {
        subscriber1Called++;
      }, context);
      
      const sub2 = sandbox.subscribeSet(scope.obj, 'value', () => {
        subscriber2Called++;
      }, context);
      
      run();
      expect(subscriber1Called).toBe(1);
      expect(subscriber2Called).toBe(1);
      
      sub1.unsubscribe();
      
      // Set a different value to trigger subscription again
      scope.obj.value = 0; // Reset
      run();
      
      expect(subscriber1Called).toBe(1); // Should not increase
      expect(subscriber2Called).toBe(2); // Should increase
    });
  });

  describe('Change notification with object replacement', () => {
    it('should track when property value is an object that gets replaced', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.nested = { x: 1, y: 2 };
        obj.nested = { x: 3, y: 4 };
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { nested: { x: 0, y: 0 } } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'nested', (change) => {
        modificationCount++;
      }, context);
      
      run();
      
      expect(modificationCount).toBe(2);
      expect(scope.obj.nested).toEqual({ x: 3, y: 4 });
    });

    it('should track array modifications', () => {
      const sandbox = new Sandbox();
      let modificationCount = 0;
      
      const code = `
        obj.items = [1, 2, 3];
        obj.items = [4, 5, 6];
      `;
      
      const fn = sandbox.compile(code);
      const scope = { obj: { items: [] as number[] } };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope.obj, 'items', (change) => {
        modificationCount++;
      }, context);
      
      run();
      
      expect(modificationCount).toBe(2);
      expect(scope.obj.items).toEqual([4, 5, 6]);
    });
  });

  describe('Array mutation subscriptions', () => {
    it('should track array push operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.push(4);
        arr.push(5, 6);
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(2);
      expect(changes[0].type).toBe('push');
      expect(changes[0].added).toEqual([4]);
      expect(changes[1].type).toBe('push');
      expect(changes[1].added).toEqual([5, 6]);
      expect(scope.arr).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should track array pop operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.pop();
        arr.pop();
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3, 4, 5] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(2);
      expect(changes[0].type).toBe('pop');
      expect(changes[0].removed).toEqual([5]);
      expect(changes[1].type).toBe('pop');
      expect(changes[1].removed).toEqual([4]);
      expect(scope.arr).toEqual([1, 2, 3]);
    });

    it('should track array shift operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.shift();
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('shift');
      expect(changes[0].removed).toEqual([1]);
      expect(scope.arr).toEqual([2, 3]);
    });

    it('should track array unshift operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.unshift(0);
        arr.unshift(-2, -1);
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(2);
      expect(changes[0].type).toBe('unshift');
      expect(changes[0].added).toEqual([0]);
      expect(changes[1].type).toBe('unshift');
      expect(changes[1].added).toEqual([-2, -1]);
      expect(scope.arr).toEqual([-2, -1, 0, 1, 2, 3]);
    });

    it('should track array splice operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.splice(1, 2, 'a', 'b');
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3, 4, 5] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('splice');
      expect(changes[0].startIndex).toBe(1);
      expect(changes[0].deleteCount).toBe(2);
      expect(changes[0].added).toEqual(['a', 'b']);
      expect(changes[0].removed).toEqual([2, 3]);
      expect(scope.arr).toEqual([1, 'a', 'b', 4, 5]);
    });

    it('should track array reverse operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.reverse();
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3, 4, 5] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('reverse');
      expect(scope.arr).toEqual([5, 4, 3, 2, 1]);
    });

    it('should track array sort operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.sort((a, b) => b - a);
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [3, 1, 4, 1, 5, 9] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('sort');
      expect(scope.arr).toEqual([9, 5, 4, 3, 1, 1]);
    });

    it('should track array copyWithin operations', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.copyWithin(0, 3, 5);
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3, 4, 5] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(1);
      expect(changes[0].type).toBe('copyWithin');
      expect(changes[0].startIndex).toBe(0);
      expect(changes[0].endIndex).toBe(2);
      expect(changes[0].added).toEqual([4, 5]);
      expect(changes[0].removed).toEqual([1, 2]);
      expect(scope.arr).toEqual([4, 5, 3, 4, 5]);
    });

    it('should not trigger change when push adds no elements', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.push();
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [1, 2, 3] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(0);
      expect(scope.arr).toEqual([1, 2, 3]);
    });

    it('should not trigger change when pop on empty array', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.pop();
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [] as number[] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(0);
      expect(scope.arr).toEqual([]);
    });

    it('should not trigger change when reverse on empty array', () => {
      const sandbox = new Sandbox();
      const changes: any[] = [];
      
      const code = `
        arr.reverse();
      `;
      
      const fn = sandbox.compile(code);
      const scope = { arr: [] as number[] };
      const { context, run } = fn(scope);
      
      sandbox.subscribeSet(scope, 'arr', (change) => {
        changes.push(change);
      }, context);
      
      run();
      
      expect(changes.length).toBe(0);
      expect(scope.arr).toEqual([]);
    });
  });
});
