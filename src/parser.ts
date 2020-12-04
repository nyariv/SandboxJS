import unraw from "./unraw.js";
export type LispArray = Array<LispItem>&{lisp: boolean}
export type LispItem = Lisp|If|KeyVal|SpreadArray|SpreadObject|(LispArray)|{new(): any }|(new (...args: any[]) => any)|String|Number|Boolean|null|undefined;
export interface ILiteral extends Lisp {
  op: 'literal';
  a: string;
  b: LispArray;
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
  eager: boolean;
}

export interface IExecutionTree {
  tree: LispArray, 
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

export function toLispArray(arr: LispItem[]): LispArray {
  (arr as LispArray).lisp = true;
  return arr as LispArray;
}

const inlineIfElse =  /^:/;
const space = /^\s/;

export let expectTypes: {[type:string]: {types: {[type:string]: RegExp}, next: string[]}} = {
  splitter: {
    types: {
      split: /^(&&|&(?!&)|\|\||\|(?!\|)|<=|>=|<(?!<)|>(?!>)|!==|!=(?!\=)|===|==(?!\=)|\+(?!\+)|\-(?!\-)|\^|<<|>>(?!>)|>>>|instanceof(?![\w\$\_])|in(?![\w\$\_]))(?!\=)/,
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
      inlineIf: /^\?(?!\.)/,
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
      call: /^(\?\.)?[\(]/,
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
      arrayProp: /^(\?\.)?\[/,
      dot: /^(\?)?\.(?!\()/,
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
      number: /^(0x[\da-f]+|\d+(\.\d+)?(e[\+\-]?\d+)?)(?![\d])/i,
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
      return: /^return(?![\w\$\_])/,
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

let closings = {
  "(": ")",
  "[": "]",
  "{": "}",
  "'": "'",
  '"': '"',
  "`": "`"
}

const okFirstChars = /^[\+\-~ !]/;
const aChar = /^[\w\$]/
const aNumber = expectTypes.value.types.number;
export function restOfExp(constants: IConstants, 
                          part: string, 
                          tests?: RegExp[], 
                          quote?: string, 
                          firstOpening?: string, 
                          closingsTests?: RegExp[], 
                          details: {[k: string]: string} = {}, 
                          allChars?: boolean) {
  let isStart = true;
  tests = tests || [];
  let escape = false;
  let done = false;
  let lastIsChar = false;
  let currentIsChar = false;
  let lastChar = "";
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
        let skip = restOfExp(constants, part.substring(i+2), [], "{");
        i += skip.length + 2;
      } else if (char === quote && !escape) {
        return part.substring(0, i);
      }
      escape = !escape && char === "\\";
    } else if (closings[char]) {
      if (char === firstOpening) {
        done = true;
        break;
      } else {
        let skip = restOfExp(constants, part.substring(i+1), [], char);
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
      let foundNumber: RegExpExecArray;
      if (foundNumber = aNumber.exec(sub)) {
        i += foundNumber[0].length - 1;
        sub = part.substring(i);
      }
      if (allChars || (!lastIsChar || !currentIsChar) && lastChar !== char) {
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
    lastChar = char;
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

export const setLispType = (types: string[], fn: LispCallback) => {
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
  let i = res[0].length;
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
  const next = ['value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];
  let l: LispItem;

  let funcFound: RegExpExecArray;
  switch(type) {
    case 'group':
    case 'arrayProp':
      l = lispifyExpr(constants, arg.join(","));
      break;
    case 'call':
    case 'createArray':
      // @TODO: support 'empty' values
      l = toLispArray(arg.map((e) => lispify(constants, e, [...next, 'spreadArray'])));
      break;
    case 'createObject':
      l = toLispArray(arg.map((str) => {
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
      }));
      break;
  }
  type = type === 'arrayProp' ? (res[1] ? '?prop' : 'prop') : (type === 'call' ? (res[1] ? '?call' : 'call') : type);
  ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, new Lisp({
    op: type, 
    a: ctx.lispTree, 
    b: l,
  }));
});

setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete', 'op'], (constants, type, part, res, expect, ctx) => {
  let extract = restOfExp(constants, part.substring(res[0].length), [/^[^\s\.\w\d\$]/]);
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
  let extract = restOfExp(constants, part.substring(res[0].length),[
    expectTypes.splitter.types.split,
    expectTypes.inlineIf.types.inlineIf,
    inlineIfElse
  ]);
  ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length).trim(), restOfExp.next, new Lisp({
    op: res[0].trim(),
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
    a: lispifyExpr(constants, condition), 
    b: new If(lispifyBlock(trueBlock, constants), elseBlock ? lispifyBlock(elseBlock, constants) : undefined)
  });
});

setLispType(['switch'], (constants, type, part, res, expect, ctx) => {
  const test = restOfExp(constants, part.substring(res[0].length), [], "(");
  let start = part.indexOf("{", res[0].length + test.length + 1);
  if (start === -1) throw new SyntaxError("Invalid switch: " + part);
  let statement = insertSemicolons(constants, restOfExp(constants, part.substring(start + 1), [], "{"), false);
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
    let bracketFound = /^\s*\{/.exec(statement.substring(i));
    let exprs = [];
    if (bracketFound) {
      i += bracketFound[0].length;
      found = restOfExp(constants, statement.substring(i), [], "{");
      i += found.length + 1;
      exprs = lispifyBlock(found, constants);
    } else {
      let notEmpty = restOfExp(constants, statement.substring(i), [caseTest]);
      if (!notEmpty.trim()) {
        exprs = undefined;
        i += notEmpty.length;
      } else {
        let lines = [];
        while(found = restOfExp(constants, statement.substring(i), [/^;/])) {
          lines.push(found);
          i += found.length + 1;
          if (caseTest.test(statement.substring(i))) {
            break;
          }
        }
        exprs = lispifyBlock(lines.join(";"), constants);
      }
    }
    statement = statement.substring(i);
    cases.push(new Lisp({
      op: "case",
      a: caseFound[1] === "default" ? undefined : lispifyExpr(constants, cond),
      b: toLispArray(exprs)
    }));
  }
  ctx.lispTree = new Lisp({
    op: 'switch',
    a: lispifyExpr(constants, test),
    b: toLispArray(cases)
  });
});

setLispType(['dot', 'prop'], (constants, type, part, res, expect, ctx) => {
  let prop = res[0];
  let index = res[0].length;
  let op = 'prop';
  if (type === 'dot') {
    if (res[1]) {
      op = '?prop';
    }
    let matches = part.substring(res[0].length).match(expectTypes.prop.types.prop);
    if (matches && matches.length) {
      prop = matches[0];
      index = prop.length + res[0].length
    } else {
      throw new SyntaxError('Hanging  dot:' + part);
    }
  }
  ctx.lispTree = lispify(constants, part.substring(index), expectTypes[expect].next, new Lisp({
    op: op, 
    a: ctx.lispTree, 
    b: prop
  }));
});

setLispType(['spreadArray', 'spreadObject'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: type,
    b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
  });
});

setLispType(['return'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: type,
    b: lispifyExpr(constants, part.substring(res[0].length))
  });
});

const primitives = {
  "true": true,
  "false": false,
  "null": null,
  Infinity,
  NaN,
  "und": undefined
}

setLispType(['number', 'boolean', 'null', 'und', 'NaN', 'Infinity'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, type === "number" ? Number(res[0]) : primitives[type === "boolean" ? res[0] : type]);
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
    a: toLispArray(args),
    b: constants.eager ? lispifyFunction(func, constants) : func
  }));
});

