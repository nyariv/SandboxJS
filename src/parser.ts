import unraw from "./unraw.js";

export const enum LispType {
  None,
  Prop,
  StringIndex,
  Let,
  Const,
  Call,
  KeyVal,
  Number,
  Return,
  Assign,
  InlineFunction,
  ArrowFunction,
  CreateArray,
  If,
  IfCase,
  InlineIf,
  InlineIfCase,
  SpreadObject,
  SpreadArray,
  ArrayProp,
  PropOptional,
  CallOptional,
  CreateObject,
  Group,
  Not,
  IncrementBefore,
  IncrementAfter,
  DecrementBefore,
  DecrementAfter,
  And,
  Or,
  StrictNotEqual,
  StrictEqual,
  Plus,
  Var,
  GlobalSymbol,
  Literal,
  Function,
  Loop,
  Try,
  Switch,
  SwitchCase,
  Block,
  Expression,
  Await,
  New,
  Throw,
  Minus,
  Divide,
  Power,
  Multiply,
  Modulus,
  Equal,
  NotEqual,
  SmallerEqualThan,
  LargerEqualThan,
  SmallerThan,
  LargerThan,
  Negative,
  Positive,
  Typeof,
  Delete,
  Instanceof,
  In,
  Inverse,
  SubractEquals,
  AddEquals,
  DivideEquals,
  PowerEquals,
  MultiplyEquals,
  ModulusEquals,
  BitNegateEquals,
  BitAndEquals,
  BitOrEquals,
  UnsignedShiftRightEquals,
  ShiftRightEquals,
  ShiftLeftEquals,
  BitAnd,
  BitOr,
  BitNegate,
  BitShiftLeft,
  BitShiftRight,
  BitUnsignedShiftRight,
  BigInt,
  LiteralIndex,
  RegexIndex,
  LoopAction,
  Void,
  True,
}

export type DefineLisp<op extends LispType, a extends LispItem|LispItem, b extends LispItem|LispItem> = [op, a, b];

export type ExtractLispOp<L> = L extends DefineLisp<infer i, any, any> ? i : never;
export type ExtractLispA<L> = L extends DefineLisp<any, infer i, any> ? i : never;
export type ExtractLispB<L> = L extends DefineLisp<any, any, infer i> ? i : never;

export type LispItemSingle = LispType.None|LispType.True|string|Lisp;
export type LispItem = LispItemSingle|LispItemSingle[];
export type Lisp = [LispType, LispItem, LispItem];

function createLisp<L extends Lisp>(obj: {op: ExtractLispOp<L>, a: ExtractLispA<L>, b: ExtractLispB<L>}) {
  return [obj.op, obj.a, obj.b] as L;
}

export type Literal = DefineLisp<LispType.Literal, string, Lisp[]> & {tempJsStrings?: string[]}
export type If = DefineLisp<LispType.If, Lisp, IfCase>
export type InlineIf = DefineLisp<LispType.InlineIf, Lisp, InlineIfCase>
export type IfCase = DefineLisp<LispType.IfCase, Lisp[], Lisp[]>
export type InlineIfCase = DefineLisp<LispType.InlineIfCase, Lisp, Lisp>
export type KeyVal = DefineLisp<LispType.KeyVal, string|Lisp, Lisp[]>
export type SpreadObject = DefineLisp<LispType.SpreadObject, LispType.None, Lisp>;
export type SpreadArray = DefineLisp<LispType.SpreadArray, LispType.None, Lisp>;
export type ArrayProp = DefineLisp<LispType.ArrayProp, Lisp, Lisp>;
export type Prop = DefineLisp<LispType.Prop, Lisp, string|Lisp>;
export type PropOptional = DefineLisp<LispType.PropOptional, Lisp, Lisp[]>;
export type Call = DefineLisp<LispType.Call, Lisp, Lisp[]>;
export type CallOptional = DefineLisp<LispType.CallOptional, Lisp, Lisp[]>;
export type CreateArray = DefineLisp<LispType.CreateArray, Lisp, Lisp[]>;
export type CreateObject = DefineLisp<LispType.CreateObject, Lisp, Lisp[]>;
export type Group = DefineLisp<LispType.Group, Lisp, Lisp[]>;
export type Inverse = DefineLisp<LispType.Inverse, Lisp, Lisp>;
export type Not = DefineLisp<LispType.Not, Lisp, Lisp>;
export type Negative = DefineLisp<LispType.Negative, Lisp, Lisp>;
export type Positive = DefineLisp<LispType.Positive, Lisp, Lisp>;
export type Typeof = DefineLisp<LispType.Typeof, Lisp, Lisp>;
export type Delete = DefineLisp<LispType.Delete, Lisp, Lisp>;
export type IncrementBefore = DefineLisp<LispType.IncrementBefore, Lisp, LispType.None>;
export type IncrementAfter = DefineLisp<LispType.IncrementAfter, Lisp, LispType.None>;
export type DecrementBefore = DefineLisp<LispType.DecrementBefore, Lisp, LispType.None>;
export type DecrementAfter = DefineLisp<LispType.DecrementAfter, Lisp, LispType.None>;

export type And = DefineLisp<LispType.And, Lisp, Lisp>;
export type Or = DefineLisp<LispType.Or, Lisp, Lisp>;
export type Instanceof = DefineLisp<LispType.Instanceof, Lisp, Lisp>;
export type In = DefineLisp<LispType.In, Lisp, Lisp>;
export type Assigns = DefineLisp<LispType.Assign, Lisp, Lisp>;
export type SubractEquals = DefineLisp<LispType.SubractEquals, Lisp, Lisp>;
export type AddEquals = DefineLisp<LispType.AddEquals, Lisp, Lisp>;
export type DivideEquals = DefineLisp<LispType.DivideEquals, Lisp, Lisp>;
export type PowerEquals = DefineLisp<LispType.PowerEquals, Lisp, Lisp>;
export type MultiplyEquals = DefineLisp<LispType.MultiplyEquals, Lisp, Lisp>;
export type ModulusEquals = DefineLisp<LispType.ModulusEquals, Lisp, Lisp>;
export type BitNegateEquals = DefineLisp<LispType.BitNegateEquals, Lisp, Lisp>;
export type BitAndEquals = DefineLisp<LispType.BitAndEquals, Lisp, Lisp>;
export type BitOrEquals = DefineLisp<LispType.BitOrEquals, Lisp, Lisp>;
export type UnsignedShiftRightEquals = DefineLisp<LispType.UnsignedShiftRightEquals, Lisp, Lisp>;
export type ShiftLeftEquals = DefineLisp<LispType.ShiftLeftEquals, Lisp, Lisp>;
export type ShiftRightEquals = DefineLisp<LispType.ShiftRightEquals, Lisp, Lisp>;

