import unraw from './unraw.js';
import { CodeString, isLisp, LispType, reservedWords, SandboxCapabilityError } from './utils.js';

export type DefineLisp<
  op extends LispType,
  a extends LispItem | LispItem,
  b extends LispItem | LispItem,
> = [op, a, b];

export type ExtractLispOp<L> = L extends DefineLisp<infer i, any, any> ? i : never;
export type ExtractLispA<L> = L extends DefineLisp<any, infer i, any> ? i : never;
export type ExtractLispB<L> = L extends DefineLisp<any, any, infer i> ? i : never;

export type LispItemSingle = LispType.None | LispType.True | string | Lisp;
export type LispItem = LispItemSingle | LispItemSingle[];
export type Lisp = [LispType, LispItem, LispItem];
type LispWithSource = Lisp & { source?: string };

function createLisp<L extends Lisp>(obj: {
  op: ExtractLispOp<L>;
  a: ExtractLispA<L>;
  b: ExtractLispB<L>;
}) {
  return [obj.op, obj.a, obj.b] as L;
}

const NullLisp = createLisp<None>({ op: LispType.None, a: LispType.None, b: LispType.None });

const statementLabelRegex = /([a-zA-Z$_][\w$]*)\s*:/g;

function extractStatementLabels(prefix = '') {
  return [...prefix.matchAll(statementLabelRegex)].map((match) => match[1]);
}

function wrapLabeledStatement<T extends Lisp>(labels: string[], statement: T): Lisp {
  return labels.reduceRight(
    (current, label) =>
      createLisp<Labeled>({
        op: LispType.Labeled,
        a: label,
        b: current,
      }),
    statement as Lisp,
  );
}

export type Literal = DefineLisp<LispType.Literal, string, Lisp[]> & { tempJsStrings?: string[] };
export type If = DefineLisp<LispType.If, Lisp, IfCase>;
export type InlineIf = DefineLisp<LispType.InlineIf, Lisp, InlineIfCase>;
export type StatementLabel = string | LispType.None;
export type IfCase = DefineLisp<LispType.IfCase, Lisp[], Lisp[]>;
export type InlineIfCase = DefineLisp<LispType.InlineIfCase, Lisp, Lisp>;
export type Labeled = DefineLisp<LispType.Labeled, StatementLabel, Lisp>;
export type KeyVal = DefineLisp<LispType.KeyVal, string | Lisp, Lisp>;
export type SpreadObject = DefineLisp<LispType.SpreadObject, LispType.None, Lisp>;
export type SpreadArray = DefineLisp<LispType.SpreadArray, LispType.None, Lisp>;
export type ArrayProp = DefineLisp<LispType.ArrayProp, Lisp, Lisp>;
export type Prop = DefineLisp<LispType.Prop, Lisp, string | Lisp>;
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
export type NullishCoalescing = DefineLisp<LispType.NullishCoalescing, Lisp, Lisp>;
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
export type AndEquals = DefineLisp<LispType.AndEquals, Lisp, Lisp>;
export type OrEquals = DefineLisp<LispType.OrEquals, Lisp, Lisp>;
export type NullishCoalescingEquals = DefineLisp<LispType.NullishCoalescingEquals, Lisp, Lisp>;

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

export type InternalCode = DefineLisp<LispType.InternalBlock, Lisp[], LispType.None>;
export type Block = DefineLisp<LispType.Block, Lisp[], LispType.None>;
export type Expression = DefineLisp<LispType.Expression, Lisp[], LispType.None>;
export type Return = DefineLisp<LispType.Return, LispType.None, Lisp>;
export type Throw = DefineLisp<LispType.Throw, LispType.None, Lisp>;
export type Switch = DefineLisp<LispType.Switch, Lisp, SwitchCase[]>;
export type SwitchCase = DefineLisp<LispType.SwitchCase, LispType.None | Lisp, Lisp[]>;
export type Var = DefineLisp<LispType.Var, string, Lisp | LispType.None>;
export type Let = DefineLisp<LispType.Let, string, Lisp | LispType.None>;
export type Const = DefineLisp<LispType.Const, string, Lisp | LispType.None>;
export type Internal = DefineLisp<LispType.Internal, string, Lisp | LispType.None>;

export type Number = DefineLisp<LispType.Number, LispType.None, string>;
export type BigInt = DefineLisp<LispType.BigInt, LispType.None, string>;
export type GlobalSymbol = DefineLisp<LispType.GlobalSymbol, LispType.None, string>;
export type LiteralIndex = DefineLisp<LispType.LiteralIndex, LispType.None, string>;
export type StringIndex = DefineLisp<LispType.StringIndex, LispType.None, string>;
export type RegexIndex = DefineLisp<LispType.RegexIndex, LispType.None, string>;

export type Function = DefineLisp<
  LispType.Function,
  (string | LispType.None | LispType.True)[],
  string | Lisp[]
>;
export type InlineFunction = DefineLisp<LispType.InlineFunction, string[], string | Lisp[]>;
export type ArrowFunction = DefineLisp<LispType.ArrowFunction, string[], string | Lisp[]>;
export type Loop = DefineLisp<LispType.Loop, LispItem, Lisp[]>;
export type LoopAction = DefineLisp<LispType.LoopAction, string, StatementLabel>;
export type Try = DefineLisp<LispType.Try, Lisp[], LispItem>;

export type Void = DefineLisp<LispType.Void, Lisp, LispType.None>;
export type Await = DefineLisp<LispType.Await, Lisp, LispType.None>;
export type Yield = DefineLisp<LispType.Yield, Lisp, LispType.None>;
export type YieldDelegate = DefineLisp<LispType.YieldDelegate, Lisp, LispType.None>;
export type New = DefineLisp<LispType.New, Lisp, Lisp[]>;
export type None = DefineLisp<LispType.None, LispType.None, LispType.None>;

export type LispFamily =
  | Literal
  | If
  | InlineIf
  | IfCase
  | InlineIfCase
  | Labeled
  | KeyVal
  | SpreadObject
  | SpreadArray
  | ArrayProp
  | Prop
  | PropOptional
  | Call
  | CallOptional
  | CreateArray
  | CreateObject
  | Group
  | Inverse
  | Not
  | Negative
  | Positive
  | Typeof
  | Delete
  | IncrementBefore
  | IncrementAfter
  | DecrementBefore
  | DecrementAfter
  | And
  | Or
  | NullishCoalescing
  | Instanceof
  | In
  | Assigns
  | SubractEquals
  | AddEquals
  | DivideEquals
  | PowerEquals
  | MultiplyEquals
  | ModulusEquals
  | BitNegateEquals
  | BitAndEquals
  | BitOrEquals
  | UnsignedShiftRightEquals
  | ShiftLeftEquals
  | ShiftRightEquals
  | AndEquals
  | OrEquals
  | NullishCoalescingEquals
  | BitAnd
  | BitOr
  | BitNegate
  | BitShiftLeft
  | BitShiftRight
  | BitUnsignedShiftRight
  | SmallerEqualThan
  | LargerEqualThan
  | SmallerThan
  | LargerThan
  | StrictNotEqual
  | NotEqual
  | StrictEqual
  | Equal
  | Plus
  | Minus
  | Divide
  | Power
  | Multiply
  | Modulus
  | InternalCode
  | Expression
  | Return
  | Throw
  | Switch
  | SwitchCase
  | Var
  | Let
  | Const
  | Number
  | BigInt
  | GlobalSymbol
  | LiteralIndex
  | StringIndex
  | RegexIndex
  | Function
  | InlineFunction
  | ArrowFunction
  | Loop
  | LoopAction
  | Try
  | Void
  | Await
  | Yield
  | YieldDelegate
  | New
  | Block
  | Internal
  | None;

export interface IRegEx {
  regex: string;
  flags: string;
  length: number;
}

export interface IConstants {
  strings: string[];
  literals: Literal[];
  regexes: IRegEx[];
  eager: boolean;
  maxDepth: number;
}

export interface IExecutionTree {
  tree: Lisp[];
  constants: IConstants;
}

export interface LispDepthCtx {
  generatorDepth: number;
  asyncDepth: number;
}

export interface LispCallbackCtx extends LispDepthCtx {
  constants: IConstants;
  type: string;
  part: CodeString;
  res: string[];
  expect: string;
  lispTree: Lisp;
}

type LispCallback<T> = (ctx: LispCallbackCtx & { type: T }) => any;
const lispTypes: Map<string, LispCallback<string>> = new Map();

export class ParseError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message + ': ' + code.substring(0, 40));
  }
}

let lastType: CodeString | string;
let lastPart: CodeString | string;
let lastLastPart: CodeString | string;
let lastLastLastPart: CodeString | string;
let lastLastLastLastPart: CodeString | string;

const inlineIfElse = /^:/;
const elseIf = /^else(?![\w$])/;
const ifElse = /^if(?![\w$])/;
const space = /^\s/;

