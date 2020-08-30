export type LispItem = IExecutionTree|Lisp|If|KeyVal|SpreadArray|SpreadObject|(LispItem[])|{new(): any }|String|Number|Boolean|null;
export interface ILiteral extends Lisp {
  op: 'literal';
  a: string;
  b: LispItem[];
}

export interface IStringsAndLiterals {
  strings: string[];
  literals: ILiteral[];
}

export interface IExecutionTree extends IStringsAndLiterals {
  tree: LispItem;
}

type LispCallback = (strings: IStringsAndLiterals, type: string, parts: string, res: string[], expect: string, ctx: {lispTree: LispItem}) => any
let lispTypes: Map<string, LispCallback> = new Map();

export class ParseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class Lisp {
  op: string;
  a?: LispItem;
  b?: LispItem;
  constructor (obj: Lisp) {
    this.op = obj.op;
    this.a = obj.a;
    this.b = obj.b;
  }
}

export class If {
  constructor(public t: any, public f: any) {}
}

export class KeyVal {
  constructor(public key: string, public val: any) {}
}

export class SpreadObject {
  constructor(public item: {[key: string]: any}) {}
}

export class SpreadArray {
  constructor(public item: any[]) {}
}


let expectTypes: {[type:string]: {types: {[type:string]: RegExp}, next: string[]}} = {
  op: {
    types: {op: /^(\/|\*\*(?!\=)|\*(?!\=)|\%(?!\=))/},
    next: [
      'void', 
      'value',
      'prop',
      'modifier',
      'incrementerBefore',
    ]
  },
  splitter: {
    types: {
      split: /^(&&|&|\|\||\||<=|>=|<|>|!==|!=|===|==|instanceof(?![\w$_])|in(?![\w$_])|\+(?!\+)|\-(?!\-))(?!\=)/,
    },
    next: [
      'void', 
      'value', 
      'prop', 
      'modifier',
      'incrementerBefore',
    ]
  },
  inlineIf: {
    types: {
      inlineIf: /^\?/,
      else: /^:/,
    },
    next: [
      'expEnd'
    ]
  },
  assignment: {
    types: {
      assignModify: /^(\-=|\+=|\/=|\*\*=|\*=|%=|\^=|\&=|\|=)/,
      assign: /^(=)/
    },
    next: [
      'void', 
      'value', 
      'prop', 
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
      call: /^[\(]/,
    },
    next: [
      'splitter',
      'op',
      'expEdge',
      'inlineIf',
      'dot',
      'expEnd'
    ]
  },
  modifier: {
    types: {
      not: /^!/,
      inverse: /^~/,
      negative: /^\-(?!\-)/,
      positive: /^\+(?!\+)/,
      typeof: /^typeof(?![\w$_])/,
      delete: /^delete(?![\w$_])/,
    },
    next: [
      'modifier',
      'void', 
      'value',
      'prop',
      'incrementerBefore',
    ]
  },
  dot: {
    types: {
      arrayProp: /^[\[]/,
      dot: /^\.(?!\.)/
    },
    next: [
      'splitter',
      'incrementerAfter',
      'assignment',
      'op',
      'expEdge',
      'inlineIf',
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
      'inlineIf',
      'dot',
      'expEnd'
    ]
  },
  value: {
    types: {
      createObject: /^\{/,
      createArray: /^\[/,
      number: /^\-?\d+(\.\d+)?/,
      string: /^"(\d+)"/,
      literal: /^`(\d+)`/,
      boolean: /^(true|false)(?![\w$_])/,
      null: /^null(?![\w$_])/,
      und: /^undefined(?![\w$_])/,
      arrowFunctionSingle: /^([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*=>\s*({)?/,
      arrowFunction: /^\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*=>\s*({)?/,
      inlineFunction: /^function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)?\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
      group: /^\(/,
      NaN: /^NaN(?![\w$_])/,
      Infinity: /^Infinity(?![\w$_])/,
    },
    next: [
      'splitter',
      'op',
      'expEdge',
      'inlineIf',
      'dot',
      'expEnd'
    ]
  },
  void: {
    types: {
      void: /^void(?![\w$_])/
    },
    next: [
      'splitter',
      'op',
      'expEdge',
      'inlineIf',
      'dot',
      'expEnd'
    ]
  },
  initialize: {
    types: {
      initialize: /^(var|let|const)\s+([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*(=)?/
    },
    next: [
      'void', 
      'value', 
      'modifier',
      'prop', 
      'incrementerBefore',
      'expEnd'
    ]
  },
  spreadObject: {
    types: {
      spreadObject: /^\.\.\./
    },
    next: [
      'void', 
      'value',
      'prop', 
    ]
  },
  spreadArray: {
    types: {
      spreadArray: /^\.\.\./
    },
    next: [
      'void', 
      'value', 
      'prop', 
    ]
  },
  expEnd: {types: {}, next: []},
  expStart: {
    types: {
      return: /^return(?![\w$_])/,
      for: /^for\s*\(/,
      do: /^do\s*\{/,
      while: /^while\s*\(/,
      loopAction: /^(break|continue)(?![\w$_])/,
      if: /^if\s*\(/,
      try: /^try\s*{/,
      // block: /^{/,
      function: /^function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
    },
    next: [
      'void', 
      'value', 
      'modifier', 
      'prop', 
      'incrementerBefore',
      'expEnd'
    ]
  }
};

let closings: any = {
  "(": ")",
  "[": "]",
  "{": "}",
  "'": "'",
  '"': '"',
  "`": "`"
}

let closingsRegex: any = {
  "(": /^\)/,
  "[": /^\]/,
  "{": /^\}/,
  "'": /^\'/,
  '"': /^\"/,
  "`": /^\`/
}

const okFirstChars = /^[\+\-~ !]/;
const restOfExp = (part: string, tests?: RegExp[], quote?: string) => {
  let isStart = true;
  tests = tests || [
    expectTypes.op.types.op,
    expectTypes.splitter.types.split,
    expectTypes.inlineIf.types.inlineIf,
    expectTypes.inlineIf.types.else
  ];
  let escape = false;
  let done = false;
  let i;
  for (i = 0; i < part.length && !done; i++) {
    let char = part[i];
    if (quote === '"' || quote === "'" || quote === "`") {
      if (quote === "`" && char === "$" && part[i+1] === "{" && !escape) {
        let skip = restOfExp(part.substring(i+2), [closingsRegex['{']]);
        i += skip.length + 2;
      } else if (char === quote && !escape) {
        return part.substring(0, i);
      }
      escape = char === "\\";
    } else if (closings[char]) {
      let skip = restOfExp(part.substring(i+1), [closingsRegex[quote]], char);
      i += skip.length + 1;
      isStart = false;
    } else if (!quote) {
      let sub = part.substring(i);
      for (let test of tests) {
        done = test.test(sub);
        if (done) break;
      }
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
  'expEnd',
  'inlineIf'
];

const setLispType = (types: string[], fn: LispCallback) => {
  types.forEach((type) => {
    lispTypes.set(type, fn);
  })
}

const closingsCreate: {[type:string]: RegExp} = {
  'createArray': /^\]/,
  'createObject': /^\}/,
  'group': /^\)/,
  'arrayProp': /^\]/,
  'call': /^\)/
}

setLispType(['createArray', 'createObject', 'group', 'arrayProp','call'], (strings, type, part, res, expect, ctx) => {
  let extract = "";
  let arg: string[] = [];
  let end = false;
  let i = 1;
  while (i < part.length && !end) {
    extract = restOfExp(part.substring(i), [
      closingsCreate[type],
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
  const next = ['void', 'value', 'prop', 'modifier', 'incrementerBefore'];
  let l: LispItem;

  let funcFound: RegExpExecArray;
  switch(type) {
    case 'group':
    case 'arrayProp':
      l = lispify(strings, arg.pop());
      break;
    case 'call':
    case 'createArray':
      l = arg.map((e) => lispify(strings, e, [...next, 'spreadArray']));
      break;
    case 'createObject':
      l = arg.map((str) => {
        str = str.trimStart();
        let value;
        let key;
        funcFound = expectTypes.expStart.types.function.exec('function ' + str);
        if (funcFound) {
          key = funcFound[1].trimStart();
          value = lispify(strings, 'function ' + str.replace(key, ""));
        } else {
          let extract = restOfExp(str, [/^:/]);
          key = lispify(strings, extract, [...next, 'spreadObject']);
          if (key instanceof Lisp && key.op === 'prop') {
            key = key.b;
          }
          if (extract.length === str.length) return key;
          value = lispify(strings, str.substring(extract.length + 1));
        }
        return new Lisp({
          op: 'keyVal',
          a: key,
          b: value
        });
      })
      break;
  }
  type = type === 'arrayProp' ? 'prop' : type;
  ctx.lispTree = lispify(strings, part.substring(i + 1), expectTypes[expect].next, new Lisp({
    op: type, 
    a: ctx.lispTree, 
    b: l,
  }));
});

setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete', 'op'], (strings, type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(res[0].length));
  ctx.lispTree = lispify(strings, part.substring(extract.length + res[0].length), restOfExp.next, new Lisp({
    op: ['positive', 'negative'].includes(type) ? '$' + res[0] : res[0],
    a: ctx.lispTree, 
    b: lispify(strings, extract, expectTypes[expect].next), 
  }));
});

setLispType(['incrementerBefore'], (strings, type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(2));
  ctx.lispTree = lispify(strings, part.substring(extract.length + 2), restOfExp.next, new Lisp({
    op: res[0] + "$", 
    a: lispify(strings, extract, expectTypes[expect].next), 
  }));
});

setLispType(['incrementerAfter'], (strings, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(strings, part.substring(res[0].length), expectTypes[expect].next, new Lisp({
    op: "$"  + res[0], 
    a: ctx.lispTree, 
  }));
});

setLispType(['assign', 'assignModify'], (strings, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: res[0], 
    a: ctx.lispTree,
    b: lispify(strings, part.substring(res[0].length), expectTypes[expect].next)
  });
});

setLispType(['split'], (strings, type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(res[0].length),[
    expectTypes.splitter.types.split,
    expectTypes.inlineIf.types.inlineIf,
    expectTypes.inlineIf.types.else
  ]);
  ctx.lispTree = lispify(strings, part.substring(extract.length + res[0].length), restOfExp.next, new Lisp({
    op: res[0],
    a: ctx.lispTree, 
    b: lispify(strings, extract, expectTypes[expect].next), 
  }));
});

setLispType(['inlineIf'], (strings, type, part, res, expect, ctx) => {
  let found = false;
  let extract = "";
  let quoteCount = 1;
  while(!found && extract.length < part.length) {
    extract += restOfExp(part.substring(extract.length + 1), [
      expectTypes.inlineIf.types.inlineIf,
      expectTypes.inlineIf.types.else
    ]);
    if (part[extract.length + 1] === '?') {
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
      a: lispify(strings, extract),
      b: lispify(strings, part.substring(res[0].length + extract.length + 1))
    })
  });
});

setLispType(['if'], (strings, type, part, res, expect, ctx) => {
  let condition = restOfExp(part.substring(res[0].length), [/^\)/]);
  let trueBlock = restOfExp(part.substring(res[0].length + condition.length + 1), [/^else(?!=\w\$)/]);
  let elseBlock = part.substring(res[0].length  + condition.length + trueBlock.length + 1 + 4);
  
  condition = condition.trim();
  trueBlock = trueBlock.trim();
  elseBlock = elseBlock.trim();
  if (trueBlock[0] === "{") trueBlock = trueBlock.slice(1, -1);
  if (elseBlock[0] === "{") trueBlock = elseBlock.slice(1, -1);
  ctx.lispTree = new Lisp({
    op: 'if',
    a: lispify(strings, condition), 
    b: new Lisp({
      op: ':',
      a: parse(trueBlock, strings.strings, strings.literals, true),
      b: parse(elseBlock, strings.strings, strings.literals, true)
    })
  });
});

setLispType(['dot', 'prop'], (strings, type, part, res, expect, ctx) => {
  let prop = res[0];
  let index = res[0].length;
  if (res[0] === '.') {
    let matches = part.substring(res[0].length).match(expectTypes.prop.types.prop);
    if (matches.length) {
      prop = matches[0];
      index = prop.length + res[0].length
    } else {
      throw new SyntaxError('Hanging  dot:' + part);
    }
  }
  ctx.lispTree = lispify(strings, part.substring(index), expectTypes[expect].next, new Lisp({
    op: 'prop', 
    a: ctx.lispTree, 
    b: prop
  }));
});

setLispType(['spreadArray', 'spreadObject', 'return'], (strings, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: type,
    b: lispify(strings, part.substring(res[0].length), expectTypes[expect].next)
  });
});