export type BitAnd = DefineLisp<LispType.BitAnd, Lisp, Lisp>;
export type BitOr = DefineLisp<LispType.BitOr, Lisp, Lisp>;
export type BitNegate = DefineLisp<LispType.BitNegate, Lisp, Lisp>;
export type BitShiftLeft = DefineLisp<LispType.BitShiftLeft, Lisp, Lisp>;
export type BitShiftRight = DefineLisp<LispType.BitShiftRight, Lisp, Lisp>;
export type BitUnsignedShiftRight = DefineLisp<LispType.BitUnsignedShiftRight, Lisp, Lisp>;
export type SmallerEqualThan = DefineLisp<LispType.SmallerEqualThan, Lisp, Lisp>;
export type LargerEqualThan = DefineLisp<LispType.LargerEqualThan, Lisp, Lisp>;
export type SmallerThan = DefineLisp<LispType.SmallerThan, Lisp, Lisp>;
export type LargerThan = DefineLisp<LispType.LargerThan, Lisp, Lisp>;
export type StrictNotEqual = DefineLisp<LispType.StrictNotEqual, Lisp, Lisp>;
export type NotEqual = DefineLisp<LispType.NotEqual, Lisp, Lisp>;
export type StrictEqual = DefineLisp<LispType.StrictEqual, Lisp, Lisp>;
export type Equal = DefineLisp<LispType.Equal, Lisp, Lisp>;
export type Plus = DefineLisp<LispType.Plus, Lisp, Lisp>;
export type Minus = DefineLisp<LispType.Minus, Lisp, Lisp>;
export type Divide = DefineLisp<LispType.Divide, Lisp, Lisp>;
export type Power = DefineLisp<LispType.Power, Lisp, Lisp>;
export type Multiply = DefineLisp<LispType.Multiply, Lisp, Lisp>;
export type Modulus = DefineLisp<LispType.Modulus, Lisp, Lisp>;

export type Block = DefineLisp<LispType.Block, Lisp[], LispType.None>;
export type Expression = DefineLisp<LispType.Expression, Lisp[], LispType.None>;
export type Return = DefineLisp<LispType.Return, LispType.None, Lisp>;
export type Throw = DefineLisp<LispType.Throw, LispType.None, Lisp>;
export type Switch = DefineLisp<LispType.Switch, Lisp, SwitchCase[]>;
export type SwitchCase = DefineLisp<LispType.SwitchCase, LispType.None|Lisp, Lisp[]>;
export type Var = DefineLisp<LispType.Var, string, Lisp|LispType.None>;
export type Let = DefineLisp<LispType.Let, string, Lisp|LispType.None>;
export type Const = DefineLisp<LispType.Const, string, Lisp|LispType.None>;

export type Number = DefineLisp<LispType.Number, LispType.None, string>;
export type BigInt = DefineLisp<LispType.BigInt, LispType.None, string>;
export type GlobalSymbol = DefineLisp<LispType.GlobalSymbol, LispType.None, string>;
export type LiteralIndex = DefineLisp<LispType.LiteralIndex, LispType.None, string>;
export type StringIndex = DefineLisp<LispType.StringIndex, LispType.None, string>;
export type RegexIndex = DefineLisp<LispType.RegexIndex, LispType.None, string>;

export type Function = DefineLisp<LispType.Function, (string|LispType.None|LispType.True)[], string|Lisp[]>;
export type InlineFunction = DefineLisp<LispType.InlineFunction, string[], string|Lisp[]>;
export type ArrowFunction = DefineLisp<LispType.ArrowFunction, string[], string|Lisp[]>;
export type Loop = DefineLisp<LispType.Loop, LispItem, Lisp[]>;
export type LoopAction = DefineLisp<LispType.LoopAction, string, LispType.None>;
export type Try = DefineLisp<LispType.Try, Lisp[], LispItem>;

export type Void = DefineLisp<LispType.Void, Lisp, LispType.None>;
export type Await = DefineLisp<LispType.Await, Lisp, LispType.None>;
export type New = DefineLisp<LispType.New, Lisp, Lisp[]>;
export type None = DefineLisp<LispType.None, LispType.None, LispType.None>;

export type LispFamily = 
  Literal
  |If
  |InlineIf
  |IfCase
  |InlineIfCase
  |KeyVal
  |SpreadObject
  |SpreadArray
  |ArrayProp
  |Prop
  |PropOptional
  |Call
  |CallOptional
  |CreateArray
  |CreateObject
  |Group
  |Inverse
  |Not
  |Negative
  |Positive
  |Typeof
  |Delete
  |IncrementBefore
  |IncrementAfter
  |DecrementBefore
  |DecrementAfter
  |And
  |Or
  |Instanceof
  |In
  |Assigns
  |SubractEquals
  |AddEquals
  |DivideEquals
  |PowerEquals
  |MultiplyEquals
  |ModulusEquals
  |BitNegateEquals
  |BitAndEquals
  |BitOrEquals
  |UnsignedShiftRightEquals
  |ShiftLeftEquals
  |ShiftRightEquals
  |BitAnd
  |BitOr
  |BitNegate
  |BitShiftLeft
  |BitShiftRight
  |BitUnsignedShiftRight
  |SmallerEqualThan
  |LargerEqualThan
  |SmallerThan
  |LargerThan
  |StrictNotEqual
  |NotEqual
  |StrictEqual
  |Equal
  |Plus
  |Minus
  |Divide
  |Power
  |Multiply
  |Modulus
  |Block
  |Expression
  |Return
  |Throw
  |Switch
  |SwitchCase
  |Var
  |Let
  |Const
  |Number
  |BigInt
  |GlobalSymbol
  |LiteralIndex
  |StringIndex
  |RegexIndex
  |Function
  |InlineFunction
  |ArrowFunction
  |Loop
  |LoopAction
  |Try
  |Void
  |Await
  |New
  |None;

export interface IRegEx {
  regex: string,
  flags: string,
  length: number
}

export interface IConstants {
  strings: string[];
  literals: Literal[];
  regexes: IRegEx[];
  eager: boolean;
}

export interface IExecutionTree {
  tree: Lisp[], 
  constants: IConstants
}

type LispCallback<T> = (strings: IConstants, type: T, part: CodeString, res: string[], expect: string, ctx: {lispTree: Lisp}) => any
let lispTypes: Map<string, LispCallback<string>> = new Map();

export class ParseError extends Error {
  constructor(message: string, public code: string) {
    super(message + ": " + code.substring(0, 40));
  }
}

const inlineIfElse =  /^:/;
const elseIf = /^else(?![\w\$])/
const ifElse = /^if(?![\w\$])/
const space = /^\s/;

