import { CodeString } from "../../utils/CodeString.js";
import { LispType } from "../../utils/types.js";
import { isLisp } from "../../utils/ExecContext.js";
import "../../utils/index.js";
//#region src/parser/lispTypes/operators.ts
function registerOperatorLispTypes({ createLisp, expandDestructure, expectTypes, getDestructurePatternSource, lispifyBlock, restOfExp, lispify, lispifyExpr, setLispType }) {
	const inlineIfElse = /^:/;
	const modifierTypes = {
		inverse: LispType.Inverse,
		not: LispType.Not,
		positive: LispType.Positive,
		negative: LispType.Negative,
		typeof: LispType.Typeof,
		delete: LispType.Delete
	};
	setLispType([
		"inverse",
		"not",
		"negative",
		"positive",
		"typeof",
		"delete"
	], (ctx) => {
		const { constants, type, part, res, expect } = ctx;
		const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
		if (part.substring(extract.length + res[0].length).trim().toString().startsWith("**")) throw new SyntaxError("Unary operator used immediately before exponentiation expression. Parenthesis must be used to disambiguate operator precedence");
		ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp({
			op: modifierTypes[type],
			a: ctx.lispTree,
			b: lispify(constants, extract, expectTypes[expect].next)
		}), false, ctx);
	});
	setLispType(["taggedTemplate"], (ctx) => {
		const { constants, part, res, expect } = ctx;
		const literalIndex = res[1];
		const [, templateStr, jsExprs] = constants.literals[parseInt(literalIndex)];
		const stringParts = [];
		const expressions = [];
		let currentStr = "";
		let i = 0;
		while (i < templateStr.length) if (templateStr.substring(i, i + 2) === "${") {
			let j = i + 2;
			let exprIndex = "";
			let isValidPlaceholder = false;
			while (j < templateStr.length && templateStr[j] !== "}") {
				exprIndex += templateStr[j];
				j++;
			}
			if (j < templateStr.length && templateStr[j] === "}" && /^\d+$/.test(exprIndex)) isValidPlaceholder = true;
			if (isValidPlaceholder) {
				stringParts.push(currentStr);
				currentStr = "";
				expressions.push(jsExprs[parseInt(exprIndex)]);
				i = j + 1;
			} else {
				currentStr += templateStr[i];
				i++;
			}
		} else {
			currentStr += templateStr[i];
			i++;
		}
		stringParts.push(currentStr);
		const stringsArray = stringParts.map((str) => createLisp({
			op: LispType.StringIndex,
			a: LispType.None,
			b: String(constants.strings.push(str) - 1)
		}));
		const stringsArrayLisp = createLisp({
			op: LispType.CreateArray,
			a: createLisp({
				op: LispType.None,
				a: LispType.None,
				b: LispType.None
			}),
			b: stringsArray
		});
		ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: LispType.Call,
			a: ctx.lispTree,
			b: [stringsArrayLisp, ...expressions]
		}), false, ctx);
	});
	const incrementTypes = {
		"++$": LispType.IncrementBefore,
		"--$": LispType.DecrementBefore,
		"$++": LispType.IncrementAfter,
		"$--": LispType.DecrementAfter
	};
	setLispType(["incrementerBefore"], (ctx) => {
		const { constants, part, res } = ctx;
		const extract = restOfExp(constants, part.substring(2), [/^[^\s.\w$]/]);
		ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, createLisp({
			op: incrementTypes[res[0] + "$"],
			a: lispify(constants, extract, expectTypes.incrementerBefore.next),
			b: LispType.None
		}), false, ctx);
	});
	setLispType(["incrementerAfter"], (ctx) => {
		const { constants, part, res, expect } = ctx;
		if (ctx.lispTree[0] === LispType.Number || ctx.lispTree[0] === LispType.BigInt || ctx.lispTree[0] === LispType.GlobalSymbol || ctx.lispTree[0] === LispType.StringIndex || ctx.lispTree[0] === LispType.LiteralIndex || ctx.lispTree[0] === LispType.RegexIndex) throw new SyntaxError("Invalid left-hand side expression in postfix operation");
		ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: incrementTypes["$" + res[0]],
			a: ctx.lispTree,
			b: LispType.None
		}), false, ctx);
	});
	const adderTypes = {
		"&&": LispType.And,
		"||": LispType.Or,
		"??": LispType.NullishCoalescing,
		instanceof: LispType.Instanceof,
		in: LispType.In,
		"=": LispType.Assign,
		"-=": LispType.SubractEquals,
		"+=": LispType.AddEquals,
		"/=": LispType.DivideEquals,
		"**=": LispType.PowerEquals,
		"*=": LispType.MultiplyEquals,
		"%=": LispType.ModulusEquals,
		"^=": LispType.BitNegateEquals,
		"&=": LispType.BitAndEquals,
		"|=": LispType.BitOrEquals,
		">>>=": LispType.UnsignedShiftRightEquals,
		"<<=": LispType.ShiftLeftEquals,
		">>=": LispType.ShiftRightEquals,
		"&&=": LispType.AndEquals,
		"||=": LispType.OrEquals,
		"??=": LispType.NullishCoalescingEquals
	};
	setLispType([
		"assign",
		"assignModify",
		"nullishCoalescing"
	], (ctx) => {
		const { constants, type, part, res } = ctx;
		if (type !== "nullishCoalescing" && isLisp(ctx.lispTree) && (ctx.lispTree[0] === LispType.PropOptional || ctx.lispTree[0] === LispType.CallOptional)) throw new SyntaxError("Invalid left-hand side in assignment");
		if (res[0] === "=") {
			const patternStr = getDestructurePatternSource(ctx.lispTree);
			if (patternStr) {
				const rhsStr = part.substring(res[0].length).toString();
				const tempName = `$$_da${Math.random().toString(36).slice(2)}`;
				const expandedCode = `internal ${tempName} = (${rhsStr}); ${expandDestructure("", patternStr, tempName)}; ${tempName}`;
				ctx.lispTree = createLisp({
					op: LispType.InternalBlock,
					a: lispifyBlock(new CodeString(expandedCode), constants, false, ctx),
					b: LispType.None
				});
				return;
			}
		}
		ctx.lispTree = createLisp({
			op: adderTypes[res[0]],
			a: ctx.lispTree,
			b: lispify(constants, part.substring(res[0].length), expectTypes.assignment.next, void 0, false, {
				...ctx,
				lispDepth: ctx.lispDepth + 1
			})
		});
	});
	const opTypes = {
		"&": LispType.BitAnd,
		"|": LispType.BitOr,
		"^": LispType.BitNegate,
		"<<": LispType.BitShiftLeft,
		">>": LispType.BitShiftRight,
		">>>": LispType.BitUnsignedShiftRight,
		"<=": LispType.SmallerEqualThan,
		">=": LispType.LargerEqualThan,
		"<": LispType.SmallerThan,
		">": LispType.LargerThan,
		"!==": LispType.StrictNotEqual,
		"!=": LispType.NotEqual,
		"===": LispType.StrictEqual,
		"==": LispType.Equal,
		"+": LispType.Plus,
		"-": LispType.Minus,
		"/": LispType.Divide,
		"**": LispType.Power,
		"*": LispType.Multiply,
		"%": LispType.Modulus,
		"&&": LispType.And,
		"||": LispType.Or,
		instanceof: LispType.Instanceof,
		in: LispType.In
	};
	setLispType([
		"power",
		"opHigh",
		"op",
		"comparitor",
		"bitwiseShift",
		"bitwiseAnd",
		"bitwiseXor",
		"bitwiseOr",
		"boolOpAnd",
		"boolOpOr"
	], (ctx) => {
		const { constants, type, part, res } = ctx;
		const next = [expectTypes.inlineIf.types.inlineIf, inlineIfElse];
		switch (type) {
			case "power": break;
			case "opHigh": next.push(expectTypes.splitter.types.opHigh);
			case "op": next.push(expectTypes.splitter.types.op);
			case "comparitor": next.push(expectTypes.splitter.types.comparitor);
			case "bitwiseShift": next.push(expectTypes.splitter.types.bitwiseShift);
			case "bitwiseAnd": next.push(expectTypes.splitter.types.bitwiseAnd);
			case "bitwiseXor": next.push(expectTypes.splitter.types.bitwiseXor);
			case "bitwiseOr": next.push(expectTypes.splitter.types.bitwiseOr);
			case "boolOpAnd": next.push(expectTypes.splitter.types.boolOpAnd);
			case "boolOpOr": next.push(expectTypes.splitter.types.boolOpOr);
		}
		const extract = restOfExp(constants, part.substring(res[0].length), next);
		ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp({
			op: opTypes[res[0]],
			a: ctx.lispTree,
			b: lispify(constants, extract, expectTypes.splitter.next)
		}), false, ctx);
	});
	setLispType(["inlineIf"], (ctx) => {
		const { constants, part, res } = ctx;
		let found = false;
		const extract = part.substring(0, 0);
		let quoteCount = 1;
		while (!found && extract.length < part.length) {
			extract.end = restOfExp(constants, part.substring(extract.length + 1), [expectTypes.inlineIf.types.inlineIf, inlineIfElse]).end;
			if (part.char(extract.length) === "?") quoteCount++;
			else quoteCount--;
			if (!quoteCount) found = true;
		}
		extract.start = part.start + 1;
		const falseExpr = part.substring(res[0].length + extract.length + 1);
		if (!falseExpr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
		ctx.lispTree = createLisp({
			op: LispType.InlineIf,
			a: ctx.lispTree,
			b: createLisp({
				op: LispType.InlineIfCase,
				a: lispifyExpr(constants, extract, void 0, {
					...ctx,
					lispDepth: ctx.lispDepth + 1
				}),
				b: lispifyExpr(constants, falseExpr, void 0, {
					...ctx,
					lispDepth: ctx.lispDepth + 1
				})
			})
		});
	});
}
//#endregion
export { registerOperatorLispTypes };

//# sourceMappingURL=operators.js.map