setLispType(['number', 'boolean', 'null'], (strings, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(strings, part.substring(res[0].length), expectTypes[expect].next, JSON.parse(res[0]));
});

const constants = {
  NaN,
  Infinity,
}
setLispType(['und', 'NaN', 'Infinity'], (strings, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(strings, part.substring(res[0].length), expectTypes[expect].next, constants[type]);
});

setLispType(['string', 'literal'], (strings, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(strings, part.substring(res[0].length), expectTypes[expect].next, new Lisp({
    op: type,
    b: parseInt(JSON.parse(res[1]), 10),
  }));
});

setLispType(['initialize'], (strings, type, part, res, expect, ctx) => {
  if (!res[3]) {
    ctx.lispTree = lispify(strings, part.substring(res[0].length), expectTypes[expect].next, new Lisp({
      op: res[1],
      a: res[2]
    }));
  } else {
    ctx.lispTree = new Lisp({
      op: res[1],
      a: res[2],
      b: lispify(strings, part.substring(res[0].length + 1), expectTypes[expect].next)
    });
  }
});

setLispType(['function', 'inlineFunction', 'arrowFunction', 'arrowFunctionSingle'], (strings, type, part, res, expect, ctx) => {
  const isArrow = type !== 'function' && type !== 'inlineFunction';
  const isReturn = isArrow && !res[res.length - 1];
  const argPos = isArrow ? 1 : 2;
  const args: any[] = res[argPos] ? res[argPos].replace(/\s+/g, "").split(/,/g) : [];
  if (!isArrow) {
    args.unshift((res[1] || "").trimStart());
  }
  let ended = false;
  args.forEach((arg) => {
    if (ended) throw new SyntaxError('Rest parameter must be last formal parameter');
    if (arg.startsWith('...')) ended = true;
  });
  const func = (isReturn ? 'return ' : '') + restOfExp(part.substring(res[0].length), !isReturn ? [/^}/] : [/^[,;\)\}\]]/]);
  ctx.lispTree = lispify(strings, part.substring(res[0].length + func.length + 1), expectTypes[expect].next, new Lisp({
    op: isArrow ? 'arrowFunc' : type,
    a: args,
    b: parse(func, strings.strings, strings.literals, true)
  }));
});