const iteratorRegex = /^((let|var|const)\s+)?\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s+(in|of)\s+/
setLispType(['for', 'do', 'while'], (constants, type, part, res, expect, ctx) => {
  let i = part.indexOf("(") + 1;
  let startStep: LispItem = true;
  let startInternal: LispArray = toLispArray([]);
  let beforeStep: LispItem = false;
  let checkFirst = true;
  let condition: LispItem;
  let step: LispItem = true;
  let body: string;
  switch (type) {
    case 'while':
      let extract = restOfExp(constants, part.substring(i), [], "(");
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
        if (iterator[4] === 'of') {
          startInternal = toLispArray([
            lispify(constants, 'let $$obj = '+ args[0].substring(iterator[0].length), ['initialize']),
            ofStart2, 
            ofStart3
          ]);
          condition = ofCondition;
          step = ofStep;
          beforeStep = lispify(constants, (iterator[1] || 'let ') + iterator[3]  + ' = $$next.value', ['initialize']);
        } else {
          startInternal = toLispArray([
            lispify(constants, 'let $$obj = '+ args[0].substring(iterator[0].length), ['initialize']),
            inStart2,
            inStart3
          ]);
          step = inStep;
          condition = inCondition;
          beforeStep = lispify(constants, (iterator[1] || 'let ') + iterator[3] + ' = $$keys[$$keyIndex]', ['initialize']);
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
  const a = [checkFirst, startInternal, startStep, step, condition, beforeStep] as any;
  a.lisp = true;
  ctx.lispTree = new Lisp({
    op: 'loop',
    a,
    b: lispifyBlock(body, constants)
  });
});

setLispType(['block'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispifyBlock(restOfExp(constants, part.substring(1), [], "{"), constants);
});

setLispType(['loopAction'], (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = new Lisp({
    op: 'loopAction',
    a: res[1],
  });
});

const catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\))?|finally)\s*\{/
setLispType(['try'], (constants, type, part, res, expect, ctx) => {
  const body = restOfExp(constants, part.substring(res[0].length), [], "{");
  let catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1));
  let finallyBody;
  let exception;
  let catchBody;
  let offset = 0;
  if (catchRes[1].startsWith('catch')) {
    catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1));
    exception = catchRes[2];
    catchBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
    offset = res[0].length + body.length + 1 + catchRes[0].length + catchBody.length + 1;
    if ((catchRes = catchReg.exec(part.substring(offset))) && catchRes[1].startsWith('finally')) {
      finallyBody = restOfExp(constants, part.substring(offset + catchRes[0].length), [], "{");
    }
  } else {
    finallyBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
  }
  const b = [
    exception,
    lispifyBlock(insertSemicolons(constants, catchBody || "", false), constants),
    lispifyBlock(insertSemicolons(constants, finallyBody || "", false), constants),
  ] as any;
  b.lisp = true;
  ctx.lispTree = new Lisp({
    op: 'try',
    a: lispifyBlock(insertSemicolons(constants, body, false), constants),
    b
  });
});

