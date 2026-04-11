const require_types = require("../../utils/types.js");
require("../../utils/index.js");
const require_opsRegistry = require("../opsRegistry.js");
const require_executorUtils = require("../executorUtils.js");
//#region src/executor/ops/object.ts
require_opsRegistry.addOps(require_types.LispType.CreateObject, ({ done, b }) => {
	let res = {};
	for (const item of b) if (item.key instanceof require_executorUtils.SpreadObject) res = {
		...res,
		...item.key.item
	};
	else res[item.key] = item.val;
	done(void 0, res);
});
require_opsRegistry.addOps(require_types.LispType.KeyVal, ({ done, a, b }) => done(void 0, new require_executorUtils.KeyVal(a, b)));
require_opsRegistry.addOps(require_types.LispType.CreateArray, ({ done, b, context }) => {
	done(void 0, b.map((item) => {
		if (item instanceof require_executorUtils.SpreadArray) return [...item.item];
		else return [item];
	}).flat().map((item) => require_executorUtils.sanitizeProp(item, context)));
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
