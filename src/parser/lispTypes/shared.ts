import type { CodeString } from '../../utils';
import type {
  ExtractLispA,
  ExtractLispB,
  ExtractLispOp,
  IConstants,
  Lisp,
  LispCallback,
  LispDepthCtx,
  LispItem,
  None,
  Return,
} from '../lisp';

export interface RegisterLispTypesDeps {
  NullLisp: None;
  ParseError: new (message: string, code: string) => Error;
  createLisp: <L extends Lisp>(obj: {
    op: ExtractLispOp<L>;
    a: ExtractLispA<L>;
    b: ExtractLispB<L>;
  }) => L;
  emptyString: CodeString;
  expectTypes: Record<string, { types: Record<string, RegExp>; next: string[] }>;
  expandDestructure: (keyword: string, patternStr: string, rhsStr: string) => string;
  expandFunctionParamDestructure: (
    args: string[],
    funcBody: string,
  ) => { args: string[]; body: string };
  extractStatementLabels: (prefix?: string) => string[];
  findPatternEndIdx: (s: string) => number;
  getDestructurePatternSource: (tree: LispItem) => string | null;
  insertSemicolons: (constants: IConstants, str: CodeString) => CodeString;
  lispify: (
    constants: IConstants,
    part: CodeString,
    expected?: readonly string[],
    lispTree?: Lisp,
    topLevel?: boolean,
    depthCtx?: LispDepthCtx,
  ) => Lisp;
  lispifyBlock: (
    str: CodeString,
    constants: IConstants,
    expression?: boolean,
    depthCtx?: LispDepthCtx,
  ) => Lisp[];
  lispifyExpr: (
    constants: IConstants,
    str: CodeString,
    expected?: readonly string[],
    depthCtx?: LispDepthCtx,
  ) => Lisp;
  lispifyFunction: (
    str: CodeString,
    constants: IConstants,
    expression?: boolean,
    depthCtx?: LispDepthCtx,
  ) => Lisp[];
  lispifyReturnExpr: (constants: IConstants, str: CodeString) => Return;
  restOfExp: ((
    constants: IConstants,
    part: CodeString,
    tests?: RegExp[],
    quote?: string,
    firstOpening?: string,
    closingsTests?: RegExp[],
    details?: any,
    depth?: number,
  ) => CodeString) & { next: string[] };
  semiColon: RegExp;
  setLispType: <T extends readonly string[]>(types: T, fn: LispCallback<T[number]>) => void;
  splitByCommasDestructure: (s: string) => string[];
  startingExecpted: readonly string[];
  wrapLabeledStatement: <T extends Lisp>(labels: string[], statement: T) => Lisp;
}