export let expectTypes = {
  splitter: {
    types: {
      opHigh: /^(\/|\*\*|\*(?!\*)|\%)(?!\=)/,
      op: /^(\+(?!(\+))|\-(?!(\-)))(?!\=)/,
      comparitor: /^(<=|>=|<(?!<)|>(?!>)|!==|!=(?!\=)|===|==)/,
      boolOp: /^(&&|\|\||instanceof(?![\w\$])|in(?![\w\$]))/,
      bitwise: /^(&(?!&)|\|(?!\|)|\^|<<|>>(?!>)|>>>)(?!\=)/,
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
      inlineIf: /^\?(?!\.(?!\d))/,
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
      'dot',
      'inlineIf',
      'expEnd'
    ]
  },
  modifier: {
    types: {
      not: /^!/,
      inverse: /^~/,
      negative: /^\-(?!\-)/,
      positive: /^\+(?!\+)/,
      typeof: /^typeof(?![\w\$])/,
      delete: /^delete(?![\w\$])/,
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
      dot: /^(\?)?\.(?=\s*[a-zA-Z\$\_])/,
    },
    next: [
      'splitter',
      'assignment',
      'expEdge',
      'dot',
      'inlineIf',
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
      'dot',
      'inlineIf',
      'expEnd'
    ]
  },
  value: {
    types: {
      createObject: /^\{/,
      createArray: /^\[/,
      number: /^(0x[\da-f]+(_[\da-f]+)*|(\d+(_\d+)*(\.\d+(_\d+)*)?|\.\d+(_\d+)*))(e[\+\-]?\d+(_\d+)*)?(n)?(?!\d)/i,
      string: /^"(\d+)"/,
      literal: /^`(\d+)`/,
      regex: /^\/(\d+)\/r(?![\w\$])/,
      boolean: /^(true|false)(?![\w\$])/,
      null: /^null(?![\w\$])/,
      und: /^undefined(?![\w\$])/,
      arrowFunctionSingle: /^(async\s+)?([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*=>\s*({)?/,
      arrowFunction: /^(async\s*)?\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*=>\s*({)?/,
      inlineFunction: /^(async\s+)?function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)?\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
      group: /^\(/,
      NaN: /^NaN(?![\w\$])/,
      Infinity: /^Infinity(?![\w\$])/,
      void: /^void(?![\w\$])\s*/,
      await: /^await(?![\w\$])\s*/,
      new: /^new(?![\w\$])\s*/,
    },
    next: [
      'splitter',
      'expEdge',
      'dot',
      'inlineIf',
      'expEnd'
    ]
  },
  initialize: {
    types: {
      initialize: /^(var|let|const)\s+([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*(=)?/,
      return: /^return(?![\w\$])/,
      throw: /^throw(?![\w\$])\s*/
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
  expFunction: {
    types: {
      function: /^(async\s+)?function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
    },
    next: [
      'expEdge',
      'expEnd'
    ]
  },
  expSingle: {
    types: {
      for: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*for\s*\(/,
      do: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*do(?![\w\$])\s*(\{)?/,
      while: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*while\s*\(/,
      loopAction: /^(break|continue)(?![\w\$])\s*([a-zA-Z\$\_][\w\$]*)?/,
      if: /^((([a-zA-Z\$\_][\w\$]*)\s*:)?\s*)if\s*\(/,
      try: /^try\s*{/,
      block: /^{/,
      switch: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*switch\s*\(/,
    },
    next: [
      'expEnd'
    ]
  }
} as const;

let closings = {
  "(": ")",
  "[": "]",
  "{": "}",
  "'": "'",
  '"': '"',
  "`": "`"
}

export function testMultiple(str: string, tests: RegExp[]) {
  let found: RegExpExecArray;
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    found = test.exec(str);
    if (found) break;
  }
  return found;
}

export class CodeString {
  
  start: number;
  end: number;
  ref: {str: string};
  constructor(str: string|CodeString) {
    this.ref = {str: ""};
    if (str instanceof CodeString) {
      this.ref = str.ref;
      this.start = str.start
      this.end = str.end;
    } else {
      this.ref.str = str;
      this.start = 0;
      this.end = str.length;
    }
  }

  substring(start: number, end?: number): CodeString {
    if (!this.length) return this;
    start = this.start + start;
    if (start < 0) {
      start = 0;
    }
    if (start > this.end) {
      start = this.end;
    }
    end = end === undefined ? this.end : this.start + end;
    if (end < 0) {
      end = 0;
    }
    if (end > this.end) {
      end = this.end;
    }
    const code = new CodeString(this);
    code.start = start;
    code.end = end;
    return code;
  }

  get length () {
    const len = this.end - this.start;
    return len < 0 ? 0 : len;
  }

  char(i: number) {
    if (this.start === this.end) return undefined;
    return this.ref.str[this.start + i];
  }

  toString() {
    return this.ref.str.substring(this.start, this.end);
  }

  trimStart() {
    const found = /^\s+/.exec(this.toString());
    const code = new CodeString(this);
    if (found) {
      code.start += found[0].length;
    }
    return code;
  }

  slice(start: number, end?: number) {
    if (start < 0) {
      start = this.end - this.start + start;
    }
    if (start < 0) {
      start = 0;
    }
    if (end === undefined) {
      end = this.end - this.start;
    }

    if (end < 0) {
      end = this.end - this.start + end;
    }
    if (end < 0) {
      end = 0;
    }
    return this.substring(start, end);
  }

  trim() {
    const code = this.trimStart();
    const found = /\s+$/.exec(code.toString());
    if (found) {
      code.end -= found[0].length;
    }
    return code;
  }

  valueOf() {
    return this.toString();
  }
}


const emptyString = new CodeString("")

const okFirstChars = /^[\+\-~ !]/;
const aChar = /^[\w\$]/
const aNumber = expectTypes.value.types.number;
const wordReg = /^((if|for|else|while|do|function)(?![\w\$])|[\w\$]+)/;
const semiColon = /^;/
const insertedSemicolons: WeakMap<{str: string}, Array<number>> = new WeakMap();
const quoteCache: WeakMap<{str: string}, Map<number, number>> = new WeakMap();
export interface restDetails {oneliner?: boolean, words?: string[], lastWord?: string, lastAnyWord?: string, regRes?: RegExpExecArray}
export function restOfExp(constants: IConstants, 
                          part: CodeString, 
                          tests?: RegExp[], 
                          quote?: string, 
                          firstOpening?: string, 
                          closingsTests?: RegExp[], 
                          details: restDetails = {}): CodeString {
  if (!part.length) {
    return part;
  }
  details.words = details.words || [];
  let isStart = true;
  tests = tests || [];
  const hasSemiTest = tests.includes(semiColon);
  if (hasSemiTest) {
    tests = tests.filter((a) => a !== semiColon);
  }
  const insertedSemis = insertedSemicolons.get(part.ref) || [];
  const cache = quoteCache.get(part.ref) || new Map<number, number>();
  quoteCache.set(part.ref, cache);
  if (quote && cache.has(part.start - 1)) {
    return part.substring(0, cache.get(part.start - 1) - part.start);
  }
  let escape = false;
  let done = false;
  let lastChar = "";
  let isOneLiner = false;
  let i;
  let lastInertedSemi = false;
  for (i = 0; i < part.length && !done; i++) {
    let char = part.char(i);
    if (quote === '"' || quote === "'" || quote === "`") {
      if (quote === "`" && char === "$" && part.char(i+1) === "{" && !escape) {
        let skip = restOfExp(constants, part.substring(i+2), [], "{");
        i += skip.length + 2;
      } else if (char === quote && !escape) {
        return part.substring(0, i);
      }
      escape = !escape && char === "\\";
    } else if (closings[char]) {
      if (!lastInertedSemi && insertedSemis[i + part.start]) {
        lastInertedSemi = true
        if (hasSemiTest) {
          break;
        }
        i--;
        lastChar = ';';
        continue;
      }
      if (isOneLiner && char === "{") {
        isOneLiner = false;
      }
      if (char === firstOpening) {
        done = true;
        break;
      } else {
        let skip = restOfExp(constants, part.substring(i+1), [], char);
        cache.set(skip.start - 1, skip.end);
        i += skip.length + 1;
        isStart = false;
        if (closingsTests) {
          let sub = part.substring(i);
          let found: RegExpExecArray;
          if (found = testMultiple(sub.toString(), closingsTests)) {
            details.regRes = found;
            done = true;
          }
        }
      }
    } else if (!quote) {
      let sub = part.substring(i).toString();
      let foundWord: RegExpExecArray;
      let foundNumber: RegExpExecArray;
      if (closingsTests) {
        let found: RegExpExecArray;
        if (found = testMultiple(sub, closingsTests)) {
          details.regRes = found;
          i++;
          done = true;
          break;
        }
      }
      if (foundNumber = aNumber.exec(sub)) {
        i += foundNumber[0].length - 1;
        sub = part.substring(i).toString();
      } else if (lastChar != char) {
        let found: [string]|RegExpExecArray;
        if (char === ';' || (insertedSemis[i + part.start] && !isStart && !lastInertedSemi)) {
          if (hasSemiTest) {
            found = [";"];
          } else if (insertedSemis[i + part.start]) {
            lastInertedSemi = true
            i--;
            lastChar = ';';
            continue;
          }
          char = sub = ';';
        } else {
          lastInertedSemi = false;
        }
        if (!found) {
          found = testMultiple(sub, tests);
        }
        if (found) {
          done = true;
        }
        if (!done && (foundWord = wordReg.exec(sub))) {
          isOneLiner = true;
          if (foundWord[0].length > 1) {
            details.words.push(foundWord[1]);
            details.lastAnyWord = foundWord[1];
            if (foundWord[2]) {
              details.lastWord = foundWord[2];
            }
          }
          if(foundWord[0].length > 2) {
            i += foundWord[0].length - 2;
          }
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
    throw new SyntaxError("Unclosed '" + quote + "'");
  }
  if (details) {
    details.oneliner = isOneLiner;
  }
  return part.substring(0, i);
}
restOfExp.next = [
  'splitter',
  'expEnd',
  'inlineIf'
];

const startingExecpted = ['initialize', 'expSingle', 'expFunction', 'value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];

export const setLispType = <T extends readonly string[]>(types: T, fn: LispCallback<T[number]>) => {
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

const typesCreate = {
  'createArray': LispType.CreateArray,
  'createObject': LispType.CreateObject,
  'group': LispType.Group,
  'arrayProp': LispType.ArrayProp,
  'call': LispType.Call,
  'prop': LispType.Prop,
  '?prop': LispType.PropOptional,
  '?call': LispType.CallOptional,
} as const

setLispType(['createArray', 'createObject', 'group', 'arrayProp','call'] as const, (constants, type, part, res, expect, ctx) => {
  let extract = emptyString;
  let arg: CodeString[] = [];
  let end = false;
  let i = res[0].length;
  const start = i;
  while (i < part.length && !end) {
    extract = restOfExp(constants, part.substring(i), [
      closingsCreate[type],
      /^,/
    ]);
    i += extract.length;
    if (extract.length) {
      arg.push(extract);
    }
    if (part.char(i) !== ',') {
      end = true;
    } else {
      i++;
    }
  }
  const next = ['value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];
  let l: Lisp|Lisp[];

  let funcFound: RegExpExecArray;
  switch(type) {
    case 'group':
    case 'arrayProp':
      l = lispifyExpr(constants, part.substring(start, i));
      break;
    case 'call':
    case 'createArray':
      // @TODO: support 'empty' values
      l = arg.map((e) => lispify(constants, e, [...next, 'spreadArray']));
      break;
    case 'createObject':
      l = arg.map((str) => {
        str = str.trimStart();
        let value;
        let key: string|Lisp = '';
        funcFound = expectTypes.expFunction.types.function.exec('function ' + str);
        if (funcFound) {
          key = funcFound[2].trimStart();
          value = lispify(constants, new CodeString('function ' + str.toString().replace(key, "")));
        } else {
          let extract = restOfExp(constants, str, [/^:/]);
          key = lispify(constants, extract, [...next, 'spreadObject']) as Prop;
          if (key[0] === LispType.Prop) {
            key = (key as Prop)[2];
          }
          value = lispify(constants, str.substring(extract.length + 1));
        }
        return createLisp<KeyVal>({
          op: LispType.KeyVal,
          a: key,
          b: value
        });
      });
      break;
  }
  let lisptype = (type === 'arrayProp' ? (res[1] ? LispType.PropOptional : LispType.Prop) : (type === 'call' ? (res[1] ? LispType.CallOptional : LispType.Call) : typesCreate[type])) as (typeof typesCreate)[keyof typeof typesCreate];
  ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, createLisp<ArrayProp|Prop|Call|CreateObject|CreateArray|Group|PropOptional|CallOptional>({
    op: lisptype, 
    a: ctx.lispTree, 
    b: l,
  }));
});

const modifierTypes = {
  'inverse': LispType.Inverse,
  'not': LispType.Not,
  'positive': LispType.Positive,
  'negative': LispType.Negative,
  'typeof': LispType.Typeof,  
  'delete': LispType.Delete
} as const

setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete'] as const, (constants, type, part, res, expect, ctx) => {
  let extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s\.\?\w\$]|\?[^\.])/]);
  ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp<Inverse|Not|Negative|Positive|Typeof|Delete>({
    op: modifierTypes[type],
    a: ctx.lispTree, 
    b: lispify(constants, extract, expectTypes[expect].next), 
  }));
});

const incrementTypes = {
  '++$': LispType.IncrementBefore,
  '--$': LispType.DecrementBefore,
  '$++': LispType.IncrementAfter,
  '$--': LispType.DecrementAfter
} as const

setLispType(['incrementerBefore'] as const, (constants, type, part, res, expect, ctx) => {
  let extract = restOfExp(constants, part.substring(2), [/^[^\s\.\w\$]/]);
  ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, createLisp<IncrementBefore|DecrementBefore>({
    op: incrementTypes[res[0] + "$"], 
    a: lispify(constants, extract, expectTypes[expect].next),
    b: LispType.None
  }));
});

setLispType(['incrementerAfter'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp<IncrementAfter|DecrementAfter>({
    op: incrementTypes["$"  + res[0]], 
    a: ctx.lispTree, 
    b: LispType.None
  }));
});

const adderTypes = {
  '&&': LispType.And,
  '||': LispType.Or,
  'instanceof': LispType.Instanceof,
  'in': LispType.In,
  '=': LispType.Assign,
  '-=': LispType.SubractEquals,
  '+=': LispType.AddEquals,
  '/=': LispType.DivideEquals,
  '**=': LispType.PowerEquals,
  '*=': LispType.MultiplyEquals,
  '%=': LispType.ModulusEquals,
  '^=': LispType.BitNegateEquals,
  '&=': LispType.BitAndEquals,
  '|=': LispType.BitOrEquals,
  '>>>=': LispType.UnsignedShiftRightEquals,
  '<<=': LispType.ShiftLeftEquals,
  '>>=': LispType.ShiftRightEquals,
} as const;

setLispType(['assign', 'assignModify', 'boolOp'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = createLisp<And|Or|Instanceof|In|Assigns|SubractEquals|AddEquals|DivideEquals|PowerEquals|MultiplyEquals|ModulusEquals|BitNegateEquals|BitAndEquals|BitOrEquals|UnsignedShiftRightEquals|ShiftLeftEquals|ShiftRightEquals>({
    op: adderTypes[res[0]], 
    a: ctx.lispTree,
    b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
  });
});

const opTypes = {
  '&': LispType.BitAnd,
  '|': LispType.BitOr,
  '^': LispType.BitNegate,
  '<<': LispType.BitShiftLeft,
  '>>': LispType.BitShiftRight,
  '>>>': LispType.BitUnsignedShiftRight,
  '<=': LispType.SmallerEqualThan,
  '>=': LispType.LargerEqualThan,
  '<': LispType.SmallerThan,
  '>': LispType.LargerThan,
  '!==': LispType.StrictNotEqual,
  '!=': LispType.NotEqual,
  '===': LispType.StrictEqual,
  '==': LispType.Equal,
  '+': LispType.Plus,
  '-': LispType.Minus,
  '/': LispType.Divide,
  '**': LispType.Power,
  '*': LispType.Multiply,
  '%': LispType.Modulus,
} as const

setLispType(['opHigh', 'op', 'comparitor', 'bitwise'] as const, (constants, type, part, res, expect, ctx) => {
  const next = [
    expectTypes.inlineIf.types.inlineIf,
    inlineIfElse
  ];
  switch (type) {
    case 'opHigh':
      next.push(expectTypes.splitter.types.opHigh);
    case 'op':
      next.push(expectTypes.splitter.types.op);
    case 'comparitor':
      next.push(expectTypes.splitter.types.comparitor);
    case 'bitwise':
      next.push(expectTypes.splitter.types.bitwise);
      next.push(expectTypes.splitter.types.boolOp);
  }
  let extract = restOfExp(constants, part.substring(res[0].length), next);
  ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp<BitAnd|BitOr|BitNegate|BitShiftLeft|BitShiftRight|BitUnsignedShiftRight|SmallerEqualThan|LargerEqualThan|SmallerThan|LargerThan|StrictNotEqual|NotEqual|StrictEqual|Equal|Plus|Minus|Divide|Power|Multiply|Modulus>  ({
    op: opTypes[res[0]],
    a: ctx.lispTree, 
    b: lispify(constants, extract, expectTypes[expect].next), 
  }));
});

setLispType(['inlineIf'] as const, (constants, type, part, res, expect, ctx) => {
  let found = false;
  let extract = part.substring(0, 0);
  let quoteCount = 1;
  while(!found && extract.length < part.length) {
    extract.end = restOfExp(constants, part.substring(extract.length + 1), [
      expectTypes.inlineIf.types.inlineIf,
      inlineIfElse
    ]).end;
    if (part.char(extract.length) === '?') {
      quoteCount++
    } else {
      quoteCount--
    }
    if (!quoteCount) {
      found = true;
    }
  }
  extract.start = part.start + 1;
  ctx.lispTree = createLisp<InlineIf>({
    op: LispType.InlineIf,
    a: ctx.lispTree, 
    b: createLisp<InlineIfCase>({
      op: LispType.InlineIfCase,
      a: lispifyExpr(constants, extract),
      b: lispifyExpr(constants, part.substring(res[0].length + extract.length + 1))
    })
  });
});


function extractIfElse(constants: IConstants, part: CodeString) {
  let count = 0;
  let found = part.substring(0, 0);
  let foundElse = emptyString;
  let foundTrue: CodeString;
  let first = true;
  let elseReg: RegExpExecArray;
  let details: restDetails = {}
  while((found = restOfExp(constants, part.substring(found.end - part.start), [elseIf, ifElse, semiColon], undefined, undefined , undefined, details)).length || first) {
    first = false;
    const f = part.substring(found.end - part.start).toString();
    
    if (f.startsWith("if")) {
      found.end++;
      count++;
    } else if (f.startsWith('else')) {
      foundTrue = part.substring(0, found.end - part.start);
      found.end++;
      count--;
      if (!count) {
        found.end--;
      }
    } else if (elseReg = /^;?\s*else(?![\w\$])/.exec(f)) {
      foundTrue = part.substring(0, found.end - part.start);
      found.end += elseReg[0].length - 1;
      count--;
      if (!count) {
        found.end -= elseReg[0].length - 1;
      }
    } else {
      foundTrue = foundElse.length ? foundTrue : part.substring(0, found.end - part.start);
      break;
    }
    if (!count) {
      let ie = extractIfElse(constants, part.substring(found.end - part.start + (/^;?\s*else(?![\w\$])/.exec(f)?.[0].length)));
      foundElse = ie.all;
      break;
    }
    details = {};
  }
  foundTrue = foundTrue || part.substring(0, found.end - part.start);
  return {all: part.substring(0, Math.max(foundTrue.end, foundElse.end) - part.start), true: foundTrue, false: foundElse};
}

setLispType(['if'] as const, (constants, type, part, res, expect, ctx) => {
  let condition = restOfExp(constants, part.substring(res[0].length), [], "(");
  const ie = extractIfElse(constants, part.substring(res[1].length));
  const isBlock = /^\s*\{/.exec(part.substring(res[0].length + condition.length + 1).toString());
  const startTrue = res[0].length - res[1].length + condition.length + 1;
  
  let trueBlock = ie.true.substring(startTrue);
  let elseBlock = ie.false;
  
  condition = condition.trim();
  trueBlock = trueBlock.trim();
  elseBlock = elseBlock.trim();

  if (trueBlock.char(0) === "{") trueBlock = trueBlock.slice(1, -1);
  if (elseBlock.char(0) === "{") elseBlock = elseBlock.slice(1, -1);
  ctx.lispTree = createLisp<If>({
    op: LispType.If,
    a: lispifyExpr(constants, condition), 
    b: createLisp<IfCase>({
      op: LispType.IfCase,
      a: lispifyBlock(trueBlock, constants),
      b: lispifyBlock(elseBlock, constants)
    })
  });
});

setLispType(['switch'] as const, (constants, type, part, res, expect, ctx) => {
  const test = restOfExp(constants, part.substring(res[0].length), [], "(");
  let start = part.toString().indexOf("{", res[0].length + test.length + 1);
  if (start === -1) throw new SyntaxError("Invalid switch");
  let statement = insertSemicolons(constants, restOfExp(constants, part.substring(start + 1), [], "{"));
  let caseFound: RegExpExecArray;
  const caseTest = /^\s*(case\s|default)\s*/;
  let cases: SwitchCase[] = [];
  let defaultFound = false;
  while(caseFound = caseTest.exec(statement.toString())) {
    if (caseFound[1] === 'default') {
      if (defaultFound) throw new SyntaxError("Only one default switch case allowed");
      defaultFound = true;
    }
    let cond = restOfExp(constants, statement.substring(caseFound[0].length), [/^:/]);
    let found = emptyString;
    let i = start = caseFound[0].length + cond.length + 1;
    let bracketFound = /^\s*\{/.exec(statement.substring(i).toString());
    let exprs: Lisp[] = [];
    if (bracketFound) {
      i += bracketFound[0].length;
      found = restOfExp(constants, statement.substring(i), [], "{");
      i += found.length + 1;
      exprs = lispifyBlock(found, constants);
    } else {
      let notEmpty = restOfExp(constants, statement.substring(i), [caseTest]);
      if (!notEmpty.trim().length) {
        exprs = [];
        i += notEmpty.length;
      } else {
        while((found = restOfExp(constants, statement.substring(i), [semiColon])).length) {
          i += found.length + (statement.char(i + found.length) === ';' ? 1 : 0);
          if (caseTest.test(statement.substring(i).toString())) {
            break;
          }
        }
        exprs = lispifyBlock(statement.substring(start, found.end - statement.start), constants);
      }
    }
    statement = statement.substring(i);
    cases.push(createLisp<SwitchCase>({
      op: LispType.SwitchCase,
      a: caseFound[1] === "default" ? undefined : lispifyExpr(constants, cond),
      b: exprs
    }));
  }
  ctx.lispTree = createLisp<Switch>({
    op: LispType.Switch,
    a: lispifyExpr(constants, test),
    b: cases
  });
});

setLispType(['dot', 'prop'] as const, (constants, type, part, res, expect, ctx) => {
  let prop = res[0];
  let index = res[0].length;
  let op = 'prop';
  if (type === 'dot') {
    if (res[1]) {
      op = '?prop';
    }
    let matches = part.substring(res[0].length).toString().match(expectTypes.prop.types.prop);
    if (matches && matches.length) {
      prop = matches[0];
      index = prop.length + res[0].length
    } else {
      throw new SyntaxError('Hanging  dot');
    }
  }
  ctx.lispTree = lispify(constants, part.substring(index), expectTypes[expect].next, createLisp<Prop|PropOptional>({
    op: typesCreate[op], 
    a: ctx.lispTree, 
    b: prop
  }));
});

setLispType(['spreadArray', 'spreadObject'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = createLisp<SpreadArray|SpreadObject>({
    op: type === 'spreadArray' ? LispType.SpreadArray : LispType.SpreadObject,
    a: LispType.None,
    b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
  });
});

setLispType(['return', 'throw'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = createLisp<Return|Throw>({
    op: type === 'return' ? LispType.Return : LispType.Throw,
    a: LispType.None,
    b: lispifyExpr(constants, part.substring(res[0].length))
  });
});

setLispType(['number', 'boolean', 'null', 'und', 'NaN', 'Infinity'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp<Number|BigInt|GlobalSymbol>({
    op: type === "number" ? res[10] ? LispType.BigInt : LispType.Number : LispType.GlobalSymbol,
    a: LispType.None,
    b: res[10] ? res[1] : res[0]
  }));
});

setLispType(['string', 'literal', 'regex'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp<StringIndex|LiteralIndex|RegexIndex>({
    op: type === 'string' ? LispType.StringIndex : type === 'literal' ? LispType.LiteralIndex : LispType.RegexIndex,
    a: LispType.None,
    b: res[1],
  }));
});

setLispType(['initialize'] as const, (constants, type, part, res, expect, ctx) => {
  const lt = res[1] === 'var' ? LispType.Var : res[1] === 'let' ? LispType.Let : LispType.Const;
  if (!res[3]) {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp<Var|Let|Const>({
      op: lt,
      a: res[2],
      b: LispType.None
    }));
  } else {
    ctx.lispTree = createLisp<Var|Let|Const>({
      op: lt,
      a: res[2],
      b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
    });
  }
});

setLispType(['function', 'inlineFunction', 'arrowFunction', 'arrowFunctionSingle'] as const, (constants, type, part, res, expect, ctx) => {
  const isArrow = type !== 'function' && type !== 'inlineFunction';
  const isReturn = isArrow && !res[res.length - 1];
  const argPos = isArrow ? 2 : 3;
  const isAsync = res[1] ? LispType.True : LispType.None;
  const args: (string|typeof isAsync)[] = res[argPos] ? res[argPos].replace(/\s+/g, "").split(/,/g) : [];
  if (!isArrow) {
    args.unshift((res[2] || "").trimStart());
  }
  let ended = false;
  args.forEach((arg: string) => {
    if (ended) throw new SyntaxError('Rest parameter must be last formal parameter');
    if (arg.startsWith('...')) ended = true;
  });
  args.unshift(isAsync);
  const f = restOfExp(constants, part.substring(res[0].length), !isReturn ? [/^}/] : [/^[,\)\}\]]/, semiColon])
  const func = (isReturn ? 'return ' + f : f.toString());
  ctx.lispTree = lispify(constants, part.substring(res[0].length + func.length + 1), expectTypes[expect].next, createLisp<Function|InlineFunction|ArrowFunction>({
    op: isArrow ? LispType.ArrowFunction : type === 'function' ? LispType.Function : LispType.InlineFunction,
    a: args,
    b: constants.eager ? lispifyFunction(new CodeString(func), constants) : func
  }));
});

const iteratorRegex = /^((let|var|const)\s+)?\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s+(in|of)(?![\w\$])/
setLispType(['for', 'do', 'while'] as const, (constants, type, part, res, expect, ctx) => {
  let i = 0;
  let startStep: LispItem = LispType.True;
  let startInternal: Lisp[] = [];
  let getIterator: Lisp;
  let beforeStep: LispItem = LispType.None;
  let checkFirst = LispType.True;
  let condition: LispItem;
  let step: LispItem = LispType.True;
  let body: CodeString;
  switch (type) {
    case 'while':
      i = part.toString().indexOf("(") + 1;
      let extract = restOfExp(constants, part.substring(i), [], "(");
      condition = lispifyReturnExpr(constants, extract);
      body = restOfExp(constants, part.substring(i + extract.length + 1)).trim();
      if (body[0] === "{") body = body.slice(1, -1);
      break;
    case 'for':
      i = part.toString().indexOf("(") + 1;
      let args: CodeString[] = [];
      let extract2 = emptyString;
      for (let k = 0; k < 3; k++)  {
        extract2 = restOfExp(constants, part.substring(i), [/^[;\)]/]);
        args.push(extract2.trim());
        i += extract2.length + 1;
        if (part.char(i - 1) === ")") break;
      }
      let iterator: RegExpExecArray;
      if (args.length === 1 && (iterator = iteratorRegex.exec(args[0].toString()))) {
        if (iterator[4] === 'of') {
          getIterator = lispifyReturnExpr(constants, args[0].substring(iterator[0].length)),
          startInternal = [
            ofStart2, 
            ofStart3
          ];
          condition = ofCondition;
          step = ofStep;
          beforeStep = lispify(constants, new CodeString((iterator[1] || 'let ') + iterator[3]  + ' = $$next.value'), ['initialize']);
        } else {
          getIterator = lispifyReturnExpr(constants, args[0].substring(iterator[0].length)),
          startInternal = [
            inStart2,
            inStart3
          ];
          step = inStep;
          condition = inCondition;
          beforeStep = lispify(constants, new CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$keys[$$keyIndex]'), ['initialize']);
        }
      } else if (args.length === 3) {
        startStep = lispifyExpr(constants, args.shift(), startingExecpted);
        condition = lispifyReturnExpr(constants, args.shift());
        step = lispifyExpr(constants, args.shift());
      } else {
        throw new SyntaxError("Invalid for loop definition");
      }
      body = restOfExp(constants, part.substring(i)).trim();
      if (body[0] === "{") body = body.slice(1, -1);

      break;
    case 'do':
      checkFirst = LispType.None;
      const isBlock = !!res[3];
      body = restOfExp(constants, part.substring(res[0].length), isBlock ? [/^\}/] : [semiColon]);
      condition = lispifyReturnExpr(constants, restOfExp(constants, part.substring(part.toString().indexOf("(", res[0].length + body.length) + 1), [], "("));
      break;
  }
  const a = [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep] as LispItem;
  ctx.lispTree = createLisp<Loop>({
    op: LispType.Loop,
    a,
    b: lispifyBlock(body, constants)
  });
});

setLispType(['block'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = createLisp<Block>({
    op: LispType.Block,
    a: lispifyBlock(restOfExp(constants, part.substring(1), [], "{"), constants),
    b: LispType.None
  });
});

setLispType(['loopAction'] as const, (constants, type, part, res, expect, ctx) => {
  ctx.lispTree = createLisp<LoopAction>({
    op: LispType.LoopAction,
    a: res[1],
    b: LispType.None
  });
});

const catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\))?|finally)\s*\{/
setLispType(['try'] as const, (constants, type, part, res, expect, ctx) => {
  const body = restOfExp(constants, part.substring(res[0].length), [], "{");
  let catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
  let finallyBody;
  let exception = "";
  let catchBody;
  let offset = 0;
  if (catchRes[1].startsWith('catch')) {
    catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
    exception = catchRes[2];
    catchBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
    offset = res[0].length + body.length + 1 + catchRes[0].length + catchBody.length + 1;
    if ((catchRes = catchReg.exec(part.substring(offset).toString())) && catchRes[1].startsWith('finally')) {
      finallyBody = restOfExp(constants, part.substring(offset + catchRes[0].length), [], "{");
    }
  } else {
    finallyBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
  }
  const b = [
    exception,
    lispifyBlock(insertSemicolons(constants, catchBody || emptyString), constants),
    lispifyBlock(insertSemicolons(constants, finallyBody || emptyString), constants),
  ] as LispItem;
  ctx.lispTree = createLisp<Try>({
    op: LispType.Try,
    a: lispifyBlock(insertSemicolons(constants, body), constants),
    b
  });
});

setLispType(['void', 'await'] as const, (constants, type, part, res, expect, ctx) => {
  const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s\.\?\w\$]|\?[^\.])/]);
  ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp<Void|Await>({
    op: type === 'void' ? LispType.Void : LispType.Await,
    a: lispify(constants, extract),
    b: LispType.None
  }));
});