setLispType(['void', 'await', 'throw'], (constants, type, part, res, expect, ctx) => {
  const extract = restOfExp(constants, part.substring(res[0].length), [/^[^\s\.\w\d\$]/]);
  ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, new Lisp({
    op: type,
    a: lispify(constants, extract),
  }));
});

setLispType(['new'], (constants, type, part, res, expect, ctx) => {
  let i = res[0].length;
  const obj = restOfExp(constants, part.substring(i), [], undefined, "(");
  i += obj.length + 1;
  const args = [];
  if (part[i - 1] === "(") {
    const argsString = restOfExp(constants, part.substring(i), [], "(");
    i += argsString.length + 1;
    let found;
    let j = 0;
    while(found = restOfExp(constants, argsString.substring(j), [/^,/])) {
      j += found.length + 1;
      args.push(found.trim());
    } 
  }
  ctx.lispTree = lispify(constants, part.substring(i), expectTypes.expEdge.next, new Lisp({
    op: type,
    a: lispify(constants, obj, expectTypes.initialize.next),
    b: toLispArray(args.map((arg) => lispify(constants, arg, expectTypes.initialize.next))),
  }));
});

const ofStart2 = lispify(undefined, 'let $$iterator = $$obj[Symbol.iterator]()', ['initialize']);
const ofStart3 = lispify(undefined, 'let $$next = $$iterator.next()', ['initialize']);
const ofCondition = lispify(undefined, 'return !$$next.done', ['initialize']);
const ofStep = lispify(undefined, '$$next = $$iterator.next()');
const inStart2 = lispify(undefined, 'let $$keys = Object.keys($$obj)', ['initialize']);
const inStart3 = lispify(undefined, 'let $$keyIndex = 0', ['initialize']);
const inStep = lispify(undefined, '$$keyIndex++');
const inCondition = lispify(undefined, 'return $$keyIndex < $$keys.length', ['initialize']);

