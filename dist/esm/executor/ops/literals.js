import { SandboxCapabilityError } from "../../utils/errors.js";
import { LispType } from "../../utils/types.js";
import { sanitizeProp } from "../../utils/Scope.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { checkHaltExpectedTicks, literalRegex } from "../executorUtils.js";
//#region src/executor/ops/literals.ts
addOps(LispType.Number, ({ done, b }) => done(void 0, Number(b.replace(/_/g, ""))));
addOps(LispType.BigInt, ({ done, b }) => done(void 0, BigInt(b.replace(/_/g, ""))));
addOps(LispType.RegexIndex, ({ done, b, context }) => {
	const reg = context.constants.regexes[parseInt(b)];
	if (!context.ctx.globalsWhitelist.has(RegExp)) throw new SandboxCapabilityError("Regex not permitted");
	else done(void 0, new ((context.evals.get(RegExp)) ?? RegExp)(reg.regex, reg.flags));
});
addOps(LispType.LiteralIndex, (params) => {
	const { exec, done, ticks, b, context, scope, internal, generatorYield } = params;
	const [, name, js] = context.constants.literals[parseInt(b)];
	const found = [];
	let f;
	const resnums = [];
	while (f = literalRegex.exec(name)) if (!f[2]) {
		found.push(js[parseInt(f[3], 10)]);
		resnums.push(f[3]);
	}
	exec(ticks, found, scope, context, (...args) => {
		const reses = {};
		if (args.length === 1) {
			done(args[0]);
			return;
		}
		const processed = args[1];
		for (const i of Object.keys(processed)) {
			const num = resnums[i];
			reses[num] = processed[i];
		}
		const result = name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
			if ($) return match;
			const res = reses[num];
			return ($$ ? $$ : "") + `${sanitizeProp(res, context)}`;
		});
		if (checkHaltExpectedTicks(params, BigInt(result.length))) return;
		done(void 0, result);
	}, void 0, internal, generatorYield);
});
//#endregion

//# sourceMappingURL=literals.js.map