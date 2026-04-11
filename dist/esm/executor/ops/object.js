import { LispType } from "../../utils/types.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { KeyVal, SpreadArray, SpreadObject, sanitizeProp } from "../executorUtils.js";
//#region src/executor/ops/object.ts
addOps(LispType.CreateObject, ({ done, b }) => {
	let res = {};
	for (const item of b) if (item.key instanceof SpreadObject) res = {
		...res,
		...item.key.item
	};
	else res[item.key] = item.val;
	done(void 0, res);
});
addOps(LispType.KeyVal, ({ done, a, b }) => done(void 0, new KeyVal(a, b)));
addOps(LispType.CreateArray, ({ done, b, context }) => {
	done(void 0, b.map((item) => {
		if (item instanceof SpreadArray) return [...item.item];
		else return [item];
	}).flat().map((item) => sanitizeProp(item, context)));
});
addOps(LispType.Group, ({ done, b }) => done(void 0, b));
addOps(LispType.GlobalSymbol, ({ done, b }) => {
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
addOps(LispType.SpreadArray, ({ done, b }) => {
	done(void 0, new SpreadArray(b));
});
addOps(LispType.SpreadObject, ({ done, b }) => {
	done(void 0, new SpreadObject(b));
});
//#endregion

//# sourceMappingURL=object.js.map