setLispType(['new'] as const, (constants, type, part, res, expect, ctx) => {
  let i = res[0].length;
  const obj = restOfExp(constants, part.substring(i), [], undefined, "(");
  i += obj.length + 1;
  const args: CodeString[] = [];
  if (part.char(i - 1) === "(") {
    const argsString = restOfExp(constants, part.substring(i), [], "(");
    i += argsString.length + 1;
    let found: CodeString;
    let j = 0;
    while((found = restOfExp(constants, argsString.substring(j), [/^,/])).length) {
      j += found.length + 1;
      args.push(found.trim());
    }
  }
  ctx.lispTree = lispify(constants, part.substring(i), expectTypes.expEdge.next, createLisp({
    op: LispType.New,
    a: lispify(constants, obj, expectTypes.initialize.next),
    b: args.map((arg) => lispify(constants, arg, expectTypes.initialize.next)),
  }));
});

const ofStart2 = lispify(undefined, new CodeString('let $$iterator = $$obj[Symbol.iterator]()'), ['initialize']);
const ofStart3 = lispify(undefined, new CodeString('let $$next = $$iterator.next()'), ['initialize']);
const ofCondition = lispify(undefined, new CodeString('return !$$next.done'), ['initialize']);
const ofStep = lispify(undefined, new CodeString('$$next = $$iterator.next()'));
const inStart2 = lispify(undefined, new CodeString('let $$keys = Object.keys($$obj)'), ['initialize']);
const inStart3 = lispify(undefined, new CodeString('let $$keyIndex = 0'), ['initialize']);
const inStep = lispify(undefined, new CodeString('$$keyIndex++'));
const inCondition = lispify(undefined, new CodeString('return $$keyIndex < $$keys.length'), ['initialize']);

