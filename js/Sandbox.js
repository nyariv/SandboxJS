const Sandbox = ((global) => {
  function Prop(context, prop, isConst = false, isGlobal = false) {
    this.context = context;
    this.prop = prop;
    this.isConst = isConst;
    this.isGlobal = isGlobal;
  }

  function KeyVal(key, val) {
    this.key = key;
    this.value = val;
  }

  function If(t, f) {
    this.true = t;
    this.false = f;
  }

  function Lisp(obj) {
    this.op = obj.op;
    this.a = obj.a;
    this.b = obj.b;
  }

  class Scope {
    constructor(parent, functionScope = false, vars = {}) {
      this.parent = parent;
      this.const = {};
      this.let = {};
      this.var = !parent ? {} : vars;
      this.globals = !parent ? vars : {};
      this.functionScope = functionScope;
    }

    get(key, functionScope = false) {
      if (!this.parent || !functionScope || this.functionScope) {
        if (!this.parent && key in this.globals.context['global']) {
          return new Prop(this.globals.context['global'], key, false, true);
        }
        if (key in this.const) {
          return new Prop(this.const, key, true);
        }
        if (key in this.var || functionScope) {
          return new Prop(this.var, key);
        }
        if (key in this.let) {
          return new Prop(this.let, key);
        }
        if (!this.parent) {
          return new Prop(undefined, key);
        }
      }
      return this.parent.get(key, functionScope)
    }

    set(key, val) {
      let prop = this.get(key);
      if(prop.context === undefined) {
        throw new Error(`Variable '${key}' was not declared.`)
      }
      if (prop.isConst) {
        throw Error(`Cant assign to const variable '${key}'`);
      }
      if (prop.isGlobal) {
        throw Error(`Cant ovveride global variable '${key}'`);
      }
      prop.context[prop] = val;
      return prop;
    }

    declare(key, type = null, value) {
      let prop = this.get(key, type === 'var');
      if (prop.context === undefined) {
        this[type][key] = value;
      }
      if (!(key in prop.context)) {
        prop.context[key] = value;
      }
      throw Error(`Variable '${key}' already declared`);
    }
  }

  class SandboxGlobal {
    constructor(globals) {
      if (globals === global) return global;
      for (let i in globals) {
        this[i] = globals[i];
      }
    }
  }

  function sandboxFunction(context) {
    return SandboxFunction;
    function SandboxFunction (...params) {
      let code = params.pop();
      let func = context.sandbox.parse(code);
      return function(...args) {
        let vars = {};
        for (let i of params) {
          vars[i] = args.shift();
        }
        vars.this = this;
        scope = new Scope(context.globalScope, false, vars);
        let res = func(scope);
        if (context.options.audit) {
          context.auditReport.globalsAccess = new Set([...context.auditReport.globalsAccess, ...res.audit.globalsAccess]);
          for (let Class in res.audit.prototypeAccess) {
            let add = res.audit.prototypeAccess[Class];
            if (context.auditReport.prototypeAccess[Class.name]) {
              add = new Set([...context.auditReport.prototypeAccess[Class.name], ...add]);
            }
            context.auditReport.prototypeAccess[Class.name] = add;
          }
          return res.res;
        }
        return res;
      };
    }
  }

  let expectTypes = {
    op: {
      types: {op: /^(\/|\*\*|\*|%)/},
      next: [
        'value',
        'prop',
        'exp',
        'modifier',
        'incrementerBefore',
      ]
    },
    splitter: {
      types: {
        split: /^(&&|&|\|\||\||<=|>=|<|>|!==|!=|===|==|##|\+|\-)/,
      },
      next: [
        'value', 
        'prop', 
        'exp', 
        'modifier',
        'incrementerBefore',
      ]
    },
    if: {
      types: {
        if: /^\?/,
        else: /^:/,
      },
      next: [
        'expEnd'
      ]
    },
    assignment: {
      types: {assign: /^(\-=|\+=|=)/},
      next: [
        'value', 
        'prop', 
        'exp', 
        'modifier',
        'incrementerBefore',
      ]
    },
    incrementerBefore: {
      types: {incrementerBefore: /^(\+\+|\-\-)/},
      next: [
        'prop',
      ]
    },
    incrementerAfter: {
      types: {incrementerAfter: /^(\+\+|\-\-)/},
      next: [
        'splitter',
        'op',
        'expEnd'
      ]
    },
    expEdge: {
      types: {
        arrayProp: /^[\[]/,
        call: /^[\(]/,
      },
      next: [
        'splitter',
        'op',
        'expEdge',
        'if',
        'dot',
        'expEnd'
      ]
    },
    modifier: {
      types: {
        not: /^!/,
        inverse: /^~/,
        negative: /^\-/,
        positive: /^\+/,
        typeof: /^#/,
      },
      next: [
        'exp',
        'modifier',
        'value',
        'prop',
        'incrementerBefore',
      ]
    },
    exp: {
      types: {
        createObject: /^\{/,
        createArray: /^\[/,
        group: /^\(/,
      },
      next: [
        'splitter',
        'op',
        'expEdge',
        'if',
        'dot',
        'expEnd'
      ]
    },
    dot: {
      types: {
        dot: /^\./
      },
      next: [
        'splitter',
        'incrementerAfter',
        'assignment',
        'op',
        'expEdge',
        'if',
        'dot',
        'expEnd'
      ]
    },
    prop: {
      types: {
        prop: /^[a-zA-Z\$_][a-zA-Z\d\$_]*/,
      },
      next: [
        'splitter',
        'incrementerAfter',
        'assignment',
        'op',
        'expEdge',
        'if',
        'dot',
        'expEnd'
      ]
    },
    value: {
      types: {
        number: /^\-?\d+(\.\d+)?/,
        string: /^"(\d+)"/,
        literal: /^`(\d+)`/,
        boolean: /^(true|false)(?![\w$_])/,
        null: /^null(?![\w$_])/,
        und: /^undefined(?![\w$_])/,
        NaN: /^NaN(?![\w$_])/,
        Infinity: /^Infinity(?![\w$_])/,
        event: /^event(?![\w$_])/,
      },
      next: [
        'splitter',
        'op',
        'if',
        'dot',
        'expEnd'
      ]
    },
    expEnd: {},
    expStart: {
      types: {
        return: /^\^\^/,
      },
      next: [
        'value', 
        'prop', 
        'exp', 
        'modifier', 
        'incrementerBefore', 
        'expEnd']
    }
  };

  let closings = {
    "(": ")",
    "[": "]",
    "{": "}",
    "'": "'",
    '"': '"',
    "`": "`"
  }
  const restOfExp = (part, tests, quote) => {
    let okFirstChars = /^[\+\-~#!]/;
    let isStart = true;
    tests = tests || [
      expectTypes.op.types.op,
      expectTypes.splitter.types.split,
      expectTypes.if.types.if,
      expectTypes.if.types.else
    ];
    let escape = false;
    let done = false;
    let i;
    for (i = 0; i < part.length && !done; i++) {
      let char = part[i];
      if (quote == '"' || quote === "'" || quote === "`") {
        if (quote === "`" && char === "$" && part[i+1] === "{" && !escape) {
          let skip = restOfExp(part.substring(i+2), [/^}/]);
          i += skip.length + 2;
        } else if (char === quote && !escape) {
          return part.substring(0, i);
        }
        escape = char === "\\";
      } else if (closings[char]) {
        let skip = restOfExp(part.substring(i+1), [new RegExp('^\\' + closings[quote])], char);
        i += skip.length + 1;
        isStart = false;
      } else if (!quote) {
        let sub = part.substring(i);
        tests.forEach((test) => {
          done = done || test.test(sub);
        });
        if (isStart) {
          if (okFirstChars.test(sub)) {
            done = false;
          } else {
            isStart = false;
          }
        }
        if (done) break;
      } else if(char === closings[quote]) {
        return part.substring(0, i);
      }
    }
    return part.substring(0, i);
  }
  restOfExp.next = [
    'splitter',
    'op',
    'expEnd'
  ];
  let ops2 = {
    'prop': (a, b, obj, context, scope) => {
      if (typeof a === 'undefined') {
        let prop = scope.get(b);
        if (prop.context === context.globalProp.context['global']) {
          if (context.options.audit) {
            context.auditReport.globalsAccess.add(b);
          }
          if (context.globalProp.context['global'][b] === Function) {
            return sandboxFunction(context);
          }
        }
        if (prop.context && prop.context[b] === global) {
          return context.globalProp;
        }
        return prop;
      }
      let ok = false;
      if(a === null) {
        throw new Error('Cannot get propety of null');
      }
      if(typeof a === 'number') {
        a = new Number(a);
      }
      if(typeof a === 'string') {
        a = new String(a);
      }
      if(typeof a === 'boolean') {
        a = new Boolean(a);
      }

      if (!b in a) {
        return new Prop(undefined, b);
      }

      ok = a.hasOwnProperty(b) || parseInt(b, 10) + "" == b + "";
      if (!ok && context.options.audit) {
        ok = true;
        if (typeof b === 'string') {
          if (!context.auditReport.prototypeAccess[a.constructor.name]) {
            context.auditReport.prototypeAccess[a.constructor.name] = new Set();
          }
          context.auditReport.prototypeAccess[a.constructor.name].add(b);
        }
      }
      if (!ok && context.prototypeWhitelist.has(a.constructor)) {
        let whitelist = (context.prototypeWhitelist.get(a.constructor) || []);
        ok = !whitelist.length || whitelist.includes(b);
      } else if (!ok) {
        context.prototypeWhitelist.forEach((allowedProps, Class) => {
          if(!ok && a instanceof Class) {
            let proto = Class.prototype;
            if (a instanceof Node) {
              ok = ok || b in proto;
            } else {
              ok = ok || (a[b] === proto[b]);
            }
            ok = ok && (!allowedProps || !allowedProps.length || allowedProps.includes(b));
          }
        });
      }
      if (ok) {
        if (a[b] === Function) {
          return sandboxFunction(context);
        }
        if (a[b] === global) {
          return context.globalProp;
        }
        return new Prop(a, b, false, obj.isGlobal);
      }
      throw Error(`Method or property access prevented: ${a.constructor.name}.${b}`);
    },
    'call': (a, b, obj, context, scope) => {
      if (typeof a !== 'function') {
        // if (typeof a === 'undefined') {
        //   return undefined
        // }
        throw new Error(`${obj.prop} is not a function`);
      }
      let regres = /^(bound )*((Function|eval)|(setTimeout|setInterval|setImmediate))$/.exec(a.name)
      if (regres && (regres[3] || (regres[4] && typeof b[0] === 'string'))) {
        let sandbox = new Sandbox(context.globals, context.prototypeWhitelist, context.options);
        if (regres[3] === 'eval') {
          return sandbox.parse(b[0])(scope); 
        }
        if (regres[4] === 'setTimeout') {
          let func = sandbox.parse(b[0]);
          return setTimeout(() => func(scope), b[1]);
        }
        if (regres[4] === 'setImmediate') {
          let func = sandbox.parse(b[0]);
          return setImmediate(() => func(scope));
        }
        if (regres[4] === 'setInterval') {
          let func = sandbox.parse(b[0]);
          return setInterval(() => func(scope), b[1]);
        }
        let sbf = sandboxFunction(context);
        return sbf(...b);
      }
      if (typeof obj === 'function') {
        return obj(...b);
      }
      return obj.context[obj.prop](...b);
    },
    'createObject': (a, b) => {
      let res = {};
      for (let item of b) {
        res[item.key] = item.value;
      }
      return res;
    },
    'keyVal': (a, b) => new KeyVal(a, b),
    'createArray': (a, b, obj, context, scope) => b.map((item) => exec(item, scope, context)),
    'group': (a, b) => b,
    'string': (a, b, obj, context) => context.strings[b],
    'literal': (a, b, obj, context, scope) => {
      return context.literals[b].a.replace(/(\$\$)*(\$)?\${(\d+)}/g, (match, $$, $, num) => {
        if ($) return match;
        return ($$ ? $$ : '') + context.literals[b].b[parseInt(num, 10)](scope).toString().replace(/\$/g, '$$')
      }).replace(/\$\$/g, '$');
    },
    'event': (a, b, obj, context, scope) => {
      let prop = scope.get('event');
      if (prop.context === context.globals) {
        if (context.options.audit) {
          context.auditReport.globalsAccess.add('event');
        }
      }
      return b();
    },
    '!': (a, b) => !b,
    '~': (a, b) => ~b,
    '++$': (a, b, obj) => ++obj.context[obj.prop],
    '$++': (a, b, obj) => obj.context[obj.prop]++,
    '--$': (a, b, obj) => --obj.context[obj.prop],
    '$--': (a, b, obj) => obj.context[obj.prop]--,
    '=': (a, b, obj) => {
      if(obj.context === undefined) {
        throw new Error(`Cannot assign value to undefined.`)
      }
      if (obj.isConst) {
        throw new Error(`Cannot set value to const variable '${obj.prop}'`);
      }
      if (obj.isGlobal) {
        throw Error(`Cant override propetry of global variable '${obj.prop}'`);
      }
      return obj.context[obj.prop] = b
    },
    '+=': (a, b, obj) => obj.context[obj.prop] += b,
    '-=': (a, b, obj) => obj.context[obj.prop] -= b,
    '?': (a, b) => {
      if (!(b instanceof If)) {
        throw new Error('Invalid inline if')
      }
      return a ? b.true : b.false;
    },
    '>': (a, b) => a > b,
    '<': (a, b) => a < b,
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '==': (a, b) => a == b,
    '===': (a, b) => a === b,
    '!=': (a, b) => a != b,
    '!==': (a, b) => a !== b,
    '&&': (a, b) => a && b,
    '||': (a, b) => a || b,
    '&': (a, b) => a & b,
    '|': (a, b) => a | b,
    ':': (a, b) => new If(a, b),
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '$+': (a, b) => +b,
    '$-': (a, b) => -b,
    '/': (a, b) => a / b,
    '*': (a, b) => a * b,
    '%': (a, b) => a % b,
    '/': (a, b) => a / b,
    '#': (a, b) => typeof b,
    '##': (a, b) => a instanceof b,
    'return': (a, b) => b,
  }

  let ops = new Map();
  for (let op in ops2) {
    ops.set(op, ops2[op]);
  }

  let lispTypes = {};
  let setLispType = (types, fn) => {
    types.forEach((type) => {
      lispTypes[type] = fn;
    })
  }

  setLispType(['createArray', 'createObject', 'group', 'arrayProp','call'], (type, part, res, expect, ctx) => {
    let extract = "";
    let closings = {
      'createArray': ']',
      'createObject': '}',
      'group': ')',
      'arrayProp': ']',
      'call': ')'
    }
    let arg = [];
    let end = false;
    let i = 1;
    while (i < part.length && !end) {
      extract = restOfExp(part.substring(i), [
        new RegExp('^\\' + closings[type]),
        /^,/
      ]);
      i += extract.length;
      if (extract) {
        arg.push(extract);
      }
      if (part[i] !== ',') {
        end = true;
      } else {
        i++;
      }
    }
    switch(type) {
      case 'group':
      case 'arrayProp':
        arg = lispify(arg.pop());
        break;
      case 'call':
      case 'createArray':
        arg = arg.map((e) => lispify(e));
        break;
      case 'createObject':
        arg = arg.map((str) => {
          let extract = restOfExp(str, [/^:/]);
          let key = lispify(extract);
          if (key instanceof Lisp && key.op === 'prop') {
            key = key.b;
          }
          let value = lispify(str.substring(extract.length + 1));
          return new Lisp({
            op: 'keyVal',
            a: key,
            b: value
          });
        });
        break;
    }
    type = type == 'arrayProp' ? 'prop' : type;
    ctx.lispTree = lispify(part.substring(i + 1), expectTypes[expect].next, new Lisp({
      op: type, 
      a: ctx.lispTree, 
      b: arg,
    }));
  });
  
  setLispType(['op'], (type, part, res, expect, ctx) => {
    let extract = restOfExp(part.substring(res[0].length));
    ctx.lispTree = new Lisp({
      op: res[0],
      a: ctx.lispTree, 
      b: lispify(extract), 
    });
    ctx.lispTree = lispify(part.substring(extract.length + res[0].length), restOfExp.next, ctx.lispTree);
  });
  setLispType(['inverse', 'not', 'negative', 'positive', 'typeof'], (type, part, res, expect, ctx) => {
    let extract = restOfExp(part.substring(1));
    ctx.lispTree = new Lisp({
      op: ['positive', 'negative'].includes(type) ? '$' + res[0] : res[0],
      a: ctx.lispTree, 
      b: lispify(extract, expectTypes[expect].next), 
    });
    ctx.lispTree = lispify(part.substring(extract.length + 1), restOfExp.next, ctx.lispTree);
  });

  setLispType(['incrementerBefore'], (type, part, res, expect, ctx) => {
    let extract = restOfExp(part.substring(2));
    ctx.lispTree.b = new Lisp({
      op: res[0] + "$", 
      a: lispify(extract, expectTypes[expect].next), 
    })
    ctx.lispTree = lispify(part.substring(extract.length + 2), restOfExp.next, ctx.lispTree);
  });

  setLispType(['incrementerAfter'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, new Lisp({
      op: "$"  + res[0], 
      a: ctx.lispTree, 
    }));
  });

  setLispType(['assign'], (type, part, res, expect, ctx) => {
    ctx.lispTree = new Lisp({
      op: res[0], 
      a: ctx.lispTree,
      b: lispify(part.substring(res[0].length), expectTypes[expect].next)
    });
  });

  setLispType(['split'], (type, part, res, expect, ctx) => {
    let extract = restOfExp(part.substring(res[0].length),[
      expectTypes.splitter.types.split,
      expectTypes.if.types.if,
      expectTypes.if.types.else
    ]);
    ctx.lispTree = new Lisp({
      op: res[0],
      a: ctx.lispTree, 
      b: lispify(extract, expectTypes[expect].next), 
    });
    ctx.lispTree = lispify(part.substring(extract.length + res[0].length), restOfExp.next, ctx.lispTree);
  });

  setLispType(['if'], (type, part, res, expect, ctx) => {
    let found = false;
    let extract = "";
    let quoteCount = 1;
    while(!found && extract.length < part.length) {
      extract += restOfExp(part.substring(extract.length + 1), [
        expectTypes.if.types.if,
        expectTypes.if.types.else
      ]);
      if (part[extract.length + 1] == '?') {
        quoteCount++
      } else {
        quoteCount--
      }
      if (!quoteCount) {
        found = true;
      } else {
        extract += part[extract.length + 1];
      }
    }
    ctx.lispTree = new Lisp({
      op: '?',
      a: ctx.lispTree, 
      b: new Lisp({
        op: ':',
        a: lispify(extract),
        b: lispify(part.substring(res[0].length + extract.length + 1))
      })
    });
  });

  setLispType(['dot', 'prop'], (type, part, res, expect, ctx) => {
    let prop = res[0];
    let index = res[0].length;
    if (res[0] === '.') {
      let matches = part.substring(res[0].length).match(expectTypes.prop.types.prop);
      if (matches.length) {
        prop = matches[0];
        index = prop.length + res[0].length
      } else {
        throw Error('Hanging  dot:' + part);
      }
    }
    ctx.lispTree = lispify(part.substring(index), expectTypes[expect].next, new Lisp({
      op: 'prop', 
      a: ctx.lispTree, 
      b: prop
    }));
  });

  setLispType(['event'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, new Lisp({
      op: type,
      b: () => global.event,
    }));
  });

  setLispType(['number', 'boolean', 'null'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, JSON.parse(res[0]));
  });

  setLispType(['und'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, undefined);
  });

  setLispType(['NaN'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, NaN);
  });

  setLispType(['Infinity'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, Infinity);
  });
  
  setLispType(['string', 'literal'], (type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(part.substring(res[0].length), expectTypes[expect].next, new Lisp({
      op: type,
      b: parseInt(JSON.parse(res[1]), 10),
    }));
  });

  setLispType(['return'], (type, part, res, expect, ctx) => {
    ctx.lispTree = new Lisp({
      op: 'return',
      b: lispify(part.substring(res[0].length), expectTypes[expect].next)
    });
  });
    
  function lispify(part, expected, lispTree) {
    expected = expected || ['expStart', 'value', 'prop', 'exp', 'modifier', 'incrementerBefore', 'expEnd'];
    if (!part.length && !expected.includes('expEnd')) {
      throw new Error("Unexpected end of expression");
    }

    let ctx = {lispTree: lispTree};

    let res;
    expected.forEach((expect) => {
      if (expect === 'expEnd') {
        return;
      }
      for (let type in expectTypes[expect].types) {
        if (res) break;
        if (type === 'expEnd') {
          continue;
        }
        if(res = expectTypes[expect].types[type].exec(part)) {
          lispTypes[type](type, part, res, expect, ctx);
          expected = expectTypes[expect].next;
        }
      }
    });

    if (!res && part.length) {
      throw Error("Unexpected token: " + part);
    }
    return ctx.lispTree;
  }

  function exec(tree, scope, context) {
    if (tree instanceof Prop) {
      return tree.context[tree.prop];
    }
    if (Array.isArray(tree)){
      return tree.map((item) => exec(item, scope, context));
    }
    if (!(tree instanceof Lisp)) {
      return tree;
    }
    let obj = exec(tree.a, scope, context);
    let a = obj instanceof Prop ? (obj.context ? obj.context[obj.prop] : undefined) : obj;
    let bobj = exec(tree.b, scope, context);
    let b = bobj instanceof Prop ? (bobj.context ? bobj.context[bobj.prop] : undefined) : bobj;
    if (ops.has(tree.op)) {
      let res = ops.get(tree.op)(a, b, obj, context, scope);
      return res;
    }
    throw new Error('Unknown operator: ' + tree.op);
  }
  
  let optimizeTypes = {};
  let setOptimizeType = (types, fn) => {
    types.forEach((type) => {
      optimizeTypes[type] = fn;
    })
  }

  setOptimizeType(['>', 
                  '<', 
                  '>=', 
                  '<=', 
                  '==', 
                  '===',
                  '!=', 
                  '!==',
                  '&&', 
                  '||', 
                  '&', 
                  '|',
                  '+', 
                  '-',
                  '/', 
                  '*',
                  '**', 
                  '%', 
                  '/',
                  '$+', 
                  '$-', 
                  '!', 
                  '~',
                  'group'], (tree) => ops.get(tree.op)(tree.a, tree.b));

  setOptimizeType(['string'], (tree, strings) => strings[tree.b]);
  setOptimizeType(['literal'], (tree, strings, literals) => {
    if(!literals[tree.b].b.length) {
      return literals[tree.b].a;
    }
    return tree;
  });
  setOptimizeType(['createArray'], (tree) => {
    if (!tree.b.find((item) => item instanceof Lisp)) {
      return ops.get(tree.op)(tree.a, tree.b);
    }
    return tree;
  });
  setOptimizeType(['prop'], (tree) => {
    if (parseInt(tree.b, 10) + "" == tree.b + "" || typeof tree.b != 'string') {
      return tree.a[tree.b];
    }
    return tree;
  });
  
  function optimize(tree, strings, literals) {
    if (!(tree instanceof Lisp)) {
      if (Array.isArray(tree)) {
        for (let i = 0; i < tree.length; i++) {
          tree[i] = optimize(tree[i], strings, literals);
        }
        return tree;
      }
      return tree;
    } else {
      tree.a = optimize(tree.a, strings, literals);
      tree.b = optimize(tree.b, strings, literals);
    }

    if (!(tree.a instanceof Lisp) && !(tree.b instanceof Lisp) && optimizeTypes[tree.op]) {
      return optimizeTypes[tree.op](tree, strings, literals)
    }
    return tree;
  }

  return class Sandbox {
    constructor(globals = {}, prototypeWhitelist = new Map(), options = {}) {
      let globalProp = new Prop({global: new SandboxGlobal(globals)}, 'global', false, true);
      this.context = {
        sandbox: this,
        globals,
        prototypeWhitelist,
        options,
        globalScope: new Scope(null, true, globalProp),
        globalProp: globalProp,
      };
    }

    static get SAFE_GLOBALS() {
      return {
        Function,
        eval,
        console,
        isFinite,
        isNaN,
        parseFloat,
        parseInt,
        decodeURI,
        decodeURIComponent,
        encodeURI,
        encodeURIComponent,
        escape,
        unescape,
        Boolean,
        Number,
        String,
        Object,
        Array,
        Symbol,
        Error,
        EvalError,
        RangeError,
        ReferenceError,
        SyntaxError,
        TypeError,
        URIError,
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
        Intl,
        JSON,
        Math,
      }
    }

    static get SAFE_PROTOTYPES() {
      let protos = [
        SandboxGlobal,
        Function,
        Boolean,
        Object,
        Number,
        String,
        Date,
        RegExp,
        Error,
        Array,
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float32Array,
        Float64Array,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
      ]
      let map = new Map();
      protos.forEach((proto) => {
        map.set(proto, []);
      });
      return map;
    }

    static audit(str) {
      let allowed = new Map();
      return new Sandbox(global, allowed, {
        audit: true,
      }).parse(str)();
    }
    
    parse(str) {
      // console.log('parse', str);
      let quote;
      let extract = "";
      let escape = false;
      const strings = [];
      let literals = [];
      let contextb = Object.assign({strings, literals}, this.context);
      let js = [];
      let extractSkip = 0;
      for (let i = 0; i < str.length; i++) {
        let char = str[i];

        if (escape) {
          if (char === "$" && quote == '`') {
            char = '$$';
          } else if (char == 'u') {
            let num = /^[a-fA-F\d]{2,4}/.exec(str.substring(i+1));
            if (!num) {
              num = /^{[a-fA-F\d]+}/.exec(str.substring(i+1));
            }
            num = num || [""];
            char = JSON.parse(`"\\u${num[0]}"`);
            str = str.substring(0, i-1) + char + str.substring(i + (1 + num[0].length));
            i -= 1;
          } else if (char != '`') {
            char = JSON.parse(`"\\${char}"`);
          }
        } else if (char === '$' && quote === '`' && str[i+1] !== '{') {
          char = '$$';
        }
        if (quote === "`" && char === "$" && str[i+1] === "{") {
          let skip = restOfExp(str.substring(i+2), [/^}/]);
          js.push(this.parse(skip));
          extractSkip += skip.length + 3; 
          extract += `\${${js.length - 1}}`;
          i += skip.length + 2;
        } else if (!quote && (char == "'"  || char == '"'  || char == '`') && !escape) {
          js = [];
          extractSkip = 0;
          quote = char;
        } else if (quote == char && !escape) {
          let len;
          if (quote === '`') {
            literals.push({
              op: 'literal',
              a: extract,
              b: js
            });
            str = str.substring(0, i - extractSkip - 1) + `\`${literals.length - 1}\`` + str.substring(i + 1);
            len = (literals.length - 1).toString().length;
          } else {
            strings.push(extract);
            str = str.substring(0, i - extract.length - 1) + `"${strings.length - 1}"` + str.substring(i + 1);
            len = (strings.length - 1).toString().length;
          }
          quote = null;
          i -= extract.length - len;
          extract = "";
        } else if(quote && !(!escape && char == "\\")) {
          extractSkip += escape ? 1 + char.length : char.lengt;
          extract += char;
        } 
        escape = quote && !escape && char == "\\";
      }
      
      let parts = str
        .replace(/ instanceof /g, " ## ")
        .replace(/(?:(^|\s))return(?![\w\$_])/g, "^^")
        .replace(/typeof /g, '#').replace(/\s/g, "").split(";");
  
      let execTree = parts.filter((str) => str.length).map((str) => {
        return lispify(str);
      }).map((tree) => optimize(tree, strings, literals));
      // console.log('tree', execTree);
  
  
      return (scope = null)  => {
        if (scope && !(scope instanceof Scope)) {
          scope = new Scope(this.context.globalScope, false, scope);
        } else {
          scope = scope instanceof Scope ? scope : this.context.globalScope;
        }
        let newContext = {};
        if (contextb.options.audit) {
          newContext.auditReport = {
            globalsAccess: new Set(),
            prototypeAccess: {},
          }
        }
        let context = Object.assign(newContext, contextb);
        let returned = false;
        let resIndex = -1;
        let values = execTree.map(tree => {
          if (!returned) {
            resIndex++;
            if (tree instanceof Lisp && tree.a === 'return') {
              returned = true;
            }
            return exec(tree, scope, context);
          }
          return null;
        });
        let res = values[resIndex];
        res =  res instanceof Prop ?res.context[res.prop] : res;
        return context.options.audit ? {audit: context.auditReport, res} : res; 
      }
    };
  }
})(this);