const iteratorRegex = /^((let|var|const)\s+[a-zA-Z\$_][a-zA-Z\d\$_]*)\s+(in|of)\s+/
setLispType(['for', 'do', 'while'], (strings, type, part, res, expect, ctx) => {
  let i = part.indexOf("(") + 1;
  let startStep: LispItem = true;
  let beforeStep: LispItem = false;
  let checkFirst = true;
  let condition: LispItem;
  let step: LispItem = true;
  let body: string;
  switch (type) {
    case 'while':
      let extract = restOfExp(part.substring(i), [/^\)/]);
      condition = lispify(strings, extract);
      body = restOfExp(part.substring(i + extract.length + 1)).trim();
      if (body[0] === "{") body = body.slice(1, -1);
      break;
    case 'for':
      let args: string[] = [];
      let extract2 = "";
      for (let k = 0; k < 3; k++)  {
        extract2 = restOfExp(part.substring(i), [/^[;\)]/]);
        args.push(extract2.trim());
        i += extract2.length + 1;
        if (part[i - 1] === ")") break;
      }
      let iterator: RegExpExecArray;
      if (args.length === 1 && (iterator = iteratorRegex.exec(args[0]))) {
        if (iterator[3] === 'of') {
          startStep = [
            lispify(strings, 'let $$obj = '+ args[0].substring(iterator[0].length)),
            lispify(strings, 'let $$iterator = $$obj[Symbol.iterator]()'), 
            lispify(strings, 'let $$next = $$iterator.next()')
          ];
          condition = lispify(strings, 'return !$$next.done');
          step = lispify(strings, '$$next = $$iterator.next()');
          beforeStep = lispify(strings, iterator[1]  + ' = $$next.value');
        } else {
          startStep = [
            lispify(strings, 'let $$obj = '+ args[0].substring(iterator[0].length)),
            lispify(strings, 'let $$keys = Object.keys($$obj)' ),
            lispify(strings, 'let $$keyIndex = 0')
          ];
          step = lispify(strings, '$$keyIndex++');
          condition = lispify(strings, 'return $$keyIndex < $$keys.length');
          beforeStep = lispify(strings, iterator[1] + ' = $$keys[$$keyIndex]')
        }
      } else if (args.length === 3) {
        startStep = lispify(strings, args.shift());
        condition = lispify(strings, 'return ' + args.shift());
        step = lispify(strings, args.shift());
      } else {
        throw new SyntaxError("Invalid for loop definition")
      }
      body = restOfExp(part.substring(i)).trim();
      if (body[0] === "{") body = body.slice(1, -1);

      break;
    case 'do':
      checkFirst = false;
      const start = part.indexOf("{") + 1;
      let extract3 = restOfExp(part.substring(start), [/^}/]);
      body = extract3;
      condition = lispify(strings, restOfExp(part.substring(part.indexOf("(", start + extract3.length) + 1), [/^\)/]));
      break;
  }
  ctx.lispTree = new Lisp({
    op: 'loop',
    a: [checkFirst, startStep, step, condition, beforeStep],
    b: parse(body, strings.strings, strings.literals, true)
  });

  setLispType(['block'], (strings, type, part, res, expect, ctx) => {
    ctx.lispTree = parse(restOfExp(part.substring(1), [/^}/]), strings.strings, strings.literals, true);
  });

  setLispType(['loopAction'], (strings, type, part, res, expect, ctx) => {
    ctx.lispTree = new Lisp({
      op: 'loopAction',
      a: res[1],
    });
  });

  const catchReg = /^\s*catch\s*(\(\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\))?\s*\{/
  setLispType(['try'], (strings, type, part, res, expect, ctx) => {
    const body = restOfExp(part.substring(res[0].length), [/^}/]);
    const catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1))
    const exception = catchRes[2];
    const catchBody = restOfExp(part.substring(res[0].length + body.length + 1 + catchRes[0].length) , [/^}/]);
    ctx.lispTree = new Lisp({
      op: 'try',
      a: parse(body, strings.strings, strings.literals, true),
      b: [
        exception,
        parse(catchBody, strings.strings, strings.literals, true),
      ]
    });
  });
  const voidNextReg = expectTypes['void'].next.map((ex) => Object.values(expectTypes[ex].types)).flat()
  setLispType(['void'], (strings, type, part, res, expect, ctx) => {
    const extract = restOfExp(part.substring(res[0].length), voidNextReg);
    ctx.lispTree = lispify(strings, part.substring(res[0].length + extract.length), expectTypes[expect].next, new Lisp({
      op: 'void',
      a: lispify(strings, extract),
    }));
  });
});