var lastType;
var lastPart;
var lastLastPart;
var lastLastLastPart;
var lastLastLastLastPart;
function lispify(constants: IConstants, part: CodeString, expected?: readonly string[], lispTree?: Lisp, topLevel = false): Lisp {
  lispTree = lispTree || [LispType.None,LispType.None,LispType.None];
  expected = expected || expectTypes.initialize.next;
  if (part === undefined) return lispTree;

  part = part.trimStart();
  const str = part.toString();
  if (!part.length && !expected.includes('expEnd')) {
    throw new SyntaxError("Unexpected end of expression");
  }
  if (!part.length) return lispTree;

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
      if(res = expectTypes[expect].types[type].exec(str)) {
        lastType = type;
        lastLastLastLastPart = lastLastLastPart;
        lastLastLastPart = lastLastPart;
        lastLastPart = lastPart;
        lastPart = part;
        try {
          lispTypes.get(type)(constants, type, part, res, expect, ctx);
        } catch(e) {
          if (topLevel && e instanceof SyntaxError) {
            throw new ParseError(e.message, str);
          }
          throw e;
        }
        break;
      }
    }
    if (res) break;
  }

  if (!res && part.length) {
    let msg = `Unexpected token after ${lastType}: ${part.char(0)}`;
    if (topLevel) {
      throw new ParseError(`Unexpected token after ${lastType}: ${part.char(0)}`, str);
    }
    throw new SyntaxError(`Unexpected token after ${lastType}: ${part.char(0)}`);
  }
  return ctx.lispTree;
}

