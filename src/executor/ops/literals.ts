import { addOps, literalRegex, checkHaltExpectedTicks } from '../executorUtils';
import type { Lisp, IRegEx } from '../../parser';
import { LispType, SandboxCapabilityError, sanitizeProp } from '../../utils';

addOps<unknown, string>(LispType.Number, ({ done, b }) =>
  done(undefined, Number(b.replace(/_/g, ''))),
);

addOps<unknown, string>(LispType.BigInt, ({ done, b }) =>
  done(undefined, BigInt(b.replace(/_/g, ''))),
);

addOps<unknown, string>(LispType.RegexIndex, ({ done, b, context }) => {
  const reg: IRegEx = context.constants.regexes[parseInt(b)];
  if (!context.ctx.globalsWhitelist.has(RegExp)) {
    throw new SandboxCapabilityError('Regex not permitted');
  } else {
    const RegExpCtor =
      (context.ctx.functionReplacements.get(RegExp) as
        | (new (pattern: string, flags?: string) => unknown)
        | undefined) ?? RegExp;
    done(undefined, new RegExpCtor(reg.regex, reg.flags));
  }
});

addOps<unknown, string>(LispType.LiteralIndex, (params) => {
  const { exec, done, ticks, b, context, scope, internal, generatorYield } = params;
  const item = context.constants.literals[parseInt(b)];
  const [, name, js] = item;
  const found: Lisp[] = [];
  let f: RegExpExecArray | null;
  const resnums: string[] = [];
  while ((f = literalRegex.exec(name))) {
    if (!f[2]) {
      found.push(js[parseInt(f[3], 10)]);
      resnums.push(f[3]);
    }
  }

  exec<unknown[]>(
    ticks,
    found,
    scope,
    context,
    (...args: unknown[]) => {
      const reses: Record<string, unknown> = {};
      if (args.length === 1) {
        done(args[0]);
        return;
      }
      const processed = args[1];
      for (const i of Object.keys(processed!) as (keyof typeof processed)[]) {
        const num = resnums[i];
        reses[num] = processed![i];
      }
      const result = name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
        if ($) return match;
        const res = reses[num];
        return ($$ ? $$ : '') + `${sanitizeProp(res, context)}`;
      });
      if (checkHaltExpectedTicks(params, BigInt(result.length))) return;
      done(undefined, result);
    },
    undefined,
    internal,
    generatorYield,
  );
});