export const expectTypes = {
  splitter: {
    types: {
      power: /^(\*\*)(?!=)/,
      opHigh: /^(\/|\*(?!\*)|%)(?!=)/,
      op: /^(\+(?!(\+))|-(?!(-)))(?!=)/,
      comparitor: /^(<=|>=|<(?!<)|>(?!>)|!==|!=(?!=)|===|==)/,
      bitwiseShift: /^(<<|>>(?!>)|>>>)(?!=)/,
      bitwiseAnd: /^(&(?!&))(?!=)/,
      bitwiseXor: /^(\^)(?!=)/,
      bitwiseOr: /^(\|(?!\|))(?!=)/,
      boolOpAnd: /^(&&)(?!=)/,
      boolOpOr: /^(\|\|(?!=)|instanceof(?![\w$])|in(?![\w$]))/,
      nullishCoalescing: /^\?\?(?!=)/,
    },
    next: ['modifier', 'value', 'prop', 'incrementerBefore'],
  },
  inlineIf: {
    types: {
      inlineIf: /^\?(?!\.(?!\d))/,
    },
    next: ['expEnd'],
  },
  assignment: {
    types: {
      assignModify: /^(-=|\+=|\/=|\*\*=|\*=|%=|\^=|&=|\|=|>>>=|>>=|<<=|&&=|\|\|=|\?\?=)/,
      assign: /^(=)(?!=)/,
    },
    next: ['modifier', 'value', 'prop', 'incrementerBefore'],
  },
  incrementerBefore: {
    types: { incrementerBefore: /^(\+\+|--)/ },
    next: ['prop'],
  },
  expEdge: {
    types: {
      call: /^(\?\.)?[(]/,
      incrementerAfter: /^(\+\+|--)/,
      taggedTemplate: /^`(\d+)`/,
    },
    next: ['splitter', 'assignment', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
  },
  modifier: {
    types: {
      not: /^!/,
      inverse: /^~/,
      negative: /^-(?!-)/,
      positive: /^\+(?!\+)/,
      typeof: /^typeof(?![\w$])/,
      delete: /^delete(?![\w$])/,
    },
    next: ['modifier', 'value', 'prop', 'incrementerBefore'],
  },
  dot: {
    types: {
      arrayProp: /^(\?\.)?\[/,
      dot: /^(\?)?\.(?=\s*[a-zA-Z$_])/,
    },
    next: ['splitter', 'assignment', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
  },
  prop: {
    types: {
      prop: /^[a-zA-Z$_][a-zA-Z\d$_]*/,
    },
    next: ['splitter', 'assignment', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
  },
  value: {
    types: {
      createObject: /^\{/,
      createArray: /^\[/,
      number:
        /^(0b[01]+(_[01]+)*|0o[0-7]+(_[0-7]+)*|0x[\da-f]+(_[\da-f]+)*|(\d+(_\d+)*(\.\d+(_\d+)*)?|\.\d+(_\d+)*))(e[+-]?\d+(_\d+)*)?(n)?(?!\d)/i,
      string: /^"(\d+)"/,
      literal: /^`(\d+)`/,
      regex: /^\/(\d+)\/r(?![\w$])/,
      boolean: /^(true|false)(?![\w$])/,
      null: /^null(?![\w$])/,
      und: /^undefined(?![\w$])/,
      arrowFunctionSingle: /^(async\s+)?([a-zA-Z$_][a-zA-Z\d$_]*)\s*=>\s*({)?/,
      arrowFunction: /^(async\s*)?\(\s*([^)(]*?)\s*\)\s*=>\s*({)?/,
      inlineFunction: /^(async\s+)?function(\*\s*|\s*)([a-zA-Z$_][a-zA-Z\d$_]*)?\s*\(\s*/,
      yield: /^yield\*(?![\w$])\s*|^yield(?![\w$])\s*/,
      group: /^\(/,
      NaN: /^NaN(?![\w$])/,
      Infinity: /^Infinity(?![\w$])/,
      void: /^void(?![\w$])\s*/,
      await: /^await(?![\w$])\s*/,
      new: /^new(?![\w$])\s*/,
    },
    next: ['splitter', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
  },
  initialize: {
    types: {
      initializeDestructure: /^(var|let|const|internal)\s+([{[])/,
      initialize: /^(var|let|const|internal)\s+([a-zA-Z$_][a-zA-Z\d$_]*)\s*(=)?/,
      return: /^return(?![\w$])/,
      throw: /^throw(?![\w$])\s*/,
    },
    next: ['modifier', 'value', 'prop', 'incrementerBefore', 'expEnd'],
  },
  spreadObject: {
    types: {
      spreadObject: /^\.\.\./,
    },
    next: ['value', 'prop'],
  },
  spreadArray: {
    types: {
      spreadArray: /^\.\.\./,
    },
    next: ['value', 'prop'],
  },
  expEnd: { types: {}, next: [] },
  expFunction: {
    types: {
      function: /^(async\s+)?function(\*\s*|\s+)([a-zA-Z$_][a-zA-Z\d$_]*)\s*\(\s*/,
    },
    next: ['expEdge', 'expEnd'],
  },
  expSingle: {
    types: {
      for: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*for(\s+await)?\s*\(/,
      do: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*do(?![\w$])\s*(\{)?/,
      while: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*while\s*\(/,
      loopAction: /^(break|continue)(?![\w$])\s*([a-zA-Z$_][\w$]*)?/,
      if: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*if\s*\(/,
      try: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*try\s*{/,
      block: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*{/,
      switch: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*switch\s*\(/,
    },
    next: ['expEnd'],
  },
} as Record<string, { types: Record<string, RegExp>; next: string[] }>;

const closings = {
  '(': ')',
  '[': ']',
  '{': '}',
  "'": "'",
  '"': '"',
  '`': '`',
} as Record<string, string>;

export function testMultiple(str: string, tests: RegExp[]) {
  let found: RegExpExecArray | null = null;
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    found = test.exec(str);
    if (found) break;
  }
  return found;
}

const emptyString = new CodeString('');

const okFirstChars = /^[+\-~ !]/;
const aNumber = expectTypes.value.types.number;
const wordReg = /^((if|for|else|while|do|function)(?![\w$])|[\w$]+)/;
const semiColon = /^;/;
const insertedSemicolons: WeakMap<{ str: string }, Array<number>> = new WeakMap();
const quoteCache: WeakMap<{ str: string }, Map<number, number>> = new WeakMap();
export interface restDetails {
  oneliner?: boolean;
  words?: string[];
  lastWord?: string;
  lastAnyWord?: string;
  regRes?: RegExpExecArray;
  bodyContentAfterKeyword?: boolean;
}
export function restOfExp(
  constants: IConstants,
  part: CodeString,
  tests?: RegExp[],
  quote?: string,
  firstOpening?: string,
  closingsTests?: RegExp[],
  details: restDetails = {},
  depth = 0,
): CodeString {
  if (!part.length) {
    return part;
  }
  if (depth > constants.maxDepth) {
    throw new SandboxCapabilityError('Maximum expression depth exceeded');
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
    return part.substring(0, cache.get(part.start - 1)! - part.start);
  }
  let escape = false;
  let done = false;
  let lastChar = '';
  let isOneLiner = false;
  let i;
  let lastInertedSemi = false;
  let seenKeyword = false;
  let skipNextWord = false;
  for (i = 0; i < part.length && !done; i++) {
    let char = part.char(i)!;
    if (quote === '"' || quote === "'" || quote === '`') {
      if (quote === '`' && char === '$' && part.char(i + 1) === '{' && !escape) {
        const skip = restOfExp(
          constants,
          part.substring(i + 2),
          [],
          '{',
          undefined,
          undefined,
          {},
          depth + 1,
        );
        i += skip.length + 2;
      } else if (char === quote && !escape) {
        return part.substring(0, i);
      }
      escape = !escape && char === '\\';
    } else if (closings[char]) {
      if (!lastInertedSemi && insertedSemis[i + part.start]) {
        lastInertedSemi = true;
        if (hasSemiTest) {
          break;
        }
        i--;
        lastChar = ';';
        continue;
      }
      if (isOneLiner && char === '{') {
        isOneLiner = false;
      }
      if (char === firstOpening) {
        done = true;
        break;
      } else {
        const skip = restOfExp(
          constants,
          part.substring(i + 1),
          [],
          char,
          undefined,
          undefined,
          {},
          depth + 1,
        );
        cache.set(skip.start - 1, skip.end);
        i += skip.length + 1;
        isStart = false;
        if (closingsTests) {
          const sub = part.substring(i);
          let found: RegExpExecArray | null;
          if ((found = testMultiple(sub.toString(), closingsTests))) {
            details.regRes = found;
            done = true;
          }
        }
      }
    } else if (!quote) {
      let sub = part.substring(i).toString();
      let foundWord: RegExpExecArray | null;
      let foundNumber: RegExpExecArray | null;
      if (closingsTests) {
        let found: RegExpExecArray | null;
        if ((found = testMultiple(sub, closingsTests))) {
          details.regRes = found;
          i++;
          done = true;
          break;
        }
      }
      if ((foundNumber = aNumber.exec(sub))) {
        i += foundNumber[0].length - 1;
        sub = part.substring(i).toString();
        if (closingsTests) {
          let found: RegExpExecArray | null;
          if ((found = testMultiple(sub, closingsTests))) {
            details.regRes = found;
            i++;
            done = true;
            break;
          }
        }
      } else if (lastChar != char) {
        let found: [string] | RegExpExecArray | null = null;
        if (char === ';' || (insertedSemis[i + part.start] && !isStart && !lastInertedSemi)) {
          if (hasSemiTest) {
            found = [';'];
          } else if (insertedSemis[i + part.start]) {
            lastInertedSemi = true;
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
          if (foundWord[2]) {
            seenKeyword = true;
            skipNextWord = true;
          } else if (seenKeyword) {
            if (skipNextWord) {
              skipNextWord = false;
            } else {
              details.bodyContentAfterKeyword = true;
            }
          }
          if (foundWord[0].length > 1) {
            details.words.push(foundWord[1]);
            details.lastAnyWord = foundWord[1];
            if (foundWord[2]) {
              details.lastWord = foundWord[2];
            }
          }
          if (foundWord[0].length > 2) {
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
    } else if (char === closings[quote]) {
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
restOfExp.next = ['splitter', 'expEnd', 'inlineIf'];

const startingExecpted = [
  'initialize',
  'expSingle',
  'expFunction',
  'value',
  'modifier',
  'prop',
  'incrementerBefore',
  'expEnd',
];

export const setLispType = <T extends readonly string[]>(types: T, fn: LispCallback<T[number]>) => {
  types.forEach((type) => {
    lispTypes.set(type, fn);
  });
};

const closingsCreate: { [type: string]: RegExp } = {
  createArray: /^\]/,
  createObject: /^\}/,
  group: /^\)/,
  arrayProp: /^\]/,
  call: /^\)/,
};

const typesCreate = {
  createArray: LispType.CreateArray,
  createObject: LispType.CreateObject,
  group: LispType.Group,
  arrayProp: LispType.ArrayProp,
  call: LispType.Call,
  prop: LispType.Prop,
  '?prop': LispType.PropOptional,
  '?call': LispType.CallOptional,
} as any;

setLispType(['createArray', 'createObject', 'group', 'arrayProp', 'call'] as const, (ctx) => {
  const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
  let extract = emptyString;
  const arg: CodeString[] = [];
  let end = false;
  let i = res[0].length;
  const start = i;
  while (i < part.length && !end) {
    extract = restOfExp(constants, part.substring(i), [closingsCreate[type], /^,/]);
    i += extract.length;
    if (extract.trim().length) {
      arg.push(extract);
    }
    if (part.char(i) !== ',') {
      end = true;
    } else {
      if (!extract.trim().length && type === 'call') {
        // Empty arg before comma: fn(, value) or fn(a,, b)
        throw new SyntaxError('Unexpected end of expression');
      }
      i++;
    }
  }
  const next =
    type === 'createArray' || type === 'createObject' || type === 'group'
      ? ['value', 'modifier', 'prop', 'incrementerBefore', 'assignment', 'expEnd']
      : ['value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];
  let l: Lisp | Lisp[];

  let funcFound: RegExpExecArray | null;
  switch (type) {
    case 'group': {
      const groupContent = part.substring(start, i).trim();
      const groupContentStr = groupContent.toString();
      if (groupContentStr.startsWith('{') || groupContentStr.startsWith('[')) {
        const patternEnd = findPatternEndIdx(groupContentStr);
        const patternStr = groupContentStr.slice(0, patternEnd).trim();
        const afterPattern = groupContentStr.slice(patternEnd).trimStart();
        if (afterPattern.startsWith('=')) {
          const rhsStr = afterPattern.slice(1).trim();
          const tempName = `$$_da${Math.random().toString(36).slice(2)}`;
          const expandedCode = `internal ${tempName} = (${rhsStr}); ${expandDestructure('', patternStr, tempName)}; ${tempName}`;
          l = createLisp<InternalCode>({
            op: LispType.InternalBlock,
            a: lispifyBlock(new CodeString(expandedCode), constants, false, ctx),
            b: LispType.None,
          });
          break;
        }
      }
    }
    case 'arrayProp': {
      const arrayPropExpr = part.substring(start, i);
      if (!arrayPropExpr.trimStart().length) {
        throw new SyntaxError('Unexpected end of expression');
      }
      l = lispifyExpr(constants, arrayPropExpr, undefined, ctx);
      break;
    }
    case 'call':
    case 'createArray':
      // @TODO: support 'empty' values
      l = arg.map((e) => lispify(constants, e, [...next, 'spreadArray'], undefined, false, ctx));
      break;
    case 'createObject':
      l = arg.map((str) => {
        str = str.trimStart();
        let value: Lisp;
        let key: string | Lisp = '';
        // Handle computed property keys: {[expr]: value} or {[expr]() {}}
        if (str.char(0) === '[') {
          const innerExpr = restOfExp(constants, str.substring(1), [], '[');
          const afterBracket = str.substring(1 + innerExpr.length + 1).trimStart();
          key = lispify(constants, innerExpr, next);
          if (afterBracket.length > 0 && afterBracket.char(0) === ':') {
            // Computed property with value: {[expr]: value}
            value = lispify(constants, afterBracket.substring(1));
          } else if (afterBracket.length > 0 && afterBracket.char(0) === '(') {
            // Computed method: {[expr]() {}}
            value = lispify(constants, new CodeString('function' + afterBracket.toString()));
          } else {
            throw new SyntaxError('Unexpected token in computed property');
          }
          return createLisp<KeyVal>({
            op: LispType.KeyVal,
            a: key,
            b: value,
          });
        }
        funcFound = expectTypes.expFunction.types.function.exec('function ' + str);
        if (funcFound) {
          key = funcFound[3].trimStart();
          value = lispify(constants, new CodeString('function ' + str.toString().replace(key, '')));
        } else {
          const extract = restOfExp(constants, str, [/^:/]);
          key = lispify(constants, extract, [...next, 'spreadObject']) as Prop;

          // Check if this is a spread object
          if (isLisp(key) && key[0] === LispType.SpreadObject) {
            // For spread objects, there's no separate value
            value = NullLisp;
          } else {
            // Extract the property name from Prop if needed
            if (key[0] === LispType.Prop) {
              key = (key as Prop)[2];
            }

            // Check if there's a colon (property with value) or not (property shorthand)
            if (str.length > extract.length && str.char(extract.length) === ':') {
              // Property with explicit value: {key: value}
              value = lispify(constants, str.substring(extract.length + 1));
            } else {
              // Property shorthand: {key} is equivalent to {key: key}
              // Parse the key name as a variable reference
              value = lispify(constants, extract, next);
            }
          }
        }
        return createLisp<KeyVal>({
          op: LispType.KeyVal,
          a: key,
          b: value,
        });
      });
      break;
  }
  const lisptype = (
    type === 'arrayProp'
      ? res[1]
        ? LispType.PropOptional
        : LispType.Prop
      : type === 'call'
        ? res[1]
          ? LispType.CallOptional
          : LispType.Call
        : typesCreate[type]
  ) as (typeof typesCreate)[keyof typeof typesCreate];
  const currentTree = createLisp<
    ArrayProp | Prop | Call | CreateObject | CreateArray | Group | PropOptional | CallOptional
  >({
    op: lisptype,
    a: ctx.lispTree,
    b: l,
  }) as LispWithSource;
  if (
    lisptype === LispType.Group ||
    lisptype === LispType.CreateArray ||
    lisptype === LispType.CreateObject
  ) {
    currentTree.source = part.substring(start, i).toString();
  }
  ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, currentTree);
});

const modifierTypes = {
  inverse: LispType.Inverse,
  not: LispType.Not,
  positive: LispType.Positive,
  negative: LispType.Negative,
  typeof: LispType.Typeof,
  delete: LispType.Delete,
} as const;

setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);

  // Check if the extracted expression contains an exponentiation operator at the top level
  // ECMAScript disallows unary operators before ** without parentheses
  const remainingAfterOperand = part.substring(extract.length + res[0].length);
  const remainingStr = remainingAfterOperand.trim().toString();
  if (remainingStr.startsWith('**')) {
    throw new SyntaxError(
      'Unary operator used immediately before exponentiation expression. Parenthesis must be used to disambiguate operator precedence',
    );
  }

  ctx.lispTree = lispify(
    constants,
    part.substring(extract.length + res[0].length),
    restOfExp.next,
    createLisp<Inverse | Not | Negative | Positive | Typeof | Delete>({
      op: modifierTypes[type],
      a: ctx.lispTree,
      b: lispify(constants, extract, expectTypes[expect].next),
    }),
  );
});

setLispType(['taggedTemplate'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  // Tagged template: func`template`
  // Build a call with the literal strings array and interpolated values
  const literalIndex = res[1];
  const literal = constants.literals[parseInt(literalIndex)];
  const [, templateStr, jsExprs] = literal;

  // Extract the string parts and expression parts
  const stringParts: string[] = [];
  const expressions: Lisp[] = [];
  let currentStr = '';
  let i = 0;

  while (i < templateStr.length) {
    if (templateStr.substring(i, i + 2) === '${') {
      // Look ahead to check if this is a valid placeholder: ${digits}
      let j = i + 2;
      let exprIndex = '';
      let isValidPlaceholder = false;

      // Extract potential index and check for closing '}'
      while (j < templateStr.length && templateStr[j] !== '}') {
        exprIndex += templateStr[j];
        j++;
      }

      // Check if we found a closing '}' and the content is numeric
      if (j < templateStr.length && templateStr[j] === '}' && /^\d+$/.test(exprIndex)) {
        isValidPlaceholder = true;
      }

      if (isValidPlaceholder) {
        // Valid placeholder - add current string and the expression
        stringParts.push(currentStr);
        currentStr = '';
        expressions.push(jsExprs[parseInt(exprIndex)]);
        i = j + 1; // skip past the '}'
      } else {
        // Not a valid placeholder - treat as literal text
        currentStr += templateStr[i];
        i++;
      }
    } else {
      currentStr += templateStr[i];
      i++;
    }
  }
  stringParts.push(currentStr);

  // Create array of string literals
  const stringsArray = stringParts.map((str) =>
    createLisp<StringIndex>({
      op: LispType.StringIndex,
      a: LispType.None,
      b: String(constants.strings.push(str) - 1),
    }),
  );

  // Create the strings array
  const stringsArrayLisp = createLisp<CreateArray>({
    op: LispType.CreateArray,
    a: createLisp({
      op: LispType.None,
      a: LispType.None,
      b: LispType.None,
    }),
    b: stringsArray,
  });

  // Create call with tag function
  ctx.lispTree = lispify(
    constants,
    part.substring(res[0].length),
    expectTypes[expect].next,
    createLisp<Call>({
      op: LispType.Call,
      a: ctx.lispTree,
      b: [stringsArrayLisp, ...expressions],
    }),
  );
});

const incrementTypes = {
  '++$': LispType.IncrementBefore,
  '--$': LispType.DecrementBefore,
  '$++': LispType.IncrementAfter,
  '$--': LispType.DecrementAfter,
} as any;

setLispType(['incrementerBefore'] as const, (ctx) => {
  const { constants, part, res, expect } = ctx;
  const extract = restOfExp(constants, part.substring(2), [/^[^\s.\w$]/]);
  ctx.lispTree = lispify(
    constants,
    part.substring(extract.length + 2),
    restOfExp.next,
    createLisp<IncrementBefore | DecrementBefore>({
      op: incrementTypes[res[0] + '$'],
      a: lispify(constants, extract, expectTypes[expect].next),
      b: LispType.None,
    }),
  );
});

setLispType(['incrementerAfter'] as const, (ctx) => {
  const { constants, part, res, expect } = ctx;
  if (
    isLisp(ctx.lispTree) &&
    (ctx.lispTree[0] === LispType.Number ||
      ctx.lispTree[0] === LispType.BigInt ||
      ctx.lispTree[0] === LispType.GlobalSymbol ||
      ctx.lispTree[0] === LispType.StringIndex ||
      ctx.lispTree[0] === LispType.LiteralIndex ||
      ctx.lispTree[0] === LispType.RegexIndex)
  ) {
    throw new SyntaxError('Invalid left-hand side expression in postfix operation');
  }
  ctx.lispTree = lispify(
    constants,
    part.substring(res[0].length),
    expectTypes[expect].next,
    createLisp<IncrementAfter | DecrementAfter>({
      op: incrementTypes['$' + res[0]],
      a: ctx.lispTree,
      b: LispType.None,
    }),
  );
});

const adderTypes = {
  '&&': LispType.And,
  '||': LispType.Or,
  '??': LispType.NullishCoalescing,
  instanceof: LispType.Instanceof,
  in: LispType.In,
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
  '&&=': LispType.AndEquals,
  '||=': LispType.OrEquals,
  '??=': LispType.NullishCoalescingEquals,
} as any;

setLispType(['assign', 'assignModify', 'nullishCoalescing'] as const, (ctx) => {
  const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
  if (
    type !== 'nullishCoalescing' &&
    isLisp(ctx.lispTree) &&
    (ctx.lispTree[0] === LispType.PropOptional || ctx.lispTree[0] === LispType.CallOptional)
  ) {
    throw new SyntaxError('Invalid left-hand side in assignment');
  }
  if (res[0] === '=') {
    const patternStr = getDestructurePatternSource(ctx.lispTree);
    if (patternStr) {
      const rhsStr = part.substring(res[0].length).toString();
      const tempName = `$$_da${Math.random().toString(36).slice(2)}`;
      const expandedCode = `internal ${tempName} = (${rhsStr}); ${expandDestructure('', patternStr, tempName)}; ${tempName}`;
      ctx.lispTree = createLisp<InternalCode>({
        op: LispType.InternalBlock,
        a: lispifyBlock(new CodeString(expandedCode), constants, false, ctx),
        b: LispType.None,
      });
      return;
    }
  }
  ctx.lispTree = createLisp<
    | NullishCoalescing
    | Assigns
    | SubractEquals
    | AddEquals
    | DivideEquals
    | PowerEquals
    | MultiplyEquals
    | ModulusEquals
    | BitNegateEquals
    | BitAndEquals
    | BitOrEquals
    | UnsignedShiftRightEquals
    | ShiftLeftEquals
    | ShiftRightEquals
    | AndEquals
    | OrEquals
    | NullishCoalescingEquals
  >({
    op: adderTypes[res[0]],
    a: ctx.lispTree,
    b: lispify(
      constants,
      part.substring(res[0].length),
      expectTypes[expect].next,
      undefined,
      false,
      ctx,
    ),
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
  '&&': LispType.And,
  '||': LispType.Or,
  instanceof: LispType.Instanceof,
  in: LispType.In,
} as any;

// Combined handler for all binary operators with configurable precedence
setLispType(
  [
    'power',
    'opHigh',
    'op',
    'comparitor',
    'bitwiseShift',
    'bitwiseAnd',
    'bitwiseXor',
    'bitwiseOr',
    'boolOpAnd',
    'boolOpOr',
  ] as const,
  (ctx) => {
    const { constants, type, part, res, expect } = ctx;
    const next = [expectTypes.inlineIf.types.inlineIf, inlineIfElse];
    switch (type) {
      case 'power':
        // Right-associative: don't include power in next
        break;
      case 'opHigh':
        // opHigh should NOT stop at power - let it be consumed by the right operand
        next.push(expectTypes.splitter.types.opHigh);
      case 'op':
        next.push(expectTypes.splitter.types.op);
      case 'comparitor':
        next.push(expectTypes.splitter.types.comparitor);
      case 'bitwiseShift':
        next.push(expectTypes.splitter.types.bitwiseShift);
      case 'bitwiseAnd':
        next.push(expectTypes.splitter.types.bitwiseAnd);
      case 'bitwiseXor':
        next.push(expectTypes.splitter.types.bitwiseXor);
      case 'bitwiseOr':
        next.push(expectTypes.splitter.types.bitwiseOr);
      case 'boolOpAnd':
        next.push(expectTypes.splitter.types.boolOpAnd);
      case 'boolOpOr':
        next.push(expectTypes.splitter.types.boolOpOr);
    }
    const extract = restOfExp(constants, part.substring(res[0].length), next);
    ctx.lispTree = lispify(
      constants,
      part.substring(extract.length + res[0].length),
      restOfExp.next,
      createLisp<
        | BitAnd
        | BitOr
        | BitNegate
        | BitShiftLeft
        | BitShiftRight
        | BitUnsignedShiftRight
        | SmallerEqualThan
        | LargerEqualThan
        | SmallerThan
        | LargerThan
        | StrictNotEqual
        | NotEqual
        | StrictEqual
        | Equal
        | Plus
        | Minus
        | Divide
        | Power
        | Multiply
        | Modulus
        | And
        | Or
        | Instanceof
        | In
      >({
        op: opTypes[res[0]],
        a: ctx.lispTree,
        b: lispify(constants, extract, expectTypes[expect].next),
      }),
    );
  },
);

setLispType(['inlineIf'] as const, (ctx) => {
  const { constants, part, res, expect, generatorDepth, asyncDepth } = ctx;
  let found = false;
  const extract = part.substring(0, 0);
  let quoteCount = 1;
  while (!found && extract.length < part.length) {
    extract.end = restOfExp(constants, part.substring(extract.length + 1), [
      expectTypes.inlineIf.types.inlineIf,
      inlineIfElse,
    ]).end;
    if (part.char(extract.length) === '?') {
      quoteCount++;
    } else {
      quoteCount--;
    }
    if (!quoteCount) {
      found = true;
    }
  }
  extract.start = part.start + 1;
  const falseExpr = part.substring(res[0].length + extract.length + 1);
  if (!falseExpr.trimStart().length) {
    throw new SyntaxError('Unexpected end of expression');
  }
  ctx.lispTree = createLisp<InlineIf>({
    op: LispType.InlineIf,
    a: ctx.lispTree,
    b: createLisp<InlineIfCase>({
      op: LispType.InlineIfCase,
      a: lispifyExpr(constants, extract, undefined, ctx),
      b: lispifyExpr(constants, falseExpr, undefined, ctx),
    }),
  });
});

function extractIfElse(constants: IConstants, part: CodeString) {
  let count = 0;
  let found = part.substring(0, 0);
  let foundElse = emptyString;
  let foundTrue: CodeString | undefined;
  let first = true;
  let elseReg: RegExpExecArray | null;
  let details: restDetails = {};
  while (
    (found = restOfExp(
      constants,
      part.substring(found.end - part.start),
      [elseIf, ifElse, semiColon],
      undefined,
      undefined,
      undefined,
      details,
    )).length ||
    first
  ) {
    first = false;
    const f = part.substring(found.end - part.start).toString();

    if (f.startsWith('if')) {
      found.end++;
      count++;
    } else if (f.startsWith('else')) {
      foundTrue = part.substring(0, found.end - part.start);
      found.end++;
      count--;
      if (!count) {
        found.end--;
      }
    } else if ((elseReg = /^;?\s*else(?![\w$])/.exec(f))) {
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
      const ie = extractIfElse(
        constants,
        part.substring(found.end - part.start + (/^;?\s*else(?![\w$])/.exec(f)?.[0].length || 0)),
      );
      foundElse = ie.all;
      break;
    }
    details = {};
  }
  foundTrue = foundTrue || part.substring(0, found.end - part.start);
  return {
    all: part.substring(0, Math.max(foundTrue.end, foundElse.end) - part.start),
    true: foundTrue,
    false: foundElse,
  };
}

setLispType(['if'] as const, (ctx) => {
  const { constants, part, res, generatorDepth, asyncDepth } = ctx;
  const labels = extractStatementLabels(res[1]);
  let condition = restOfExp(constants, part.substring(res[0].length), [], '(');
  const ie = extractIfElse(constants, part.substring(res[1].length));
  const startTrue = res[0].length - res[1].length + condition.length + 1;

  let trueBlock = ie.true.substring(startTrue);
  let elseBlock = ie.false;

  condition = condition.trim();
  trueBlock = trueBlock.trim();
  elseBlock = elseBlock.trim();

  if (!trueBlock.length || /^else(?![\w$])/.test(trueBlock.toString())) {
    throw new SyntaxError('Unexpected token');
  }
  if (trueBlock.char(0) === '{') trueBlock = trueBlock.slice(1, -1);
  if (elseBlock.char(0) === '{') elseBlock = elseBlock.slice(1, -1);
  ctx.lispTree = wrapLabeledStatement(
    labels,
    createLisp<If>({
      op: LispType.If,
      a: lispifyExpr(constants, condition, undefined, ctx),
      b: createLisp<IfCase>({
        op: LispType.IfCase,
        a: lispifyBlock(trueBlock, constants, false, ctx),
        b: lispifyBlock(elseBlock, constants, false, ctx),
      }),
    }),
  ) as Lisp;
});

setLispType(['switch'] as const, (ctx) => {
  const { constants, part, res, generatorDepth, asyncDepth } = ctx;
  const labels = extractStatementLabels(res[1]);
  const test = restOfExp(constants, part.substring(res[0].length), [], '(');
  let start = part.toString().indexOf('{', res[0].length + test.length + 1);
  if (start === -1) throw new SyntaxError('Invalid switch');
  let statement = insertSemicolons(
    constants,
    restOfExp(constants, part.substring(start + 1), [], '{'),
  );
  let caseFound: RegExpExecArray | null;
  const caseTest = /^\s*(case\s|default)\s*/;
  const caseNoTestReg = /^\s*case\s*:/;
  const cases: SwitchCase[] = [];
  let defaultFound = false;
  while (
    (caseFound = caseTest.exec(statement.toString())) ||
    caseNoTestReg.test(statement.toString())
  ) {
    if (!caseFound) {
      throw new SyntaxError('Unexpected end of expression');
    }
    if (caseFound[1] === 'default') {
      if (defaultFound) throw new SyntaxError('Only one default switch case allowed');
      defaultFound = true;
    }
    const cond = restOfExp(constants, statement.substring(caseFound[0].length), [/^:/]);
    if (caseFound[1] !== 'default' && !cond.trimStart().length) {
      throw new SyntaxError('Unexpected end of expression');
    }
    let found = emptyString;
    let i = (start = caseFound[0].length + cond.length + 1);
    const bracketFound = /^\s*\{/.exec(statement.substring(i).toString());
    let exprs: Lisp[] = [];
    if (bracketFound) {
      i += bracketFound[0].length;
      found = restOfExp(constants, statement.substring(i), [], '{');
      i += found.length + 1;
      exprs = lispifyBlock(found, constants, false, ctx);
    } else {
      const notEmpty = restOfExp(constants, statement.substring(i), [caseTest]);
      if (!notEmpty.trim().length) {
        exprs = [];
        i += notEmpty.length;
      } else {
        while ((found = restOfExp(constants, statement.substring(i), [semiColon])).length) {
          i += found.length + (statement.char(i + found.length) === ';' ? 1 : 0);
          if (caseTest.test(statement.substring(i).toString())) {
            break;
          }
        }
        exprs = lispifyBlock(
          statement.substring(start, found.end - statement.start),
          constants,
          false,
          ctx,
        );
      }
    }
    statement = statement.substring(i);
    cases.push(
      createLisp<SwitchCase>({
        op: LispType.SwitchCase,
        a:
          caseFound[1] === 'default' ? LispType.None : lispifyExpr(constants, cond, undefined, ctx),
        b: exprs,
      }),
    );
  }
  ctx.lispTree = wrapLabeledStatement(
    labels,
    createLisp<Switch>({
      op: LispType.Switch,
      a: lispifyExpr(constants, test, undefined, ctx),
      b: cases,
    }),
  ) as Lisp;
});

setLispType(['dot', 'prop'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  let prop = res[0];
  let index = res[0].length;
  let op = 'prop';
  if (type === 'dot') {
    if (res[1]) {
      op = '?prop';
    }
    const matches = part.substring(res[0].length).toString().match(expectTypes.prop.types.prop);
    if (matches && matches.length) {
      prop = matches[0];
      index = prop.length + res[0].length;
    } else {
      throw new SyntaxError('Hanging dot');
    }
  } else {
    if (reservedWords.has(prop) && prop !== 'this') {
      throw new SyntaxError(`Unexpected token '${prop}'`);
    }
  }
  ctx.lispTree = lispify(
    constants,
    part.substring(index),
    expectTypes[expect].next,
    createLisp<Prop | PropOptional>({
      op: typesCreate[op],
      a: ctx.lispTree,
      b: prop,
    }),
  );
});

setLispType(['spreadArray', 'spreadObject'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  ctx.lispTree = createLisp<SpreadArray | SpreadObject>({
    op: type === 'spreadArray' ? LispType.SpreadArray : LispType.SpreadObject,
    a: LispType.None,
    b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next),
  });
});

setLispType(['return', 'throw'] as const, (ctx) => {
  const { constants, type, part, res, generatorDepth, asyncDepth } = ctx;
  const expr = part.substring(res[0].length);
  if (type === 'throw' && !expr.trimStart().length) {
    throw new SyntaxError('Unexpected end of expression');
  }
  ctx.lispTree = createLisp<Return | Throw>({
    op: type === 'return' ? LispType.Return : LispType.Throw,
    a: LispType.None,
    b: lispifyExpr(constants, expr, undefined, ctx),
  });
});

setLispType(['number', 'boolean', 'null', 'und', 'NaN', 'Infinity'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  ctx.lispTree = lispify(
    constants,
    part.substring(res[0].length),
    expectTypes[expect].next,
    createLisp<Number | BigInt | GlobalSymbol>({
      op: type === 'number' ? (res[12] ? LispType.BigInt : LispType.Number) : LispType.GlobalSymbol,
      a: LispType.None,
      b: res[12] ? res[1] : res[0],
    }),
  );
});

setLispType(['string', 'literal', 'regex'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  ctx.lispTree = lispify(
    constants,
    part.substring(res[0].length),
    expectTypes[expect].next,
    createLisp<StringIndex | LiteralIndex | RegexIndex>({
      op:
        type === 'string'
          ? LispType.StringIndex
          : type === 'literal'
            ? LispType.LiteralIndex
            : LispType.RegexIndex,
      a: LispType.None,
      b: res[1],
    }),
  );
});

function splitByCommasDestructure(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') depth--;
    if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  parts.push(cur);
  return parts;
}

function findFirstAtTopLevel(s: string, ch: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') depth--;
    if (c === ch && depth === 0) return i;
  }
  return -1;
}

function findPatternEndIdx(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
}

const validIdentifier = /^[a-zA-Z$_][a-zA-Z\d$_]*$/;
function assertIdentifier(name: string): string {
  if (!validIdentifier.test(name)) throw new SyntaxError(`Invalid destructuring target: '${name}'`);
  return name;
}

function expandDestructure(keyword: string, patternStr: string, rhsStr: string): string {
  const stmts: string[] = [];

  function genTemp(): string {
    return `$$_d${Math.random().toString(36).slice(2)}`;
  }

  function processPattern(pattern: string, src: string) {
    pattern = pattern.trim();
    if (pattern.startsWith('[')) {
      processArrayPattern(pattern.slice(1, -1), src);
    } else if (pattern.startsWith('{')) {
      processObjectPattern(pattern.slice(1, -1), src);
    }
  }

  function processArrayPattern(content: string, src: string) {
    const elements = splitByCommasDestructure(content);
    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i].trim();
      if (!elem) continue;

      if (elem.startsWith('...')) {
        const rest = elem.slice(3).trim();
        if (rest.startsWith('[') || rest.startsWith('{')) {
          const t = genTemp();
          stmts.push(`internal ${t} = ${src}.slice(${i})`);
          processPattern(rest, t);
        } else {
          stmts.push(`${keyword} ${assertIdentifier(rest)} = ${src}.slice(${i})`);
        }
        break;
      }

      const eqIdx = findFirstAtTopLevel(elem, '=');
      const target = eqIdx !== -1 ? elem.slice(0, eqIdx).trim() : elem.trim();
      const defaultVal = eqIdx !== -1 ? elem.slice(eqIdx + 1).trim() : undefined;

      if (target.startsWith('[') || target.startsWith('{')) {
        const t = genTemp();
        stmts.push(
          defaultVal !== undefined
            ? `internal ${t} = ${src}[${i}] !== undefined ? ${src}[${i}] : (${defaultVal})`
            : `internal ${t} = ${src}[${i}]`,
        );
        processPattern(target, t);
      } else {
        stmts.push(
          defaultVal !== undefined
            ? `${keyword} ${assertIdentifier(target)} = ${src}[${i}] !== undefined ? ${src}[${i}] : (${defaultVal})`
            : `${keyword} ${assertIdentifier(target)} = ${src}[${i}]`,
        );
      }
    }
  }

  function processObjectPattern(content: string, src: string) {
    const props = splitByCommasDestructure(content);
    const usedKeys: string[] = [];

    for (const prop of props) {
      const p = prop.trim();
      if (!p) continue;

      if (p.startsWith('...')) {
        // Check that rest is the last element
        const restIdx = props.indexOf(prop);
        const hasMore = props.slice(restIdx + 1).some((pp) => pp.trim().length > 0);
        if (hasMore) {
          throw new SyntaxError('Rest element must be last element');
        }
        const rest = p.slice(3).trim();
        const exclTemp = genTemp();
        const keyTemp = genTemp();
        const resTemp = genTemp();
        const exclEntries = usedKeys.map((k) => `${assertIdentifier(k)}:1`).join(',');
        stmts.push(`internal ${exclTemp} = {${exclEntries}}`);
        stmts.push(`internal ${resTemp} = {}`);
        stmts.push(
          `for (internal ${keyTemp} in ${src}) { if (!(${keyTemp} in ${exclTemp})) { ${resTemp}[${keyTemp}] = ${src}[${keyTemp}] } }`,
        );
        if (rest.startsWith('[') || rest.startsWith('{')) {
          processPattern(rest, resTemp);
        } else {
          stmts.push(`${keyword} ${assertIdentifier(rest)} = ${resTemp}`);
        }
        break;
      }

      if (p.startsWith('[')) {
        // Computed property name: [expr]: target
        let closeBracket = -1;
        let depth = 1;
        for (let ci = 1; ci < p.length; ci++) {
          if (p[ci] === '[') depth++;
          else if (p[ci] === ']') {
            depth--;
            if (depth === 0) {
              closeBracket = ci;
              break;
            }
          }
        }
        if (closeBracket !== -1) {
          const computedExpr = p.slice(1, closeBracket);
          const after = p.slice(closeBracket + 1).trim();
          if (after.startsWith(':')) {
            const valueStr = after.slice(1).trim();
            const accessor = `${src}[${computedExpr}]`;
            const eqIdx = findFirstAtTopLevel(valueStr, '=');
            const tgt =
              eqIdx !== -1 && !valueStr.slice(0, eqIdx).trim().match(/^[[{]/)
                ? valueStr.slice(0, eqIdx).trim()
                : valueStr.trim();
            const defVal =
              eqIdx !== -1 && !valueStr.slice(0, eqIdx).trim().match(/^[[{]/)
                ? valueStr.slice(eqIdx + 1).trim()
                : undefined;
            if (tgt.startsWith('[') || tgt.startsWith('{')) {
              const t = genTemp();
              stmts.push(
                defVal !== undefined
                  ? `internal ${t} = ${accessor} !== undefined ? ${accessor} : (${defVal})`
                  : `internal ${t} = ${accessor}`,
              );
              processPattern(tgt, t);
            } else {
              stmts.push(
                defVal !== undefined
                  ? `${keyword} ${assertIdentifier(tgt)} = ${accessor} !== undefined ? ${accessor} : (${defVal})`
                  : `${keyword} ${assertIdentifier(tgt)} = ${accessor}`,
              );
            }
          }
        }
        continue;
      }

      const colonIdx = findFirstAtTopLevel(p, ':');
      if (colonIdx !== -1) {
        const key = assertIdentifier(p.slice(0, colonIdx).trim());
        const valueStr = p.slice(colonIdx + 1).trim();
        usedKeys.push(key);
        const accessor = `${src}.${key}`;
        const eqIdx = findFirstAtTopLevel(valueStr, '=');
        const beforeEq = eqIdx !== -1 ? valueStr.slice(0, eqIdx).trim() : valueStr.trim();
        const isNestedPattern = beforeEq.startsWith('[') || beforeEq.startsWith('{');
        const tgt = isNestedPattern ? valueStr.trim() : beforeEq;
        const defVal =
          !isNestedPattern && eqIdx !== -1 ? valueStr.slice(eqIdx + 1).trim() : undefined;

        if (tgt.startsWith('[') || tgt.startsWith('{')) {
          const patEnd = findPatternEndIdx(tgt);
          const finalPattern = tgt.slice(0, patEnd);
          const afterPat = tgt.slice(patEnd).trim();
          const nestedDef = afterPat.startsWith('=') ? afterPat.slice(1).trim() : undefined;
          const t = genTemp();
          stmts.push(
            nestedDef !== undefined
              ? `internal ${t} = ${accessor} !== undefined ? ${accessor} : (${nestedDef})`
              : `internal ${t} = ${accessor}`,
          );
          processPattern(finalPattern, t);
        } else {
          stmts.push(
            defVal !== undefined
              ? `${keyword} ${assertIdentifier(tgt)} = ${accessor} !== undefined ? ${accessor} : (${defVal})`
              : `${keyword} ${assertIdentifier(tgt)} = ${accessor}`,
          );
        }
        continue;
      }

      const eqIdx = findFirstAtTopLevel(p, '=');
      if (eqIdx !== -1) {
        const name = assertIdentifier(p.slice(0, eqIdx).trim());
        const defaultVal = p.slice(eqIdx + 1).trim();
        usedKeys.push(name);
        stmts.push(
          `${keyword} ${name} = ${src}.${name} !== undefined ? ${src}.${name} : (${defaultVal})`,
        );
      } else {
        assertIdentifier(p);
        usedKeys.push(p);
        stmts.push(`${keyword} ${p} = ${src}.${p}`);
      }
    }
  }

  const rootTemp = genTemp();
  stmts.unshift(`var ${rootTemp} = (${rhsStr})`);
  processPattern(patternStr, rootTemp);
  return stmts.join('; ');
}

function getDestructurePatternSource(tree: LispItem): string | null {
  if (!isLisp(tree)) return null;
  const source = (tree as LispWithSource).source?.trim();
  if (source && (source.startsWith('[') || source.startsWith('{'))) {
    return source;
  }
  if (tree[0] === LispType.Group) {
    return getDestructurePatternSource(tree[2]);
  }
  return null;
}

function expandFunctionParamDestructure(
  args: string[],
  funcBody: string,
): { args: string[]; body: string } {
  const injected: string[] = [];
  const newArgs = args.map((arg, i) => {
    const a = arg.trim();
    if (a.startsWith('[') || a.startsWith('{')) {
      const tempName = `$$_p${i}`;
      // Check for a parameter default: {pattern} = defaultVal or [pattern] = defaultVal
      const patEnd = findPatternEndIdx(a);
      const patternOnly = a.slice(0, patEnd);
      const afterPat = a.slice(patEnd).trim();
      if (afterPat.startsWith('=')) {
        const defaultVal = afterPat.slice(1).trim();
        // Use temp var that applies the default, then destructure from it
        injected.push(
          expandDestructure(
            'const',
            patternOnly,
            `${tempName} !== undefined ? ${tempName} : (${defaultVal})`,
          ),
        );
      } else {
        injected.push(expandDestructure('const', patternOnly, tempName));
      }
      return tempName;
    }
    // Handle simple default: a = defaultVal or ...rest (no default)
    const eqIdx = findFirstAtTopLevel(a, '=');
    if (eqIdx !== -1 && !a.startsWith('...')) {
      const paramName = a.slice(0, eqIdx).trim();
      const defaultVal = a.slice(eqIdx + 1).trim();
      injected.push(`if (${paramName} === undefined) ${paramName} = (${defaultVal})`);
      return paramName;
    }
    return a;
  });
  if (injected.length === 0) return { args: newArgs, body: funcBody };
  return { args: newArgs, body: injected.join('; ') + '; ' + funcBody };
}

setLispType(['initializeDestructure'] as const, (ctx) => {
  const { constants, part, res, generatorDepth, asyncDepth } = ctx;
  const keyword = res[1] as string;
  const openBracket = res[2] as string;
  const closeBracket = openBracket === '[' ? ']' : '}';

  const patternContent = restOfExp(constants, part.substring(res[0].length), [], openBracket);
  const patternStr = openBracket + patternContent.toString() + closeBracket;

  const afterClose = part.substring(res[0].length + patternContent.length + 1).trimStart();
  if (!afterClose.length || afterClose.char(0) !== '=') {
    throw new SyntaxError('Destructuring declaration requires an initializer');
  }

  const rhsCode = restOfExp(constants, afterClose.substring(1).trimStart(), [semiColon]);
  const rhsStr = rhsCode.toString();

  const expandedCode = expandDestructure(keyword, patternStr, rhsStr);
  const stmts = lispifyBlock(new CodeString(expandedCode), constants, false, ctx);

  ctx.lispTree = createLisp<InternalCode>({
    op: LispType.InternalBlock,
    a: stmts,
    b: LispType.None,
  });
});

setLispType(['initialize'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  const lt =
    res[1] === 'var'
      ? LispType.Var
      : res[1] === 'let'
        ? LispType.Let
        : res[1] === 'const'
          ? LispType.Const
          : LispType.Internal;
  if (!res[3]) {
    ctx.lispTree = lispify(
      constants,
      part.substring(res[0].length),
      expectTypes[expect].next,
      createLisp<Var | Let | Const | Internal>({
        op: lt,
        a: res[2],
        b: LispType.None,
      }),
      false,
      ctx,
    );
  } else {
    const initExpr = part.substring(res[0].length);
    if (!initExpr.trimStart().length) {
      throw new SyntaxError('Unexpected end of expression');
    }
    ctx.lispTree = createLisp<Var | Let | Const | Internal>({
      op: lt,
      a: res[2],
      b: lispify(constants, initExpr, expectTypes[expect].next, undefined, false, ctx),
    });
  }
});

setLispType(
  ['function', 'inlineFunction', 'arrowFunction', 'arrowFunctionSingle'] as const,
  (ctx) => {
    const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
    const isArrow = type !== 'function' && type !== 'inlineFunction';
    const isReturn = isArrow && !res[res.length - 1];
    // For function/inlineFunction: group 1=async, group 2=*/space, group 3=name
    // For arrowFunction: group 1=async, group 2=args (may be incomplete), group 3=hasBrace
    // For arrowFunctionSingle: group 1=async, group 2=paramName, group 3=hasBrace
    const isGenerator =
      !isArrow && res[2] && res[2].trimStart().startsWith('*') ? LispType.True : LispType.None;
    const isAsync = res[1] ? LispType.True : LispType.None;
    // Re-extract args using restOfExp so defaults containing calls (a = fn()) are handled.
    // arrowFunctionSingle and arrowFunction get their args from res[2] (regex capture),
    // but function/inlineFunction regexes now stop at '(' so we use restOfExp.
    let rawArgStr: string;
    let bodyOffset: number; // offset past res[0] where body starts
    if (type === 'function' || type === 'inlineFunction') {
      // res[0] ends just after the opening '(' — extract balanced params then skip ') {'
      const argsCode = restOfExp(constants, part.substring(res[0].length), [], '(');
      rawArgStr = argsCode.toString().trim();
      // Skip closing ')' + whitespace + '{'
      bodyOffset = res[0].length + argsCode.length + 1 /* ')' */;
      const afterParen = part.substring(bodyOffset).trimStart();
      bodyOffset = part.length - afterParen.length + 1 /* '{' */;
    } else {
      rawArgStr = type === 'arrowFunctionSingle' ? (res[2] ?? '') : (res[2] ?? '');
      bodyOffset = 0; // not used; f is extracted from part.substring(res[0].length)
    }
    const rawArgs: string[] = rawArgStr
      ? splitByCommasDestructure(rawArgStr)
          .map((a) => a.trim())
          .filter(Boolean)
      : [];
    const args: string[] = [...rawArgs];
    if (!isArrow) {
      args.unshift((res[3] || '').trimStart());
    }
    let ended = false;
    args.forEach((arg: string) => {
      if (ended) throw new SyntaxError('Rest parameter must be last formal parameter');
      if (arg.startsWith('...')) ended = true;
    });
    const f = restOfExp(
      constants,
      isArrow ? part.substring(res[0].length) : part.substring(bodyOffset),
      !isReturn ? [/^}/] : [/^[,)}\]]/, semiColon],
    );
    let funcBody = isReturn ? 'return ' + f : f.toString();
    // Replace destructuring params with temp names, inject unpacking at start of body
    const funcArgs = isArrow ? args : args.slice(1);
    const expanded = expandFunctionParamDestructure(funcArgs, funcBody);
    const finalArgs = isArrow ? expanded.args : [args[0], ...expanded.args];
    funcBody = expanded.body;
    finalArgs.forEach((arg: string) => {
      if (reservedWords.has(arg.replace(/^\.\.\./, ''))) {
        throw new SyntaxError(`Unexpected token '${arg}'`);
      }
    });
    const afterFunc = isArrow ? res[0].length + f.length + 1 : bodyOffset + f.length + 1;
    ctx.lispTree = lispify(
      constants,
      part.substring(afterFunc),
      expectTypes[expect].next,
      createLisp<Function | InlineFunction | ArrowFunction>({
        op: isArrow
          ? LispType.ArrowFunction
          : type === 'function'
            ? LispType.Function
            : LispType.InlineFunction,
        a: isArrow ? [isAsync, ...finalArgs] : [isAsync, isGenerator, ...finalArgs],
        b: constants.eager
          ? lispifyFunction(
              new CodeString(funcBody),
              constants,
              false,
              isArrow
                ? { generatorDepth: 0, asyncDepth: 0 }
                : {
                    generatorDepth: isGenerator === LispType.True ? generatorDepth + 1 : 0,
                    asyncDepth: isAsync === LispType.True ? asyncDepth + 1 : 0,
                  },
            )
          : funcBody,
      }),
    );
  },
);

const iteratorRegex =
  /^((let|var|const|internal)\s+)?\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s+(in|of)(?![\w$])/;
const iteratorDestructureRegex = /^((let|var|const|internal)\s+)\s*([[{])/;
setLispType(['for', 'do', 'while'] as const, (ctx) => {
  const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
  const labels = extractStatementLabels(res[1]);
  let i = 0;
  let startStep: LispItem = LispType.True;
  let startInternal: Lisp[] = [];
  let getIterator: Lisp | LispType.None = LispType.None;
  let beforeStep: LispItem = LispType.None;
  let checkFirst = LispType.True;
  let condition: LispItem;
  let step: LispItem = LispType.True;
  let body: CodeString;
  // res[2] is the optional ' await' group from the for regex
  const isForAwait: LispItem = type === 'for' && res[2] ? LispType.True : LispType.None;
  switch (type) {
    case 'while': {
      i = part.toString().indexOf('(') + 1;
      const extract = restOfExp(constants, part.substring(i), [], '(');
      if (!extract.trimStart().length) {
        throw new SyntaxError('Unexpected end of expression');
      }
      condition = lispifyReturnExpr(constants, extract);
      body = restOfExp(constants, part.substring(i + extract.length + 1)).trim();
      if (body.char(0) === '{') body = body.slice(1, -1);
      break;
    }
    case 'for': {
      i = part.toString().indexOf('(') + 1;
      const args: CodeString[] = [];
      let extract2 = emptyString;
      for (let k = 0; k < 3; k++) {
        extract2 = restOfExp(constants, part.substring(i), [/^[;)]/]);
        args.push(extract2.trim());
        i += extract2.length + 1;
        if (part.char(i - 1) === ')') break;
      }
      let iterator: RegExpExecArray | null;
      let iteratorDestructure: RegExpExecArray | null;
      if (args.length === 1 && (iterator = iteratorRegex.exec(args[0].toString()))) {
        const iterableExpr = args[0].substring(iterator[0].length);
        if (!iterableExpr.trimStart().length) {
          throw new SyntaxError('Unexpected end of expression');
        }
        if (iterator[4] === 'of') {
          ((getIterator = lispifyReturnExpr(constants, iterableExpr)),
            (startInternal = isForAwait ? [asyncOfStart2, asyncOfStart3] : [ofStart2, ofStart3]));
          condition = ofCondition;
          step = isForAwait ? asyncOfStep : ofStep;
          beforeStep = lispify(
            constants,
            new CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$next.value'),
            ['initialize'],
          );
        } else {
          if (isForAwait) {
            throw new SyntaxError("Unexpected token 'in'");
          }
          ((getIterator = lispifyReturnExpr(constants, iterableExpr)),
            (startInternal = [inStart2, inStart3]));
          step = inStep;
          condition = inCondition;
          beforeStep = lispify(
            constants,
            new CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$keys[$$keyIndex]'),
            ['initialize'],
          );
        }
      } else if (
        args.length === 1 &&
        (iteratorDestructure = iteratorDestructureRegex.exec(args[0].toString()))
      ) {
        // Destructuring pattern in for-of/for-in: for (const [a,b] of ...) or for (const {a,b} of ...)
        const keyword = iteratorDestructure[1].trim(); // 'let', 'var', or 'const'
        const openBracket = iteratorDestructure[3]; // '[' or '{'
        const closeBracket = openBracket === '[' ? ']' : '}';
        // Skip past keyword and whitespace to get to the opening bracket
        const keywordPrefixLen = iteratorDestructure[0].length - 1; // length up to but not including the bracket
        const patternContent = restOfExp(
          constants,
          args[0].substring(keywordPrefixLen + 1),
          [],
          openBracket,
        );
        const patternStr = openBracket + patternContent.toString() + closeBracket;
        // After the closing bracket: ' of expr' or ' in expr'
        const afterClose = args[0]
          .substring(keywordPrefixLen + 1 + patternContent.length + 1)
          .trimStart();
        const inOfMatch = /^(in|of)(?![\w$])\s*/.exec(afterClose.toString());
        if (!inOfMatch) throw new SyntaxError('Invalid for loop definition');
        const inOf = inOfMatch[1];
        const iterExpr = afterClose.substring(inOfMatch[0].length);
        if (!iterExpr.trimStart().length) {
          throw new SyntaxError('Unexpected end of expression');
        }
        const tempVarName = '$$_fv';
        if (inOf === 'of') {
          getIterator = lispifyReturnExpr(constants, iterExpr);
          startInternal = isForAwait ? [asyncOfStart2, asyncOfStart3] : [ofStart2, ofStart3];
          condition = ofCondition;
          step = isForAwait ? asyncOfStep : ofStep;
          const expandedCode = expandDestructure(keyword, patternStr, tempVarName);
          const stmts = lispifyBlock(new CodeString(expandedCode), constants, false, ctx);
          beforeStep = createLisp<InternalCode>({
            op: LispType.InternalBlock,
            a: [
              lispify(constants, new CodeString(`${keyword} ${tempVarName} = $$next.value`), [
                'initialize',
              ]),
              ...stmts,
            ],
            b: LispType.None,
          });
        } else {
          getIterator = lispifyReturnExpr(constants, iterExpr);
          startInternal = [inStart2, inStart3];
          step = inStep;
          condition = inCondition;
          const expandedCode = expandDestructure(keyword, patternStr, tempVarName);
          const stmts = lispifyBlock(new CodeString(expandedCode), constants, false, ctx);
          beforeStep = createLisp<InternalCode>({
            op: LispType.InternalBlock,
            a: [
              lispify(constants, new CodeString(`${keyword} ${tempVarName} = $$keys[$$keyIndex]`), [
                'initialize',
              ]),
              ...stmts,
            ],
            b: LispType.None,
          });
        }
      } else if (args.length === 3) {
        const [startArg, conditionArg, stepArg] = args;
        if (startArg.length) {
          startStep = lispifyExpr(constants, startArg, startingExecpted, ctx);
        }
        if (conditionArg.length) {
          condition = lispifyReturnExpr(constants, conditionArg);
        } else {
          condition = LispType.True;
        }
        if (stepArg.length) {
          step = lispifyExpr(constants, stepArg, undefined, ctx);
        }
      } else {
        throw new SyntaxError('Invalid for loop definition');
      }
      body = restOfExp(constants, part.substring(i)).trim();
      if (body.char(0) === '{') body = body.slice(1, -1);

      break;
    }
    case 'do': {
      checkFirst = LispType.None;
      const isBlock = !!res[2];
      body = restOfExp(constants, part.substring(res[0].length), isBlock ? [/^\}/] : [semiColon]);
      condition = lispifyReturnExpr(
        constants,
        restOfExp(
          constants,
          part.substring(part.toString().indexOf('(', res[0].length + body.length) + 1),
          [],
          '(',
        ),
      );
      break;
    }
  }
  const a = [
    checkFirst,
    startInternal,
    getIterator,
    startStep,
    step,
    condition,
    beforeStep,
    isForAwait,
    labels,
  ] as LispItem;
  ctx.lispTree = createLisp<Loop>({
    op: LispType.Loop,
    a,
    b: lispifyBlock(body, constants, false, ctx),
  });
});

setLispType(['block'] as const, (ctx) => {
  const { constants, part, res, generatorDepth, asyncDepth } = ctx;
  const labels = extractStatementLabels(res[1]);
  ctx.lispTree = wrapLabeledStatement(
    labels,
    createLisp<Block>({
      op: LispType.Block,
      a: lispifyBlock(
        restOfExp(constants, part.substring(res[0].length), [], '{'),
        constants,
        false,
        ctx,
      ),
      b: LispType.None,
    }),
  ) as Lisp;
});

setLispType(['loopAction'] as const, (ctx) => {
  const { part, res } = ctx;
  const remaining = part.substring(res[0].length).trimStart();
  if (remaining.length && !res[2]) {
    throw new SyntaxError(`Unexpected token '${remaining.char(0)}'`);
  }
  ctx.lispTree = createLisp<LoopAction>({
    op: LispType.LoopAction,
    a: res[1],
    b: (res[2] || LispType.None) as StatementLabel,
  });
});

const catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s*\))?|finally)\s*\{/;
const catchEmptyBindingReg = /^\s*catch\s*\(\s*\)/;
const catchReservedBindingReg =
  /^\s*catch\s*\(\s*(break|case|catch|continue|debugger|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with|class|const|enum|export|extends|implements|import|interface|let|package|private|protected|public|static|super|yield|await)\s*\)/;
const finallyKeywordReg = /^\s*finally\b/;
setLispType(['try'] as const, (ctx) => {
  const { constants, part, res, generatorDepth, asyncDepth } = ctx;
  const body = restOfExp(constants, part.substring(res[0].length), [], '{');
  const afterBody = part.substring(res[0].length + body.length + 1).toString();

  // Check for empty catch binding: catch ()
  if (catchEmptyBindingReg.test(afterBody)) {
    throw new ParseError("Unexpected token ')'", part.toString());
  }

  // Check for reserved word in catch binding: catch (for)
  const reservedMatch = catchReservedBindingReg.exec(afterBody);
  if (reservedMatch) {
    throw new ParseError(`Unexpected token '${reservedMatch[1]}'`, part.toString());
  }

  // Check for finally without a block
  const finallyMatch = finallyKeywordReg.exec(afterBody);
  if (finallyMatch && !/^\s*\{/.test(afterBody.substring(finallyMatch[0].length))) {
    throw new ParseError('Unexpected token', part.toString());
  }

  let catchRes = catchReg.exec(afterBody);
  let finallyBody;
  let exception = '';
  let catchBody;
  let offset = 0;

  if (!catchRes) {
    throw new ParseError('Missing catch or finally after try', part.toString());
  }

  if (catchRes[1].startsWith('catch')) {
    catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
    exception = catchRes![3] || ''; // Use group 3 for the identifier, or empty string if optional catch binding
    catchBody = restOfExp(
      constants,
      part.substring(res[0].length + body.length + 1 + catchRes![0].length),
      [],
      '{',
    );
    offset = res[0].length + body.length + 1 + catchRes![0].length + catchBody.length + 1;
    if (
      (catchRes = catchReg.exec(part.substring(offset).toString())) &&
      catchRes[1].startsWith('finally')
    ) {
      finallyBody = restOfExp(constants, part.substring(offset + catchRes[0].length), [], '{');
    }
  } else {
    finallyBody = restOfExp(
      constants,
      part.substring(res[0].length + body.length + 1 + catchRes![0].length),
      [],
      '{',
    );
  }
  const b = [
    exception,
    lispifyBlock(insertSemicolons(constants, catchBody || emptyString), constants, false, ctx),
    lispifyBlock(insertSemicolons(constants, finallyBody || emptyString), constants, false, ctx),
  ] as LispItem;
  ctx.lispTree = wrapLabeledStatement(
    extractStatementLabels(res[1]),
    createLisp<Try>({
      op: LispType.Try,
      a: lispifyBlock(insertSemicolons(constants, body), constants, false, ctx),
      b,
    }),
  ) as Lisp;
});

setLispType(['void', 'await'] as const, (ctx) => {
  const { constants, type, part, res, expect } = ctx;
  const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
  if (!extract.trimStart().length) {
    throw new SyntaxError('Unexpected end of expression');
  }
  ctx.lispTree = lispify(
    constants,
    part.substring(res[0].length + extract.length),
    expectTypes[expect].next,
    createLisp<Void | Await>({
      op: type === 'void' ? LispType.Void : LispType.Await,
      a: lispify(constants, extract),
      b: LispType.None,
    }),
  );
});

setLispType(['yield'] as const, (ctx) => {
  const { constants, part, res, expect, generatorDepth } = ctx;
  if (generatorDepth === 0) {
    throw new SyntaxError('Unexpected token');
  }
  const isDelegate = res[0].trimEnd().endsWith('*');
  const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
  if (isDelegate && !extract.trimStart().length) {
    throw new SyntaxError('Unexpected end of expression');
  }
  ctx.lispTree = lispify(
    constants,
    part.substring(res[0].length + extract.length),
    expectTypes[expect].next,
    createLisp<Yield | YieldDelegate>({
      op: isDelegate ? LispType.YieldDelegate : LispType.Yield,
      a: lispify(constants, extract),
      b: LispType.None,
    }),
  );
});

setLispType(['new'] as const, (ctx) => {
  const { constants, part, res, expect } = ctx;
  let i = res[0].length;
  const obj = restOfExp(constants, part.substring(i), [], undefined, '(');
  if (!obj.trimStart().length) {
    throw new SyntaxError('Unexpected end of expression');
  }
  i += obj.length + 1;
  const args: CodeString[] = [];
  if (part.char(i - 1) === '(') {
    const argsString = restOfExp(constants, part.substring(i), [], '(');
    i += argsString.length + 1;
    let found: CodeString;
    let j = 0;
    while ((found = restOfExp(constants, argsString.substring(j), [/^,/])).length) {
      j += found.length + 1;
      args.push(found.trim());
    }
  }
  ctx.lispTree = lispify(
    constants,
    part.substring(i),
    expectTypes.expEdge.next,
    createLisp({
      op: LispType.New,
      a: lispify(constants, obj, expectTypes.initialize.next),
      b: args.map((arg) => lispify(constants, arg, expectTypes.initialize.next)),
    }),
  );
});

const ofStart2 = lispify(
  { maxDepth: 10 } as any,
  new CodeString('let $$iterator = $$obj[Symbol.iterator]()'),
  ['initialize'],
);
const ofStart3 = lispify(
  { maxDepth: 10 } as any,
  new CodeString('let $$next = $$iterator.next()'),
  ['initialize'],
);
const ofCondition = lispify({ maxDepth: 10 } as any, new CodeString('return !$$next.done'), [
  'initialize',
]);
const ofStep = lispify({ maxDepth: 10 } as any, new CodeString('$$next = $$iterator.next()'));
// for-await-of: the executor replaces $$obj with the async iterator before startInternal runs.
// startInternal skips the iterator creation ($$obj is already the iterator) and just primes $$next.
const asyncOfStart2 = lispify({ maxDepth: 10 } as any, new CodeString('let $$iterator = $$obj'), [
  'initialize',
]);
const asyncOfStart3 = lispify(
  { maxDepth: 10 } as any,
  new CodeString('let $$next = $$iterator.next()'),
  ['initialize'],
);
const asyncOfStep = lispify({ maxDepth: 10 } as any, new CodeString('$$next = $$iterator.next()'));
const inStart2 = lispify(
  { maxDepth: 10 } as any,
  new CodeString('let $$keys = Object.keys($$obj)'),
  ['initialize'],
);
const inStart3 = lispify({ maxDepth: 10 } as any, new CodeString('let $$keyIndex = 0'), [
  'initialize',
]);
const inStep = lispify({ maxDepth: 10 } as any, new CodeString('$$keyIndex++'));
const inCondition = lispify(
  { maxDepth: 10 } as any,
  new CodeString('return $$keyIndex < $$keys.length'),
  ['initialize'],
);

function lispify(
  constants: IConstants,
  part: CodeString,
  expected?: readonly string[],
  lispTree?: Lisp,
  topLevel = false,
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0 },
): Lisp {
  const { generatorDepth, asyncDepth } = depthCtx;
  lispTree = lispTree || NullLisp;
  expected = expected || expectTypes.initialize.next;
  if (part === undefined) return lispTree;

  part = part.trimStart();
  const str = part.toString();
  if (!part.length && !expected.includes('expEnd')) {
    throw new SyntaxError('Unexpected end of expression');
  }
  if (!part.length) return lispTree;

  const ctx: LispCallbackCtx = {
    constants,
    type: '',
    part,
    res: [],
    expect: '',
    lispTree,
    generatorDepth,
    asyncDepth,
  };

  let res: any;
  for (const expect of expected) {
    if (expect === 'expEnd') {
      continue;
    }
    for (const type in expectTypes[expect].types) {
      if (type === 'expEnd') {
        continue;
      }
      if ((res = expectTypes[expect].types[type].exec(str))) {
        lastType = type;
        lastLastLastLastPart = lastLastLastPart;
        lastLastLastPart = lastLastPart;
        lastLastPart = lastPart;
        lastPart = part;
        ctx.type = type;
        ctx.part = part;
        ctx.res = res;
        ctx.expect = expect;
        try {
          lispTypes.get(type)?.(ctx as LispCallbackCtx & { type: string });
        } catch (e) {
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
    if (topLevel) {
      throw new ParseError(`Unexpected token after ${lastType}: ${part.char(0)}`, str);
    }
    throw new SyntaxError(`Unexpected token after ${lastType}: ${part.char(0)}`);
  }
  return ctx.lispTree;
}

const startingExpectedWithoutSingle = startingExecpted.filter((r) => r !== 'expSingle');

function lispifyExpr(
  constants: IConstants,
  str: CodeString,
  expected?: readonly string[],
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0 },
): Lisp {
  if (!str.trimStart().length) return NullLisp;
  const subExpressions: CodeString[] = [];
  let sub: CodeString;
  let pos = 0;
  expected = expected || expectTypes.initialize.next;
  if (expected.includes('expSingle')) {
    if (testMultiple(str.toString(), Object.values(expectTypes.expSingle.types))) {
      return lispify(constants, str, ['expSingle'], undefined, true, depthCtx);
    }
  }
  if (expected === startingExecpted) expected = startingExpectedWithoutSingle;
  while ((sub = restOfExp(constants, str.substring(pos), [/^,/])).length) {
    subExpressions.push(sub.trimStart());
    pos += sub.length + 1;
  }
  if (subExpressions.length === 1) {
    return lispify(constants, str, expected, undefined, true, depthCtx);
  }
  if (expected.includes('initialize')) {
    const defined = expectTypes.initialize.types.initialize.exec(subExpressions[0].toString());
    if (defined) {
      return createLisp<InternalCode>({
        op: LispType.InternalBlock,
        a: subExpressions.map((str, i) =>
          lispify(
            constants,
            i ? new CodeString(defined![1] + ' ' + str) : str,
            ['initialize'],
            undefined,
            true,
            depthCtx,
          ),
        ),
        b: LispType.None,
      });
    } else if (expectTypes.initialize.types.return.exec(subExpressions[0].toString())) {
      return lispify(constants, str, expected, undefined, true, depthCtx);
    }
  }
  const exprs = subExpressions.map((str) =>
    lispify(constants, str, expected, undefined, true, depthCtx),
  );
  return createLisp<Expression>({ op: LispType.Expression, a: exprs, b: LispType.None });
}

export function lispifyReturnExpr(constants: IConstants, str: CodeString) {
  return createLisp<Return>({
    op: LispType.Return,
    a: LispType.None,
    b: lispifyExpr(constants, str),
  });
}

export function lispifyBlock(
  str: CodeString,
  constants: IConstants,
  expression = false,
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0 },
): Lisp[] {
  str = insertSemicolons(constants, str);
  if (!str.trim().length) return [];
  const parts: CodeString[] = [];
  let part: CodeString;
  let pos = 0;
  let start = 0;
  let details: restDetails = {};
  let skipped = false;
  let isInserted = false;
  while (
    (part = restOfExp(
      constants,
      str.substring(pos),
      [semiColon],
      undefined,
      undefined,
      undefined,
      details,
    )).length
  ) {
    isInserted = !!(str.char(pos + part.length) && str.char(pos + part.length) !== ';');
    pos += part.length + (isInserted ? 0 : 1);
    if (/^\s*else(?![\w$])/.test(str.substring(pos).toString())) {
      skipped = true;
    } else if (
      details['words']?.includes('do') &&
      /^\s*while(?![\w$])/.test(str.substring(pos).toString())
    ) {
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
  return parts
    .map((str) => str.trimStart())
    .filter((str) => str.length)
    .map((str) => {
      return lispifyExpr(constants, str.trimStart(), startingExecpted, depthCtx);
    });
}

export function lispifyFunction(
  str: CodeString,
  constants: IConstants,
  expression = false,
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0 },
): Lisp[] {
  if (!str.trim().length) return [];
  const tree = lispifyBlock(str, constants, expression, depthCtx);
  hoist(tree);
  return tree;
}

function hoist(item: LispItem, res: Lisp[] = []): boolean {
  if (isLisp(item)) {
    if (!isLisp<LispFamily>(item)) return false;
    const [op, a, b] = item;
    if (
      op === LispType.Labeled ||
      op === LispType.Try ||
      op === LispType.If ||
      op === LispType.Loop ||
      op === LispType.Switch
    ) {
      hoist(a, res);
      hoist(b, res);
    } else if (op === LispType.Var) {
      res.push(createLisp({ op: LispType.Var, a: a, b: LispType.None }));
    } else if (op === LispType.Function && a[2]) {
      res.push(item);
      return true;
    }
  } else if (Array.isArray(item)) {
    const rep: LispItemSingle[] = [];
    for (const it of item) {
      if (!hoist(it, res)) {
        rep.push(it);
      }
    }
    if (rep.length !== item.length) {
      item.length = 0;
      item.push(...res, ...rep);
    }
  }
  return false;
}

const closingsNoInsertion = /^(\})\s*(catch|finally|else|while|instanceof)(?![\w$])/;
//  \w|)|] \n \w = 2                                  // \} \w|\{ = 5
const colonsRegex = /^((([\w$\])"'`]|\+\+|--)\s*\r?\n\s*([\w$+\-!~]))|(\}\s*[\w$!~+\-{("'`]))/;

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
  let pendingDoWhile = false;
  const inserted = insertedSemicolons.get(str.ref) || new Array(str.ref.str.length);
  while (
    (sub = restOfExp(constants, rest, [], undefined, undefined, [colonsRegex], details)).length
  ) {
    let valid = false;
    let part = sub;
    let edge = sub.length;
    if (details.regRes) {
      valid = true;
      const [, , a, , , b] = details.regRes;
      edge = details.regRes[3] === '++' || details.regRes[3] === '--' ? sub.length + 1 : sub.length;
      part = rest.substring(0, edge);
      if (b) {
        const res = closingsNoInsertion.exec(rest.substring(sub.length - 1).toString());
        if (res) {
          if (res[2] === 'while') {
            if (details.lastWord === 'do') {
              valid = false;
              pendingDoWhile = true;
            } else {
              valid = true;
            }
          } else {
            valid = false;
          }
        } else if (
          details.lastWord === 'function' &&
          details.regRes[5][0] === '}' &&
          details.regRes[5].slice(-1) === '('
        ) {
          valid = false;
        }
      } else if (a) {
        if (pendingDoWhile && details.lastWord === 'while') {
          valid = true;
          pendingDoWhile = false;
        } else if (
          details.lastWord === 'if' ||
          details.lastWord === 'while' ||
          details.lastWord === 'for' ||
          details.lastWord === 'else'
        ) {
          valid = !!details.bodyContentAfterKeyword;
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
    done = str[i] === '/' && !escape;
    escape = str[i] === '\\' && !escape;
    cancel = str[i] === '\n';
    i++;
  }
  const after = str.substring(i);
  cancel = cancel || !done || /^\s*\d/.test(after);
  if (cancel) return null;
  const flags = /^[a-z]*/.exec(after);
  if (/^\s+[\w$]/.test(str.substring(i + flags![0].length))) {
    return null;
  }
  const regexPattern = str.substring(1, i - 1);
  const regexFlags = (flags && flags[0]) || '';
  try {
    new RegExp(regexPattern, regexFlags);
  } catch (e) {
    if (e instanceof SyntaxError) throw e;
  }
  return {
    regex: regexPattern,
    flags: regexFlags,
    length: i + ((flags && flags[0].length) || 0),
  };
}

const notDivide = /(typeof|delete|instanceof|return|in|of|throw|new|void|do|if)$/;
const possibleDivide = /^([\w$\])]|\+\+|--)[\s/]/;
export function extractConstants(
  constants: IConstants,
  str: string,
  currentEnclosure = '',
  depth = 0,
): { str: string; length: number } {
  if (depth > constants.maxDepth) {
    throw new SandboxCapabilityError('Maximum expression depth exceeded');
  }
  let quote;
  let extract: (string | number)[] = [];
  let escape = false;
  let regexFound: IRegEx | null;
  let comment = '';
  let commentStart = -1;
  let currJs: string[] = [];
  let char = '';
  const strRes: (string | number)[] = [];
  const enclosures: string[] = [];
  let isPossibleDivide: RegExpExecArray | null = null;
  let i = 0;
  for (i = 0; i < str.length; i++) {
    char = str[i];
    if (comment) {
      if (char === comment) {
        if (comment === '*' && str[i + 1] === '/') {
          comment = '';
          i++;
        } else if (comment === '\n') {
          comment = '';
          strRes.push('\n');
        }
      }
    } else {
      if (escape) {
        escape = false;
        extract.push(char);
        continue;
      }

      if (quote) {
        if (quote === '`' && char === '$' && str[i + 1] === '{') {
          const skip = extractConstants(constants, str.substring(i + 2), '{', depth + 1);
          if (!skip.str.trim().length) {
            throw new SyntaxError('Unexpected end of expression');
          }
          currJs.push(skip.str);
          extract.push('${', currJs.length - 1, `}`);
          i += skip.length + 2;
        } else if (quote === char) {
          if (quote === '`') {
            const li = createLisp<Literal>({
              op: LispType.Literal,
              a: unraw(extract.join('')),
              b: [],
            });
            li.tempJsStrings = currJs;
            constants.literals.push(li);
            strRes.push(`\``, constants.literals.length - 1, `\``);
          } else {
            constants.strings.push(unraw(extract.join('')));
            strRes.push(`"`, constants.strings.length - 1, `"`);
          }
          quote = null;
          extract = [];
        } else {
          extract.push(char);
        }
      } else {
        if (char === "'" || char === '"' || char === '`') {
          currJs = [];
          quote = char;
        } else if (closings[currentEnclosure] === char && !enclosures.length) {
          return { str: strRes.join(''), length: i };
        } else if (closings[char]) {
          enclosures.push(char);
          strRes.push(char);
        } else if (closings[enclosures[enclosures.length - 1]] === char) {
          enclosures.pop();
          strRes.push(char);
        } else if (char === '/' && (str[i + 1] === '*' || str[i + 1] === '/')) {
          comment = str[i + 1] === '*' ? '*' : '\n';
          commentStart = i;
        } else if (
          char === '/' &&
          !isPossibleDivide &&
          (regexFound = checkRegex(str.substring(i)))
        ) {
          constants.regexes.push(regexFound);
          strRes.push(`/`, constants.regexes.length - 1, `/r`);
          i += regexFound.length - 1;
        } else {
          strRes.push(char);
        }

        if (!isPossibleDivide || !space.test(char)) {
          if ((isPossibleDivide = possibleDivide.exec(str.substring(i)))) {
            if (notDivide.test(str.substring(0, i + isPossibleDivide[1].length))) {
              isPossibleDivide = null;
            }
          }
        }
      }
      escape = !!(quote && char === '\\');
    }
  }

  if (quote) {
    throw new SyntaxError(`Unclosed '${quote}'`);
  }
  if (comment) {
    if (comment === '*') {
      throw new SyntaxError(`Unclosed comment '/*': ${str.substring(commentStart)}`);
    }
  }
  return { str: strRes.join(''), length: i };
}

export default function parse(
  code: string,
  eager = false,
  expression = false,
  maxParserRecursionDepth = 256,
): IExecutionTree {
  if (typeof code !== 'string') throw new ParseError(`Cannot parse ${code}`, String(code));
  let str = ' ' + code;
  const constants: IConstants = {
    strings: [],
    literals: [],
    regexes: [],
    eager,
    maxDepth: maxParserRecursionDepth,
  };
  str = extractConstants(constants, str).str;

  for (const l of constants.literals) {
    l[2] = l.tempJsStrings!.map((js: string) => lispifyExpr(constants, new CodeString(js)));
    delete l.tempJsStrings;
  }
  return { tree: lispifyFunction(new CodeString(str), constants, expression), constants };
}