const startingExpectedWithoutSingle = startingExecpted.filter((r) => r !== 'expSingle');

function lispifyExpr(constants: IConstants, str: CodeString, expected?: readonly string[]): Lisp {
  if (!str.trimStart().length) return undefined;
  let subExpressions: CodeString[] = [];
  let sub: CodeString;
  let pos = 0;
  expected = expected || expectTypes.initialize.next;
  if (expected.includes('expSingle')) {
    if (testMultiple(str.toString(), Object.values(expectTypes.expSingle.types))) {
      return lispify(constants, str, ['expSingle'], undefined, true);
    }
  }
  if (expected === startingExecpted) expected = startingExpectedWithoutSingle;
  while ((sub = restOfExp(constants, str.substring(pos), [/^,/])).length) {
    subExpressions.push(sub.trimStart());
    pos += sub.length + 1;
  }
  if (subExpressions.length === 1) {
    return lispify(constants, str, expected, undefined, true);
  }
  if (expected.includes('initialize')) {
    let defined = expectTypes.initialize.types.initialize.exec(subExpressions[0].toString());
    if (defined) {
      return createLisp<Block>({
        op: LispType.Block,
        a: subExpressions.map((str, i) => lispify(constants, i ? new CodeString(defined[1] + ' ' + str) : str, ['initialize'], undefined, true)),
        b: LispType.None
      });
    } else if (expectTypes.initialize.types.return.exec(subExpressions[0].toString())) {
      return lispify(constants, str, expected, undefined, true);
    }
  }
  const exprs = subExpressions.map((str, i) => lispify(constants, str, expected, undefined, true));
  return createLisp<Expression>({op: LispType.Expression, a: exprs, b: LispType.None});
}