let lastType;
function lispify(strings: IStringsAndLiterals, part: string, expected?: string[], lispTree?: LispItem): LispItem {
  expected = expected || ['initialize', 'expStart', 'void', 'value', 'prop', 'modifier', 'incrementerBefore', 'expEnd'];
  if (part === undefined) return lispTree;
  if (!part.length && !expected.includes('expEnd')) {
    throw new SyntaxError("Unexpected end of expression");
  }

  part = part.trimStart();

  let ctx = {lispTree: lispTree};

  let res: any;
  for (let expect of expected) {
    if (expect === 'expEnd') {
      continue;
    }
    for (let type in expectTypes[expect].types) {
      if (type === 'expEnd') {
        continue;
      }
      if(res = expectTypes[expect].types[type].exec(part)) {
        lastType = type;
        lispTypes.get(type)(strings, type, part, res, expect, ctx);
        break;
      }
    }
    if (res) break; 
  }

  if (!res && part.length) {
    throw SyntaxError(`Unexpected token (${lastType}): ${part}`);
  }
  return ctx.lispTree;
}

export function parse(code: string, strings: string[] = [], literals: ILiteral[] = [], skipStrings = false): IExecutionTree {
  if (typeof code !== 'string') throw new ParseError(`Cannot parse ${code}`, code);
  // console.log('parse', str);
  let str = code;
  let quote;
  let extract = "";
  let escape = false;
  
  let js: (LispItem[])[] = [];
  let currJs: LispItem[] = [];
  if (!skipStrings) {
    let extractSkip = 0;
    for (let i = 0; i < str.length; i++) {
      let char = str[i];

      if (escape) {
        if (char === "$" && quote === '`') {
          extractSkip--;
          char = '$$';
        } else if (char === 'u') {
          let reg = /^[a-fA-F\d]{2,4}/.exec(str.substring(i+1));
          let num;
          if (!reg) {
            num = Array.from(/^{[a-fA-F\d]+}/.exec(str.substring(i+1)) || [""]);
          } else {
            num = Array.from(reg);
          }
          char = JSON.parse(`"\\u${num[0]}"`);
          str = str.substring(0, i-1) + char + str.substring(i + (1 + num[0].length));
          i -= 1;
        } else if (char != '`') {
          char = JSON.parse(`"\\${char}"`);
        }
      } else if (char === '$' && quote === '`' && str[i+1] !== '{') {
        extractSkip--;
        char = '$$';
      }
      if (quote === "`" && char === "$" && str[i+1] === "{") {
        let skip = restOfExp(str.substring(i+2), [/^}/]);
        currJs.push(skip);
        extractSkip += skip.length + 3; 
        extract += `\${${currJs.length - 1}}`;
        i += skip.length + 2;
      } else if (!quote && (char === "'"  || char === '"'  || char === '`') && !escape) {
        currJs = [];
        extractSkip = 0;
        quote = char;
      } else if (quote === char && !escape) {
        let len;
        if (quote === '`') {
          literals.push({
            op: 'literal',
            a: extract,
            b: currJs
          });
          js.push(currJs);
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
      } else if(quote && !(!escape && char === "\\")) {
        extractSkip += escape ? 1 + char.length : char.length;
        extract += char;
      } 
      escape = quote && !escape && char === "\\";
    }

    js.forEach((j: LispItem[]) => {
      const a = j.map((skip: string) => parse(skip, strings, literals).tree[0])
      j.length = 0;
      j.push(...a);
    });
      
  }
  let parts = [];
  let part: string;
  let pos = 0;
  while ((part = restOfExp(str.substring(pos), [/^;/]))) {
    parts.push(part);
    pos += part.length + 1;
  }
  parts = parts.filter(Boolean);
  const tree = parts.filter((str) => str.length).map((str) => {
    let subExpressions = [];
    let sub: string;
    let pos = 0;
    while ((sub = restOfExp(str.substring(pos), [/^,/]))) {
      subExpressions.push(sub);
      pos += sub.length + 1;
    }
    try {
      const exprs = subExpressions.map((str) => lispify({strings, literals}, str));
      if (exprs.length > 1 && exprs[0] instanceof Lisp) {
        if (exprs[0].op === 'return') {
          const last = exprs.pop();
          return [(exprs.shift() as Lisp).b, ...exprs, new Lisp({
            op: 'return',
            b: last
          })]
        }
      }
      return exprs;
    } catch (e) {
      // throw e;
      throw new ParseError(e.message + ": " + str, str);
    }
  });

  return {tree: tree.flat(), strings, literals};
}