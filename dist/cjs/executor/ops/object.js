const require_types = require("../../utils/types.js");
const require_Scope = require("../../utils/Scope.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/object.ts
require_opsRegistry.addOps(require_types.LispType.CreateObject, (params) => {
	const { done, b } = params;
	let res = {};
	for (const item of b) if (item.key instanceof require_executorUtils.SpreadObject) {
		const keys = Object.keys(item.key.item);
		if (require_executorUtils.checkHaltExpectedTicks(params, BigInt(keys.length))) return;
		res = {
			...res,
			...item.key.item
		};
	} else res[item.key] = item.val;
	done(void 0, res);
});
require_opsRegistry.addOps(require_types.LispType.KeyVal, ({ done, a, b }) => done(void 0, new require_executorUtils.KeyVal(a, b)));
require_opsRegistry.addOps(require_types.LispType.CreateArray, (params) => {
	const { done, b, context } = params;
	const items = [];
	for (const item of b) if (item instanceof require_executorUtils.SpreadArray) {
		const expanded = Array.isArray(item.item) ? item.item : [...item.item];
		if (require_executorUtils.checkHaltExpectedTicks(params, BigInt(expanded.length))) return;
		for (const v of expanded) items.push(require_Scope.sanitizeProp(v, context));
	} else items.push(require_Scope.sanitizeProp(item, context));
	done(void 0, items);
});
require_opsRegistry.addOps(require_types.LispType.Group, ({ done, b }) => done(void 0, b));
require_opsRegistry.addOps(require_types.LispType.GlobalSymbol, ({ done, b }) => {
	switch (b) {
		case "true": return done(void 0, true);
		case "false": return done(void 0, false);
		case "null": return done(void 0, null);
		case "undefined": return done(void 0, void 0);
		case "NaN": return done(void 0, NaN);
		case "Infinity": return done(void 0, Infinity);
	}
	done(/* @__PURE__ */ new Error("Unknown symbol: " + b));
});
require_opsRegistry.addOps(require_types.LispType.SpreadArray, ({ done, b }) => {
	done(void 0, new require_executorUtils.SpreadArray(b));
});
require_opsRegistry.addOps(require_types.LispType.SpreadObject, ({ done, b }) => {
	done(void 0, new require_executorUtils.SpreadObject(b));
});
//#endregion
