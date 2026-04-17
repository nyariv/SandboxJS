const require_errors = require("../../utils/errors.js");
const require_types = require("../../utils/types.js");
const require_Scope = require("../../utils/Scope.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/literals.ts
require_opsRegistry.addOps(require_types.LispType.Number, ({ done, b }) => done(void 0, Number(b.replace(/_/g, ""))));
require_opsRegistry.addOps(require_types.LispType.BigInt, ({ done, b }) => done(void 0, BigInt(b.replace(/_/g, ""))));
require_opsRegistry.addOps(require_types.LispType.RegexIndex, ({ done, b, context }) => {
	const reg = context.constants.regexes[parseInt(b)];
	if (!context.ctx.globalsWhitelist.has(RegExp)) throw new require_errors.SandboxCapabilityError("Regex not permitted");
	else done(void 0, new ((context.ctx.functionReplacements.get(RegExp)) ?? RegExp)(reg.regex, reg.flags));
});
require_opsRegistry.addOps(require_types.LispType.LiteralIndex, (params) => {
	const { exec, done, ticks, b, context, scope, internal, generatorYield } = params;
	const [, name, js] = context.constants.literals[parseInt(b)];
	const found = [];
	let f;
	const resnums = [];
	while (f = require_executorUtils.literalRegex.exec(name)) if (!f[2]) {
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
			return ($$ ? $$ : "") + `${require_Scope.sanitizeProp(res, context)}`;
		});
		if (require_executorUtils.checkHaltExpectedTicks(params, BigInt(result.length))) return;
		done(void 0, result);
	}, void 0, internal, generatorYield);
});
//#endregion