const startingExecpted = ['initialize', 'expSingle', 'value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];
var lastType;
var lastPart;
// var lastLastPart;
// var lastLastLastPart;
// var lastLastLastLastPart;
function lispify(constants: IConstants, part: string, expected?: string[], lispTree?: LispItem): LispItem {
  expected = expected || expectTypes.initialize.next;
  if (part === undefined) return lispTree;

  part = part.trimStart();

  if (!part.length && !expected.includes('expEnd')) {
    throw new SyntaxError("Unexpected end of expression: " + lastPart);
  }
  
  if (!part) return lispTree;

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
        // lastLastLastLastPart = lastLastLastPart;
        // lastLastLastPart = lastLastPart;
        // lastLastPart = lastPart;
        lastPart = part;
        lispTypes.get(type)(constants, type, part, res, expect, ctx);
        break;
      }
    }
    if (res) break;
  }

  if (!res && part.length) {
    throw SyntaxError(`Unexpected token (${lastType}): ${part.substring(0, 40)}`);
  }
  return ctx.lispTree;
}

function lispifyExpr(constants: IConstants, str: string, expected?: string[]): LispItem {
  if (!str.trim()) return undefined;
  let subExpressions = [];
  let sub: string;
  let pos = 0;
  expected = expected || expectTypes.initialize.next;
  while ((sub = restOfExp(constants, str.substring(pos), [/^,/]))) {
    subExpressions.push(sub.trimStart());
    pos += sub.length + 1;
  }
  if (subExpressions.length === 1) {
    return lispify(constants, str, expected);
  }
  if (expected === startingExecpted) {
    let defined = expectTypes.initialize.types.initialize.exec(subExpressions[0]);
    if (defined) {
      return toLispArray(subExpressions.map((str, i) => lispify(constants, i ? defined[1] + ' ' + str : str, ['initialize'])));
    } else if (expectTypes.initialize.types.return.exec(subExpressions[0])) {
      return lispify(constants, str, expected);
    }
  }
  const exprs = toLispArray(subExpressions.map((str, i) => lispify(constants, str, expected)));
  return new Lisp({op: "multi", a: exprs});
}

export function lispifyBlock(str: string, constants: IConstants): LispArray {
  str = insertSemicolons(constants, str, false);
  if (!str.trim()) return toLispArray([]);
  let parts = [];
  let part: string;
  let pos = 0;
  while ((part = restOfExp(constants, str.substring(pos), [/^;/]))) {
    parts.push(part.trim());
    pos += part.length + 1;
  }
  return toLispArray(parts.filter(Boolean).map((str, j) => {
    return lispifyExpr(constants, str, startingExecpted);
  }).flat());
}

export function lispifyFunction(str: string, constants: IConstants): LispArray {
  if (!str.trim()) return toLispArray([]);
  const tree = lispifyBlock(str, constants);
  let hoisted: LispArray = toLispArray([]);
  hoist(tree, hoisted);
  return toLispArray(hoisted.concat(tree));
}

