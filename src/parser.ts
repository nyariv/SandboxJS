export type LispItem = Lisp|If|KeyVal|SpreadArray|SpreadObject|(LispItem[])|{new(): any }|String|Number|Boolean|null;
export interface ILiteral extends Lisp {
  op: 'literal';
  a: string;
  b: LispItem[];
}

export interface IRegEx {
  regex: string,
  flags: string,
  length: number
}

export interface IConstants {
  strings: string[];
  literals: ILiteral[];
  regexes: IRegEx[];
}

export interface IExecutionTree {
  tree: LispItem[], 
  constants: IConstants
}

type LispCallback = (strings: IConstants, type: string, parts: string, res: string[], expect: string, ctx: {lispTree: LispItem}) => any
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
  constructor(obj: Lisp) {
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

const inlineIfElse =  /^:/;
const space = /^\s/;

let expectTypes: {[type:string]: {types: {[type:string]: RegExp}, next: string[]}} = {
  splitter: {
    types: {
      split: /^(&&|&|\|\||\||<=|>=|<(?!<)|>(?!>)|!==|!=|===|==|\+(?!\+)|\-(?!\-)|<<|>>(?!>)|>>>|instanceof(?![\w\$\_])|in(?![\w\$\_]))(?!\=)/,
      op: /^(\/|\*\*|\*(?!\*)|\%)(?!\=)/,
    },
    next: [
      'modifier',
      'value', 
      'prop', 
      'incrementerBefore',
    ]
  },
  inlineIf: {
    types: {
      inlineIf: /^\?/,
    },
    next: [
      'expEnd'
    ]
  },
  assignment: {
    types: {
      assignModify: /^(\-=|\+=|\/=|\*\*=|\*=|%=|\^=|\&=|\|=|>>>=|>>=|<<=)/,
      assign: /^(=)(?!=)/
    },
    next: [
      'modifier',
      'value', 
      'prop', 
      'incrementerBefore',
    ]
  },
  incrementerBefore: {
    types: {incrementerBefore: /^(\+\+|\-\-)/},
    next: [
      'prop',
    ]
  },
  expEdge: {
    types: {
      call: /^[\(]/,
      incrementerAfter: /^(\+\+|\-\-)/
    },
    next: [
      'splitter',
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
      typeof: /^typeof(?![\w\$\_])/,
      delete: /^delete(?![\w\$\_])/,
    },
    next: [
      'modifier', 
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
      'assignment',
      'expEdge',
      'inlineIf',
      'dot',
      'expEnd'
    ]
  },
  prop: {
    types: {
      prop: /^[a-zA-Z\$\_][a-zA-Z\d\$\_]*/,
    },
    next: [
      'splitter',
      'assignment',
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
      regex: /^\/(\d+)\/r(?![\w\$\_])/,
      boolean: /^(true|false)(?![\w\$\_])/,
      null: /^null(?![\w\$\_])/,
      und: /^undefined(?![\w\$\_])/,
      arrowFunctionSingle: /^(async\s+)?([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*=>\s*({)?/,
      arrowFunction: /^(async\s*)?\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*=>\s*({)?/,
      inlineFunction: /^(async\s+)?function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)?\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
      group: /^\(/,
      NaN: /^NaN(?![\w\$\_])/,
      Infinity: /^Infinity(?![\w\$\_])/,
      void: /^void(?![\w\$\_])\s*/,
      await: /^await(?![\w\$\_])\s*/,
      new: /^new(?![\w\$\_])\s*/,
      throw: /^throw(?![\w\$\_])\s*/
    },
    next: [
      'splitter',
      'expEdge',
      'inlineIf',
      'dot',
      'expEnd'
    ]
  },
  initialize: {
    types: {
      initialize: /^(var|let|const)\s+([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*(=)?/,
      return: /^return(?![\w\$_])/,
    },
    next: [
      'modifier',
      'value', 
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
      'value',
      'prop', 
    ]
  },
  spreadArray: {
    types: {
      spreadArray: /^\.\.\./
    },
    next: [
      'value', 
      'prop', 
    ]
  },
  expEnd: {types: {}, next: []},
  expSingle: {
    types: {
      for: /^(([a-zA-Z\$\_][\w\$\_]*)\s*:)?\s*for\s*\(/,
      do: /^(([a-zA-Z\$\_][\w\$\_]*)\s*:)?\s*do\s*\{/,
      while: /^(([a-zA-Z\$\_][\w\$\_]*)\s*:)?\s*while\s*\(/,
      loopAction: /^(break|continue)(?![\w\$\_])/,
      if: /^if\s*\(/,
      try: /^try\s*{/,
      // block: /^{/,
      function: /^(async\s+)?function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
      switch: /^(([a-zA-Z\$\_][\w\$\_]*)\s*:)?\s*switch\s*\(/,
    },
    next: [
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

const roeCache: WeakMap<IConstants, any> = new WeakMap();
export function restOfExpCached(constants, part:string, quote: string): string {
  return restOfExp(constants, part, [], quote);
  const key = part.substring(0, 100) + ':' + part.length;
  const cache = roeCache.get(constants) || {};
  if (cache[key]) return cache[key];
  roeCache.set(constants, cache);
  cache[key] = restOfExp(constants, part, [], quote);
  return cache[key] = restOfExp(constants, part, [], quote);
}

const okFirstChars = /^[\+\-~ !]/;
const aChar = /^[\w\$]/
export function restOfExp(constants: IConstants, part: string, tests?: RegExp[], quote?: string, firstOpening?: string, closingsTests?: RegExp[], details: {[k: string]: string} = {}) {
  let isStart = true;
  tests = tests || [];
  let escape = false;
  let done = false;
  let lastIsChar = false;
  let currentIsChar = false;
  let word = "";
  let i;
  for (i = 0; i < part.length && !done; i++) {
    let char = part[i];
    lastIsChar = currentIsChar;
    currentIsChar = aChar.test(char);
    if (!currentIsChar && !space.test(char) && !closings[char]) word = "";
    if (currentIsChar && closingsTests) word += char;
    if (quote === '"' || quote === "'" || quote === "`") {
      if (quote === "`" && char === "$" && part[i+1] === "{" && !escape) {
        let skip = restOfExpCached(constants, part.substring(i+2), "{");
        i += skip.length + 2;
      } else if (char === quote && !escape) {
        return part.substring(0, i);
      }
      escape = char === "\\";
    } else if (closings[char]) {
      if (char === firstOpening) {
        done = true;
        break;
      } else {
        let skip = restOfExpCached(constants, part.substring(i+1), char);
        i += skip.length + 1;
        isStart = false;
        if (closingsTests) {
          let sub = part.substring(i);
          for (let test of closingsTests) {
            test.lastIndex = 0;
            const found = test.exec(sub);
            if (!found) continue;
            i += found[1].length - 1;
            details['word'] = word;
            done = true;
            if (done) break;
          }
        }
      }
    } else if (!quote) {
      let sub = part.substring(i);
      if (!lastIsChar || !currentIsChar) {
        for (let test of tests) {
          const found = test.exec(sub);
          if (!found) continue;
          if (closingsTests) {
            i += found[1].length;
          }
          done = true;
          break;
        }
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
  if (quote) {
    throw new SyntaxError("Unclosed '" + quote + "': " + quote + part.substring(0, Math.min(i, 40)));
  }
  return part.substring(0, i);
}
restOfExp.next = [
  'splitter',
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

setLispType(['createArray', 'createObject', 'group', 'arrayProp','call'], (constants, type, part, res, expect, ctx) => {
  let extract = "";
  let arg: string[] = [];
  let end = false;
  let i = 1;
  while (i < part.length && !end) {
    extract = restOfExp(constants, part.substring(i), [
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
  const next = ['value', 'prop', 'modifier', 'incrementerBefore'];
  let l: LispItem;

  let funcFound: RegExpExecArray;
  switch(type) {
    case 'group':
    case 'arrayProp':
      l = lispify(constants, arg.pop());
      break;
    case 'call':
    case 'createArray':
      l = arg.map((e) => lispify(constants, e, [...next, 'spreadArray']));
      break;
    case 'createObject':
      l = arg.map((str) => {
        str = str.trimStart();
        let value;
        let key;
        funcFound = expectTypes.expSingle.types.function.exec('function ' + str);
        if (funcFound) {
          key = funcFound[2].trimStart();
          value = lispify(constants, 'function ' + str.replace(key, ""));
        } else {
          let extract = restOfExp(constants, str, [/^:/]);
          key = lispify(constants, extract, [...next, 'spreadObject']);
          if (key instanceof Lisp && key.op === 'prop') {
            key = key.b;
          }
          if (extract.length === str.length) return key;
          value = lispify(constants, str.substring(extract.length + 1));
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
  ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, new Lisp({
    op: type, 
    a: ctx.lispTree, 
    b: l,
  }));
});

setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete', 'op'], (constants, type, part, res, expect, ctx) => {
  let extract = restOfExp(constants, part.substring(res[0].length), [/^[^\s\.\w\d\$\,]/]);
  ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, new Lisp({
    op: ['positive', 'negative'].includes(type) ? '$' + res[0] : res[0],
    a: ctx.lispTree, 
    b: lispify(constants, extract, expectTypes[expect].next), 
  }));
});

setLispType(['incrementerBefore'], (constants, type, part, res, expect, ctx) => {
  let extract = restOfExp(constants, part.substring(2), [/^[^\s\.\w\d\$]/]);
  ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, new Lisp({
    op: res[0] + "$", 
    a: lispify(constants, extract, expectTypes[expect].next), 
  }));
});

setLispType(['incrementerAfter'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, new Lisp({
    op: "$"  + res[0], 
    a: ctx.lispTree, 
  }));
});

setLispType(['assign', 'assignModify'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: res[0], 
    a: ctx.lispTree,
    b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
  });
});

setLispType(['split'], (constants, type, part, res, expect, ctx) => {
  let extract = restOfExp(part.substring(res[0].length),[
    expectTypes.splitter.types.split,
    expectTypes.inlineIf.types.inlineIf,
    inlineIfElse
  ]);
  ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, new Lisp({
    op: res[0],
    a: ctx.lispTree, 
    b: lispify(constants, extract, expectTypes[expect].next), 
  }));
});

setLispType(['inlineIf'], (constants, type, part, res, expect, ctx) => {
  let found = false;
  let extract = "";
  let quoteCount = 1;
  while(!found && extract.length < part.length) {
    extract += restOfExp(constants, part.substring(extract.length + 1), [
      expectTypes.inlineIf.types.inlineIf,
      inlineIfElse
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
      a: lispifyExpr(constants, extract),
      b: lispifyExpr(constants, part.substring(res[0].length + extract.length + 1))
    })
  });
});

setLispType(['if'], (constants, type, part, res, expect, ctx) => {
  let condition = restOfExp(constants, part.substring(res[0].length), [], "(");
  const isBlock = /^\s*\{/.exec(part.substring(res[0].length + condition.length + 1));
  const startTrue = res[0].length + condition.length + 1 + (isBlock ? isBlock[0].length : 0);
  let trueBlock = restOfExp(constants, part.substring(startTrue), isBlock ? [/^\}/] : [/^else(?!\w\$)/]);
  let elseBlock = "";
  if (startTrue + trueBlock.length + (isBlock ? isBlock[0].length : 0) < part.length) {
    const end = part.substring(startTrue + trueBlock.length + (isBlock ? isBlock[0].length : 0));
    const foundElse = /\s*else(?!\w\$\s)\s*/.exec(end);
    if (foundElse) {
      elseBlock = end.substring(foundElse[0].length);
    }
  }
  
  condition = condition.trim();
  trueBlock = trueBlock.trim();
  elseBlock = elseBlock.trim();
  if (trueBlock[0] === "{") trueBlock = trueBlock.slice(1, -1);
  if (elseBlock[0] === "{") elseBlock = elseBlock.slice(1, -1);
  ctx.lispTree = new Lisp({
    op: 'if',
    a: lispify(constants, condition), 
    b: new If(parse(trueBlock, constants, true).tree, elseBlock ? parse(elseBlock, constants, true).tree : undefined)
  });
});

setLispType(['switch'], (constants, type, part, res, expect, ctx) => {
  const test = restOfExp(constants, part.substring(res[0].length), [], "(");
  let start = part.indexOf("{", res[0].length + test.length + 1);
  if (start === -1) throw new SyntaxError("Invalid switch: " + part);
  let statement = restOfExp(constants, part.substring(start + 1), [], "{");
  let caseFound: RegExpExecArray;
  const caseTest = /^\s*(case\s|default)\s*/;
  let cases: Lisp[] = [];
  let defaultFound = false;
  while(caseFound = caseTest.exec(statement)) {
    if (caseFound[1] === 'default') {
      if (defaultFound) throw new SyntaxError("Only one default switch case allowed:" + statement);
      defaultFound = true;
    }
    let cond = restOfExp(constants, statement.substring(caseFound[0].length), [/^:/]);
    let found = "";
    let i = start = caseFound[0].length + cond.length + 1;
    let exprs = [];
    let empty = restOfExp(constants, statement.substring(i), [caseTest]);
    if (!empty.trim()) {
      exprs = undefined;
      i += empty.length;
    } else {
      while(found = restOfExp(constants, statement.substring(i), [/^;/])) {
        exprs.push(lispifyExpr(constants, found, startingExecpted));
        i += found.length + 1;
        if (caseTest.test(statement.substring(i))) {
          break;
        }
      }
    }
    statement = statement.substring(i);
    cases.push(new Lisp({
      op: "case",
      a: caseFound[1] === "default" ? undefined : lispifyExpr(constants, cond),
      b: exprs
    }));
  }
  ctx.lispTree = new Lisp({
    op: 'switch',
    a: lispify(constants, test),
    b: cases
  });
});

setLispType(['dot', 'prop'], (constants, type, part, res, expect, ctx) => {
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
  ctx.lispTree = lispify(constants, part.substring(index), expectTypes[expect].next, new Lisp({
    op: 'prop', 
    a: ctx.lispTree, 
    b: prop
  }));
});

setLispType(['spreadArray', 'spreadObject', 'return'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: type,
    b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
  });
});


setLispType(['number', 'boolean', 'null'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, JSON.parse(res[0]));
});

const constants = {
  NaN,
  Infinity,
}
setLispType(['und', 'NaN', 'Infinity'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, constants[type]);
});

setLispType(['string', 'literal', 'regex'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, new Lisp({
    op: type,
    b: parseInt(JSON.parse(res[1]), 10),
  }));
});

setLispType(['initialize'], (constants, type, part, res, expect, ctx) => {
  if (!res[3]) {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, new Lisp({
      op: res[1],
      a: res[2]
    }));
  } else {
    ctx.lispTree = new Lisp({
      op: res[1],
      a: res[2],
      b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
    });
  }
});

setLispType(['function', 'inlineFunction', 'arrowFunction', 'arrowFunctionSingle'], (constants, type, part, res, expect, ctx) => {
  const isArrow = type !== 'function' && type !== 'inlineFunction';
  const isReturn = isArrow && !res[res.length - 1];
  const argPos = isArrow ? 2 : 3;
  const isAsync = !!res[1];
  const args: any[] = res[argPos] ? res[argPos].replace(/\s+/g, "").split(/,/g) : [];
  if (!isArrow) {
    args.unshift((res[2] || "").trimStart());
  }
  let ended = false;
  args.forEach((arg) => {
    if (ended) throw new SyntaxError('Rest parameter must be last formal parameter');
    if (arg.startsWith('...')) ended = true;
  });
  args.unshift(isAsync);
  const func = (isReturn ? 'return ' : '') + restOfExp(constants, part.substring(res[0].length), !isReturn ? [/^}/] : [/^[,;\)\}\]]/]);
  ctx.lispTree = lispify(constants, part.substring(res[0].length + func.length + 1), expectTypes[expect].next, new Lisp({
    op: isArrow ? 'arrowFunc' : type,
    a: args,
    b: parse(func, constants, true).tree
  }));
});

const iteratorRegex = /^((let|var|const)\s+[a-zA-Z\$_][a-zA-Z\d\$_]*)\s+(in|of)\s+/
setLispType(['for', 'do', 'while'], (constants, type, part, res, expect, ctx) => {
  let i = part.indexOf("(") + 1;
  let startStep: LispItem = true;
  let startInternal: LispItem[] = [];
  let beforeStep: LispItem = false;
  let checkFirst = true;
  let condition: LispItem;
  let step: LispItem = true;
  let body: string;
  switch (type) {
    case 'while':
      let extract = restOfExpCached(constants, part.substring(i), "(");
      condition = lispifyExpr(constants, extract);
      body = restOfExp(constants, part.substring(i + extract.length + 1)).trim();
      if (body[0] === "{") body = body.slice(1, -1);
      break;
    case 'for':
      let args: string[] = [];
      let extract2 = "";
      for (let k = 0; k < 3; k++)  {
        extract2 = restOfExp(constants, part.substring(i), [/^[;\)]/]);
        args.push(extract2.trim());
        i += extract2.length + 1;
        if (part[i - 1] === ")") break;
      }
      let iterator: RegExpExecArray;
      if (args.length === 1 && (iterator = iteratorRegex.exec(args[0]))) {
        if (iterator[3] === 'of') {
          startInternal = [
            lispify(constants, 'let $$obj = '+ args[0].substring(iterator[0].length), ['initialize']),
            ofStart2, 
            ofStart3
          ];
          condition = ofCondition;
          step = ofStep;
          beforeStep = lispify(constants, iterator[1]  + ' = $$next.value', ['initialize']);
        } else {
          startInternal = [
            lispify(constants, 'let $$obj = '+ args[0].substring(iterator[0].length), ['initialize']),
            inStart2,
            inStart3
          ];
          step = inStep;
          condition = inCondition;
          beforeStep = lispify(constants, iterator[1] + ' = $$keys[$$keyIndex]', ['initialize']);
        }
      } else if (args.length === 3) {
        startStep = lispifyExpr(constants, args.shift(), startingExecpted);
        condition = lispifyExpr(constants, args.shift());
        step = lispifyExpr(constants, args.shift());
      } else {
        throw new SyntaxError("Invalid for loop definition");
      }
      body = restOfExp(constants, part.substring(i)).trim();
      if (body[0] === "{") body = body.slice(1, -1);

      break;
    case 'do':
      checkFirst = false;
      const start = part.indexOf("{") + 1;
      body = restOfExp(constants, part.substring(start), [], "{");
      condition = lispifyExpr(constants, restOfExp(constants, part.substring(part.indexOf("(", start + body.length) + 1), [], "("));
      break;
  }
  ctx.lispTree = new Lisp({
    op: 'loop',
    a: [checkFirst, startInternal, startStep, step, condition, beforeStep],
    b: lispifyBlock(body, constants)
  });
});

  setLispType(['block'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = parse(restOfExp(part.substring(1), [], "{"), constants, true).tree;
  });

  setLispType(['loopAction'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = new Lisp({
      op: 'loopAction',
      a: res[1],
    });
  });

  const catchReg = /^\s*catch\s*(\(\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\))?\s*\{/
  setLispType(['try'], (constants, type, part, res, expect, ctx) => {
    const body = restOfExp(part.substring(res[0].length), [], "{");
    const catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1))
    const exception = catchRes[2];
    const catchBody = restOfExp(part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
    ctx.lispTree = new Lisp({
      op: 'try',
      a: parse(body, constants, true).tree,
      b: [
        exception,
        parse(catchBody, constants, true).tree,
      ]
    });
  });
  setLispType(['void', 'await'], (constants, type, part, res, expect, ctx) => {
    const extract = restOfExp(part.substring(res[0].length), [/^ /]);
    ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, new Lisp({
      op: type,
      a: lispify(constants, extract),
    }));
  });
  setLispType(['new'], (constants, type, part, res, expect, ctx) => {
    let i = res[0].length;
    const obj = restOfExp(part.substring(i), [], undefined, "(");
    i += obj.length + 1;
    const args = [];
    if (part[i - 1] === "(") {
      const argsString = restOfExp(part.substring(i), [], "(");
      i += argsString.length + 1;
      let found;
      let j = 0;
      while(found = restOfExp(argsString.substring(j), [/^,/])) {
        j += found.length + 1;
        args.push(found.trim());
      } 
    }
    ctx.lispTree = lispify(constants, part.substring(i), expectTypes.expEdge.next, new Lisp({
      op: type,
      a: lispify(constants, obj, expectTypes.initialize.next),
      b: args.map((arg) => lispify(constants, arg, expectTypes.initialize.next)),
    }));
  });
});
const startingExecpted = ['initialize', 'expSingle', 'value', 'prop', 'modifier', 'incrementerBefore', 'expEnd'];
let lastType;
function lispify(strings: IConstants, part: string, expected?: string[], lispTree?: LispItem): LispItem {
  expected = expected || expectTypes.initialize.next;
  if (part === undefined) return lispTree;

  part = part.trimStart();

  if (!part.length && !expected.includes('expEnd')) {
    throw new SyntaxError("Unexpected end of expression");
  }

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

const edgesForInsertion = [
  /^([\w\$]|\+\+|\-\-)\s*\r?\n\s*([\w\$\+\-])/,
  /^([^\w\$](return|continue|break|throw))\s*\r?\n\s*[^\s]/
];
const closingsForInsertion = [
  /^([\)\]])\s*\r?\n\s*([\w\$\{\+\-])/,
  /^(\})\s*\r?\n?\s*([\(])/,
  /^(\})\s*(\r?\n)?\s*([\w\[\+\-])/,
];
const closingsNoInsertion = /^(\})\s*(catch|else|while|instanceof)/

export function insertSemicolons(part: string) {
  let rest = part;
  let sub = ""
  let res = [];
  while (sub = restOfExp(rest, edgesForInsertion, undefined, undefined, closingsForInsertion)) {
    res.push(sub);
    if (!closingsNoInsertion.test(rest.substring(sub.length - 1))) {
      res.push(";");
    }
    rest = rest.substring(sub.length);
  }
  res.pop();
  return res.join("");
}

export function checkRegex(str: string): IRegEx | null {
  let i = 1;
  let escape = false;
  let done = false;
  let cancel = false;
  while (i < str.length && !done && !cancel) {
    escape = str[i] === '\\' && !escape;
    done = (str[i] === '/' && !escape);
    cancel = str[i] === '\n';
    i++;
  }
  let after = str.substring(i);
  cancel = (cancel || !done) || /^\s*\d/.test(after);
  if (cancel) return null;
  let flags = /^[a-z]*/.exec(after);

  return {
    regex: str.substring(1, i-1),
    flags: (flags && flags[0]) || "",
    length: i + ((flags && flags[0].length) || 0)
  }
}

export function parse(code: string, constants: IConstants = {strings: [], literals: [], regexes: []}, skipStrings = false): IExecutionTree {
  if (typeof code !== 'string') throw new ParseError(`Cannot parse ${code}`, code);
  // console.log('parse', str);
  let str = code;
  let quote;
  let extract: string[] = [];
  let escape = false;
  let regexFound: IRegEx;
  let comment = "";
  let commentStart = -1;

  let js: (LispItem[])[] = [];
  let currJs: LispItem[] = [];
  if (!skipStrings) {
    let extractSkip = 0;
    for (let i = 0; i < str.length; i++) {
      let char = str[i];
      if (comment) {
        if (char === comment) {
          if (comment === "*" && str[i + 1] ==="/") {
            comment = "";
            i++
          } else if (comment === "\n") {
            comment = "";
          }
          if (!comment) {
            str = str.substring(0, commentStart) + str.substring(i + 1);
            i = commentStart - 1;
          }
        }
      } else {
        if (escape) {
          let len = 1;
          if (char === "$" && quote === '`') {
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
            i += num[0].length;
            len = num[0].length + 1;
          } else if (char === "x") {
            char = String.fromCharCode(parseInt(str.substring(i+1, i+3), 16));
            i += 2;
            len = 1 + 2;
          } else if (char != '`') {
            char = JSON.parse(`"\\${char}"`);
          }
          escape = false;
          extractSkip += 1 + len;
          extract.push(char);
          continue;
        }
        if (char === '$' && quote === '`' && str[i+1] !== '{') {
          extractSkip--;
          char = '$$';
        }
        if (quote === "`" && char === "$" && str[i+1] === "{") {
          let skip = restOfExp(str.substring(i+2), [], "{");
          currJs.push(skip);
          extractSkip += skip.length + 3; 
          extract.push(`\${${currJs.length - 1}}`);
          i += skip.length + 2;
        } else if (!quote && (char === "'"  || char === '"'  || char === '`')) {
          currJs = [];
          extractSkip = 0;
          quote = char;
        } else if (!quote && char === "/" && (str[i+1] === "*" || str[i+1] === "/")) {
          comment = str[i+1] === "*" ? "*" : "\n";
          commentStart = i;
        } else if (!quote && char === '/' && (regexFound = checkRegex(str.substring(i)))) {
          constants.regexes.push(regexFound);
          str = str.substring(0, i) + `/${constants.regexes.length - 1}/r` + str.substring(i + regexFound.length);
        } else if (quote === char) {
          let len;
          if (quote === '`') {
            constants.literals.push({
              op: 'literal',
              a: extract.join(""),
              b: currJs
            });
            js.push(currJs);
            str = str.substring(0, i - extractSkip - 1) + `\`${constants.literals.length - 1}\`` + str.substring(i + 1);
            len = (constants.literals.length - 1).toString().length;
          } else {
            constants.strings.push(extract.join(""));
            str = str.substring(0, i - extractSkip - 1) + `"${constants.strings.length - 1}"` + str.substring(i + 1);
            len = (constants.strings.length - 1).toString().length;
          }
          quote = null;
          i -= extractSkip - len;
          extract = [];
        } else if(quote && char !== "\\") {
          extractSkip += char.length;
          extract.push(char);
        }
        escape = quote && char === "\\";
      }
    }

    js.forEach((j: LispItem[]) => {
      const a = j.map((skip: string) => parse(skip, constants).tree[0])
      j.length = 0;
      j.push(...a);
    });
      
  }

  if (comment) {
    if (comment === "*") {
      throw new SyntaxError(`Unclosed comment '/*': ${str.substring(commentStart)}`)
    } else {
      str = str.substring(0, commentStart);
    }
  }

  let parts = [];
  str = insertSemicolons(str);
  let part: string;
  let pos = 0;
  while ((part = restOfExp(str.substring(pos), [/^;/]))) {
    parts.push(part);
    pos += part.length + 1;
  }
  parts = parts.filter(Boolean);
  const tree = parts.map((str, j) => {
    let subExpressions = [];
    let sub: string;
    let pos = 0;
    while ((sub = restOfExp(str.substring(pos), [/^,/]))) {
      subExpressions.push(sub.trimStart());
      pos += sub.length + 1;
    }
    try {
      if (subExpressions.length === 1) {
        return [lispify(constants, str, startingExecpted)];
      }
      const defined = expectTypes.initialize.types.initialize.exec(subExpressions[0]);
      if (defined) {
        return subExpressions.map((str, i) => lispify(constants, i ? defined[1] + ' ' + str : str, ['initialize']));
      } else {
        const exprs = subExpressions.map((str, i) => lispify(constants, str, i ? expectTypes.initialize.next : startingExecpted));
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
      }
    } catch (e) {
      // throw e;
      throw new ParseError(e.message + ": " + str, str);
    }
  });

  return {tree: tree.flat().filter(Boolean), constants};
}
