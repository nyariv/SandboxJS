import { CodeString, isLisp, LispType, reservedWords } from '../../utils';
import type {
  ArrayProp,
  Call,
  CallOptional,
  CreateArray,
  CreateObject,
  Group,
  InternalCode,
  KeyVal,
  Lisp,
  Prop,
  PropOptional,
  SpreadArray,
  SpreadObject,
} from '../lisp';
import type { RegisterLispTypesDeps } from './shared';

export function registerStructureLispTypes({
  NullLisp,
  createLisp,
  emptyString,
  expectTypes,
  expandDestructure,
  findPatternEndIdx,
  lispify,
  lispifyBlock,
  lispifyExpr,
  restOfExp,
  setLispType,
}: RegisterLispTypesDeps) {
  type LispWithSource = Lisp & { source?: string };

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
    const { constants, type, part, res, expect } = ctx;
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
        l = lispifyExpr(constants, arrayPropExpr, undefined, {
          ...ctx,
          lispDepth: ctx.lispDepth + 1,
        });
        break;
      }
      case 'call':
      case 'createArray':
        l = arg.map((e) => lispify(constants, e, [...next, 'spreadArray'], undefined, false, ctx));
        break;
      case 'createObject':
        l = arg.map((str) => {
          str = str.trimStart();
          let value: Lisp;
          let key: string | Lisp = '';
          if (str.char(0) === '[') {
            const innerExpr = restOfExp(constants, str.substring(1), [], '[');
            const afterBracket = str.substring(1 + innerExpr.length + 1).trimStart();
            key = lispify(constants, innerExpr, next);
            if (afterBracket.length > 0 && afterBracket.char(0) === ':') {
              value = lispify(constants, afterBracket.substring(1));
            } else if (afterBracket.length > 0 && afterBracket.char(0) === '(') {
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
            value = lispify(
              constants,
              new CodeString('function ' + str.toString().replace(key, '')),
            );
          } else {
            const extract = restOfExp(constants, str, [/^:/]);
            key = lispify(constants, extract, [...next, 'spreadObject']) as Prop;

            if (isLisp(key) && key[0] === LispType.SpreadObject) {
              value = NullLisp;
            } else {
              if (key[0] === LispType.Prop) {
                key = (key as Prop)[2];
              }

              if (str.length > extract.length && str.char(extract.length) === ':') {
                value = lispify(constants, str.substring(extract.length + 1));
              } else {
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
    ctx.lispTree = lispify(
      constants,
      part.substring(i + 1),
      expectTypes[expect].next,
      currentTree,
      false,
      ctx,
    );
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
    } else if (reservedWords.has(prop) && prop !== 'this') {
      throw new SyntaxError(`Unexpected token '${prop}'`);
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
      false,
      ctx,
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
}