function hoist(item: LispItem, res: LispArray): boolean {
  if (Array.isArray(item)) {
    const rep = [];
    for (let it of item) {
      if (!hoist(it, res)) {
        rep.push(it);
      }
    }
    if (rep.length !== item.length) {
      item.length = 0;
      item.push(...rep);
    }
  } else if (item instanceof Lisp) {
    if (item.op === "try" || item.op === "if" || item.op === "loop" || item.op === "switch") {
      hoist(item.a, res);
      hoist(item.b, res);
    } else if (item.op === "var") {
      res.push(new Lisp({op: 'var', a: item.a}));
    } else if (item.op === "function" && item.a[1]) {
      res.push(item);
      return true;
    }
  }
  return false;
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
const closingsNoInsertion = /^(\})\s*(catch|finally|else|while|instanceof)(?![\w\$])/
const whileEnding = /^\}\s*while/

export function insertSemicolons(constants: IConstants, part: string, type: boolean) {
  let rest = part;
  let sub = ""
  let res = [];
  let details: any = {};
  while (sub = restOfExp(constants, rest, edgesForInsertion, undefined, undefined, !type ? closingsForInsertion : undefined, details, true)) {
    res.push(sub);
    if (!closingsNoInsertion.test(rest.substring(sub.length - 1))) {
      res.push(";");
    } else if (details.word !== "do" && whileEnding.test(rest.substring(sub.length - 1))) {
      res.push(";");
    }
    rest = rest.substring(sub.length);
  }
  res.pop();
  return res.join("");
}

const oneLinerBlocks = /[^\w\$](if|do)(?![\w\$])/g;
export function convertOneLiners(constants: IConstants, str: string): string {
  let res: RegExpExecArray;
  let lastIndex = 0;
  let parts: Array<string|string[]> = [];
  while (res = oneLinerBlocks.exec(str)) {
    let sub = str.substring(res.index + res[0].length);
    let nextIndex = res.index + res[0].length;
    if (res[1] === 'if') {
      let c = sub.indexOf("(") + 1;
      nextIndex += c
      let condition = restOfExp(constants, sub.substring(c), [], "(");
      oneLinerBlocks.lastIndex = res.index + c + condition.length + 1;
      parts.push(str.substring(lastIndex, nextIndex), [condition], ')');
      nextIndex += condition.length + 1;
    } else {
      parts.push(str.substring(lastIndex, nextIndex));
    }
    const spaceCount = /^\s*/.exec(str.substring(nextIndex));
    nextIndex += spaceCount[0].length;
    sub = str.substring(nextIndex);
    if (sub[0] !== '{') {
      let body = restOfExp(constants, sub, [/^([;\)\]\}]|\r?\n)/]);
      let semi = 0;
      if (sub[body.length] === ";") semi = 1;
      parts.push("{", body, "}");
      let rest = sub.substring(body.length + semi);
      if (res[1] === 'if' && !/^\s*else(?![\w\$])/.test(rest)) {
        parts.push(";");
      }
      lastIndex = nextIndex + body.length + semi;
    } else {
      lastIndex = nextIndex;
    }
  }
  parts.push(str.substring(lastIndex));
  for (let p of parts) {
    if (p instanceof Array) {
      let c = convertOneLiners(constants, p[0]);
      p.length = 0;
      p.push(c)
    }
  }
  return parts.flat().join("");
}

export function checkRegex(str: string): IRegEx | null {
  let i = 1;
  let escape = false;
  let done = false;
  let cancel = false;
  while (i < str.length && !done && !cancel) {
    done = (str[i] === '/' && !escape);
    escape = str[i] === '\\' && !escape;
    cancel = str[i] === '\n';
    i++;
  }
  let after = str.substring(i);
  cancel = (cancel || !done) || /^\s*\d/.test(after);
  if (cancel) return null;
  let flags = /^[a-z]*/.exec(after);
  if(/^\s+[\w\$]/.test(str.substring(i + flags[0].length))) {
    return null;
  }
  return {
    regex: str.substring(1, i-1),
    flags: (flags && flags[0]) || "",
    length: i + ((flags && flags[0].length) || 0)
  }
}