export function lispifyReturnExpr(constants: IConstants, str: CodeString) {
  return createLisp<Return>({op: LispType.Return, a: LispType.None, b: lispifyExpr(constants, str)})
}

export function lispifyBlock(str: CodeString, constants: IConstants, expression = false): Lisp[] {
  str = insertSemicolons(constants, str);
  if (!str.trim().length) return [];
  let parts: CodeString[] = [];
  let part: CodeString;
  let pos = 0;
  let start = 0;
  let details: restDetails = {};
  let skipped = false;
  let isInserted = false;
  while ((part = restOfExp(constants, str.substring(pos), [semiColon], undefined, undefined, undefined, details)).length) {
    isInserted = str.char(pos + part.length) && str.char(pos + part.length) !== ';';
    pos += part.length + (isInserted ? 0 : 1);
    if (/^\s*else(?![\w\$])/.test(str.substring(pos).toString())) {
      skipped = true;
    } else if (details.words.includes('do') && /^\s*while(?![\w\$])/.test(str.substring(pos).toString())) {
      skipped = true;
    } else {
      skipped = false;
      parts.push(str.substring(start, pos - (isInserted ? 0 : 1)));
      start = pos;
    }
    details = {};
    if (expression) break;
  }
  if (skipped) {
    parts.push(str.substring(start, pos - (isInserted ? 0 : 1)));
  }
  return parts.map((str) => str.trimStart()).filter((str) => str.length).map((str, j) => {
    return lispifyExpr(constants, str.trimStart(), startingExecpted);
  });
}

