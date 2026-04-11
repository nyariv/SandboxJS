import { unraw } from '../utils/unraw';
import { CodeString, isLisp, LispType, SandboxCapabilityError } from '../utils';
import { registerLispTypes } from './lispTypes';
import type {
  Expression,
  ExtractLispA,
  ExtractLispB,
  ExtractLispOp,
  IConstants,
  IExecutionTree,
  IRegEx,
  InternalCode,
  Labeled,
  Lisp,
  LispCallback,
  LispCallbackCtx,
  LispDepthCtx,
  LispFamily,
  LispItem,
  LispItemSingle,
  Literal,
  None,
  Return,
} from './lisp';

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

registerLispTypes({
  NullLisp,
  ParseError,
  createLisp,
  emptyString,
  expectTypes,
  expandDestructure,
  expandFunctionParamDestructure,
  extractStatementLabels,
  findPatternEndIdx,
  getDestructurePatternSource,
  insertSemicolons,
  lispify,
  lispifyBlock,
  lispifyExpr,
  lispifyFunction,
  lispifyReturnExpr,
  restOfExp,
  semiColon,
  setLispType,
  splitByCommasDestructure,
  startingExecpted,
  wrapLabeledStatement,
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

function lispify(
  constants: IConstants,
  part: CodeString,
  expected?: readonly string[],
  lispTree?: Lisp,
  topLevel = false,
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0, lispDepth: 0 },
): Lisp {
  if (depthCtx.lispDepth > constants.maxDepth) {
    throw new SandboxCapabilityError('Maximum expression depth exceeded');
  }
  const { generatorDepth, asyncDepth, lispDepth } = depthCtx;
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
    lispDepth,
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
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0, lispDepth: 0 },
): Lisp {
  if (depthCtx.lispDepth > constants.maxDepth) {
    throw new SandboxCapabilityError('Maximum expression depth exceeded');
  }
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
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0, lispDepth: 0 },
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
  depthCtx: LispDepthCtx = { generatorDepth: 0, asyncDepth: 0, lispDepth: 0 },
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