const notDivide = /(typeof|delete|instanceof|return|in|of|throw|new|void|do|if)$/
const possibleDivide = /^([\w\$\]\)]|\+\+|\-\-)[^\w\$\]\)\+\-]/;
export function extractConstants(constants: IConstants, str: string, currentEnclosure = ""): {str: string, length: number} {
  let quote;
  let extract: string[] = [];
  let escape = false;
  let regexFound: IRegEx;
  let comment = "";
  let commentStart = -1;
  let currJs: LispArray = toLispArray([]);
  let char: string = "";
  const strRes: string[] = []
  const enclosures: string[] = [];
  let isPossibleDivide: RegExpExecArray;
  for (var i = 0; i < str.length; i++) {
    char = str[i];
    if (comment) {
      if (char === comment) {
        if (comment === "*" && str[i + 1] ==="/") {
          comment = "";
          i++
        } else if (comment === "\n") {
          comment = "";
        }
      }
    } else {
      if (escape) {
        escape = false;
        extract.push(char);
        continue;
      }

      if (quote) {
        if (quote === "`" && char === "$" && str[i+1] === "{") {
          let skip = extractConstants(constants, str.substring(i+2), "{");
          currJs.push(skip.str);
          extract.push(`\${${currJs.length - 1}}`);
          i += skip.length + 2;
        } else if (quote === char) {
          if (quote === '`') {
            constants.literals.push({
              op: 'literal',
              a:  unraw(extract.join("")),
              b: currJs
            });
            strRes.push(`\`${constants.literals.length - 1}\``);
          } else {
            constants.strings.push(unraw(extract.join("")));
            strRes.push( `"${constants.strings.length - 1}"`);
          }
          quote = null;
          extract = [];
        } else {
          extract.push(char);
        }
      } else {
        if ((char === "'"  || char === '"'  || char === '`')) {
          currJs = toLispArray([]);
          quote = char;
        } else if (closings[currentEnclosure] === char && !enclosures.length) {
          return {str: strRes.join(""), length: i}
        } else if (closings[char]) {
          enclosures.push(char);
          strRes.push(char);
        } else if (closings[enclosures[enclosures.length-1]] === char) {
          enclosures.pop();
          strRes.push(char);
        } else if (char === "/" && (str[i+1] === "*" || str[i+1] === "/")) {
          comment = str[i+1] === "*" ? "*" : "\n";
          commentStart = i;
        } else if (char === '/' && !isPossibleDivide && (regexFound = checkRegex(str.substring(i)))) {
          constants.regexes.push(regexFound);
          strRes.push(`/${constants.regexes.length - 1}/r`);
          i += regexFound.length - 1;
        } else {
          strRes.push(char);
        }

        if (!(isPossibleDivide && space.test(char))) {
          if (isPossibleDivide = possibleDivide.exec(str.substring(i))) {
            if (notDivide.test(str.substring(0, i + isPossibleDivide[1].length))) {
              isPossibleDivide = null;
            }
          }
        }
      }
      escape = quote && char === "\\";
    }
  }

  if (comment) {
    if (comment === "*") {
      throw new SyntaxError(`Unclosed comment '/*': ${str.substring(commentStart)}`)
    }
  }
  return {str: strRes.join(""), length: i}
}
export function parse(code: string, eager = false): IExecutionTree {
  if (typeof code !== 'string') throw new ParseError(`Cannot parse ${code}`, code);
  // console.log('parse', str);
  let str = ' ' + code;
  const constants: IConstants = {strings: [], literals: [], regexes: [], eager};
  str = extractConstants(constants, str).str;
  str = insertSemicolons(constants, str, true);
  str = convertOneLiners(constants, str);
  // console.log(str);

  try {
    for (let l of constants.literals) {
      l.b = toLispArray(l.b.map((js: string) => lispifyExpr(constants, js)));
    }
    return {tree: lispifyFunction(str, constants), constants};
  } catch (e) {
    throw e;
    throw new ParseError(e.message + ": " + str.substring(0, 100) + '...', str);
  }
}
