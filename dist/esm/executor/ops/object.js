import { LispType } from "../../utils/types.js";
import { sanitizeProp } from "../../utils/Scope.js";
import "../../utils/index.js";
import { addOps } from "../opsRegistry.js";
import { ArrayHole, KeyVal, SpreadArray, SpreadObject, checkHaltExpectedTicks } from "../executorUtils.js";
//#region src/executor/ops/object.ts
addOps(LispType.CreateObject, (params) => {
	const { done, b } = params;
	let res = {};
	for (const item of b) if (item.key instanceof SpreadObject) {
		const keys = Object.keys(item.key.item);
		if (checkHaltExpectedTicks(params, BigInt(keys.length))) return;
		res = {
			...res,
			...item.key.item
		};
	} else res[item.key] = item.val;
	done(void 0, res);
});
addOps(LispType.KeyVal, ({ done, a, b }) => done(void 0, new KeyVal(a, b)));
addOps(LispType.CreateArray, (params) => {
	const { done, b, context } = params;
	const items = [];
	for (const item of b) if (item instanceof SpreadArray) {
		const expanded = Array.isArray(item.item) ? item.item : [...item.item];
		if (checkHaltExpectedTicks(params, BigInt(expanded.length))) return;
		for (const v of expanded) items.push(sanitizeProp(v, context));
	} else if (item instanceof ArrayHole) items.length++;
	else items.push(sanitizeProp(item, context));
	done(void 0, items);
});
addOps(LispType.Hole, ({ done }) => done(void 0, new ArrayHole()));
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