import { LispType } from "../../utils/types.js";
import "../../utils/index.js";
//#region src/parser/lispTypes/values.ts
function registerValueLispTypes({ createLisp, expectTypes, lispify, lispifyExpr, restOfExp, semiColon, setLispType }) {
	setLispType(["return", "throw"], (ctx) => {
		const { constants, type, part, res } = ctx;
		const expr = part.substring(res[0].length);
		if (type === "throw" && !expr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
		ctx.lispTree = createLisp({
			op: type === "return" ? LispType.Return : LispType.Throw,
			a: LispType.None,
			b: lispifyExpr(constants, expr, void 0, ctx)
		});
	});
	setLispType([
		"number",
		"boolean",
		"null",
		"und",
		"NaN",
		"Infinity"
	], (ctx) => {
		const { constants, type, part, res, expect } = ctx;
		ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: type === "number" ? res[12] ? LispType.BigInt : LispType.Number : LispType.GlobalSymbol,
			a: LispType.None,
			b: res[12] ? res[1] : res[0]
		}), false, ctx);
	});
	setLispType([
		"string",
		"literal",
		"regex"
	], (ctx) => {
		const { constants, type, part, res, expect } = ctx;
		ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: type === "string" ? LispType.StringIndex : type === "literal" ? LispType.LiteralIndex : LispType.RegexIndex,
			a: LispType.None,
			b: res[1]
		}), false, ctx);
	});
	setLispType(["void", "await"], (ctx) => {
		const { constants, type, part, res, expect } = ctx;
		const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
		if (!extract.trimStart().length) throw new SyntaxError("Unexpected end of expression");
		ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp({
			op: type === "void" ? LispType.Void : LispType.Await,
			a: lispify(constants, extract),
			b: LispType.None
		}), false, ctx);
	});
	setLispType(["yield"], (ctx) => {
		const { constants, part, res, expect, generatorDepth } = ctx;
		if (generatorDepth === 0) throw new SyntaxError("Unexpected token");
		const isDelegate = res[0].trimEnd().endsWith("*");
		const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
		if (isDelegate && !extract.trimStart().length) throw new SyntaxError("Unexpected end of expression");
		ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp({
			op: isDelegate ? LispType.YieldDelegate : LispType.Yield,
			a: lispify(constants, extract),
			b: LispType.None
		}), false, ctx);
	});
	setLispType(["new"], (ctx) => {
		const { constants, part, res } = ctx;
		let i = res[0].length;
		const obj = restOfExp(constants, part.substring(i), [], void 0, "(");
		if (!obj.trimStart().length) throw new SyntaxError("Unexpected end of expression");
		i += obj.length + 1;
		const args = [];
		if (part.char(i - 1) === "(") {
			const argsString = restOfExp(constants, part.substring(i), [], "(");
			i += argsString.length + 1;
			let found;
			let j = 0;
			while ((found = restOfExp(constants, argsString.substring(j), [/^,/])).length) {
				j += found.length + 1;
				args.push(found.trim());
			}
		}
		ctx.lispTree = lispify(constants, part.substring(i), expectTypes.expEdge.next, createLisp({
			op: LispType.New,
			a: lispify(constants, obj, expectTypes.initialize.next),
			b: args.map((arg) => lispify(constants, arg, expectTypes.initialize.next))
		}), false, ctx);
	});
}
//#endregion
export { registerValueLispTypes };

//# sourceMappingURL=values.js.map