export function lispifyFunction(str: CodeString, constants: IConstants, expression = false): Lisp[] {
  if (!str.trim().length) return [];
  const tree = lispifyBlock(str, constants, expression);
  let hoisted: Lisp[] = [];
  hoist(tree, hoisted);
  return hoisted.concat(tree);
}

export function isLisp<Type extends Lisp = Lisp>(item: LispItem|LispItem): item is Type {
  return Array.isArray(item) && typeof item[0] === 'number' && item[0] !== LispType.None && item[0] !== LispType.True;
}

function hoist(item: LispItem|LispItem, res: Lisp[]): boolean {
  if (isLisp(item)) {
    const [op, a, b] = item;
    if (op === LispType.Try || op === LispType.If || op === LispType.Loop || op === LispType.Switch) {
      hoist(a, res);
      hoist(b, res);
    } else if (op === LispType.Var) {
      res.push(createLisp({op: LispType.Var, a: a, b: LispType.None}));
    } else if (op === LispType.Function && a[1]) {
      res.push(item);
      return true;
    }
  } else if (Array.isArray(item)) {
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
  }
  return false;
}

const closingsNoInsertion = /^(\})\s*(catch|finally|else|while|instanceof)(?![\w\$])/
                    //  \w|)|] \n \w = 2                                  // \} \w|\{ = 5 
const colonsRegex = /^((([\w\$\]\)\"\'\`]|\+\+|\-\-)\s*\r?\n\s*([\w\$\+\-\!~]))|(\}\s*[\w\$\!~\+\-\{\(\"\'\`]))/

// if () \w \n; \w              == \w \n \w    | last === if             a
// if () { }; \w                == \} ^else    | last === if             b
// if () \w \n; else \n \w \n;  == \w \n \w    | last === else           a
// if () {} else {}; \w         == \} \w       | last === else           b
// while () \n \w \n; \w        == \w \n \w    | last === while          a
// while () { }; \w             == \} \w       | last === while          b
// do \w \n; while (); \w       == \w \n while | last === do             a
// do { } while (); \w          == \) \w       | last === while          c
// try {} catch () {}; \w       == \} \w       | last === catch|finally  b
// \w \n; \w                    == \w \n \w    | last === none           a
// cb() \n \w                   == \) \n \w    | last === none           a
// obj[a] \n \w                 == \] \n \w    | last === none           a
// {} {}                        == \} \{       | last === none           b

export function insertSemicolons(constants: IConstants, str: CodeString): CodeString {
  let rest = str;
  let sub = emptyString;
  let details: restDetails = {};
  const inserted = insertedSemicolons.get(str.ref) || new Array(str.ref.str.length);
  while ((sub = restOfExp(constants, rest, [], undefined, undefined, [colonsRegex], details)).length) {
    let valid = false;
    let part = sub;
    let edge = sub.length;
    if (details.regRes) {
      valid = true;
      const [,, a,,, b] = details.regRes;
      edge = details.regRes[3] === "++" || details.regRes[3] === "--" ? sub.length + 1 : sub.length;
      part = rest.substring(0,  edge);
      if (b) {
        let res = closingsNoInsertion.exec(rest.substring(sub.length - 1).toString());
        if (res) {
          if (res[2] === 'while') {
            valid = details.lastWord !== 'do';
          } else {
            valid = false;
          }
        } else if (details.lastWord === 'function' && details.regRes[5][0] === "}" && details.regRes[5].slice(-1) === '(') {
          valid = false;
        } 

      } else if (a) {
        if (details.lastWord === 'if' || details.lastWord === 'while' || details.lastWord === 'for' || details.lastWord === 'else') {
          valid = false;
        }
      }
    }
    if (valid) {
      inserted[part.end] = true;
    }
    rest = rest.substring(edge);
    details = {};
  }
  insertedSemicolons.set(str.ref, inserted);
  return str;
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
const possibleDivide = /^([\w\$\]\)]|\+\+|\-\-)[\s\/]/;
export function extractConstants(constants: IConstants, str: string, currentEnclosure = ""): {str: string, length: number} {
  let quote;
  let extract: (string|number)[] = [];
  let escape = false;
  let regexFound: IRegEx;
  let comment = "";
  let commentStart = -1;
  let currJs: string[] = [];
  let char: string = "";
  const strRes: (string|number)[] = [];
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
          extract.push('${', currJs.length - 1, `}`);
          i += skip.length + 2;
        } else if (quote === char) {
          if (quote === '`') {
            const li = createLisp<Literal>({
              op: LispType.Literal,
              a:  unraw(extract.join("")),
              b: [],
            });
            li.tempJsStrings = currJs
            constants.literals.push(li);
            strRes.push(`\``, constants.literals.length - 1, `\``);
          } else {
            constants.strings.push(unraw(extract.join("")));
            strRes.push(`"`, constants.strings.length - 1, `"`);
          }
          quote = null;
          extract = [];
        } else {
          extract.push(char);
        }
      } else {
        if ((char === "'"  || char === '"'  || char === '`')) {
          currJs = [];
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
          strRes.push(`/`, constants.regexes.length - 1, `/r`);
          i += regexFound.length - 1;
        } else {
          strRes.push(char);
        }

        if (!isPossibleDivide || !space.test(char)) {
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
export function parse(code: string, eager = false, expression = false): IExecutionTree {
  if (typeof code !== 'string') throw new ParseError(`Cannot parse ${code}`, code);
  let str = ' ' + code;
  const constants: IConstants = {strings: [], literals: [], regexes: [], eager};
  str = extractConstants(constants, str).str;

  for (let l of constants.literals) {
    l[2] = l.tempJsStrings.map((js: string) => lispifyExpr(constants, new CodeString(js)));
    delete l.tempJsStrings;
  }
  return {tree: lispifyFunction(new CodeString(str), constants, expression), constants};
}
