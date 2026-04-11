const require_CodeString = require("../../utils/CodeString.js");
const require_types = require("../../utils/types.js");
const require_ExecContext = require("../../utils/ExecContext.js");
require("../../utils/index.js");
//#region src/parser/lispTypes/operators.ts
function registerOperatorLispTypes({ createLisp, expandDestructure, expectTypes, getDestructurePatternSource, lispifyBlock, restOfExp, lispify, lispifyExpr, setLispType }) {
	const inlineIfElse = /^:/;
	const modifierTypes = {
		inverse: require_types.LispType.Inverse,
		not: require_types.LispType.Not,
		positive: require_types.LispType.Positive,
		negative: require_types.LispType.Negative,
		typeof: require_types.LispType.Typeof,
		delete: require_types.LispType.Delete
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
			op: require_types.LispType.StringIndex,
			a: require_types.LispType.None,
			b: String(constants.strings.push(str) - 1)
		}));
		const stringsArrayLisp = createLisp({
			op: require_types.LispType.CreateArray,
			a: createLisp({
				op: require_types.LispType.None,
				a: require_types.LispType.None,
				b: require_types.LispType.None
			}),
			b: stringsArray
		});
		ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: require_types.LispType.Call,
			a: ctx.lispTree,
			b: [stringsArrayLisp, ...expressions]
		}), false, ctx);
	});
	const incrementTypes = {
		"++$": require_types.LispType.IncrementBefore,
		"--$": require_types.LispType.DecrementBefore,
		"$++": require_types.LispType.IncrementAfter,
		"$--": require_types.LispType.DecrementAfter
	};
	setLispType(["incrementerBefore"], (ctx) => {
		const { constants, part, res } = ctx;
		const extract = restOfExp(constants, part.substring(2), [/^[^\s.\w$]/]);
		ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, createLisp({
			op: incrementTypes[res[0] + "$"],
			a: lispify(constants, extract, expectTypes.incrementerBefore.next),
			b: require_types.LispType.None
		}), false, ctx);
	});
	setLispType(["incrementerAfter"], (ctx) => {
		const { constants, part, res, expect } = ctx;
		if (ctx.lispTree[0] === require_types.LispType.Number || ctx.lispTree[0] === require_types.LispType.BigInt || ctx.lispTree[0] === require_types.LispType.GlobalSymbol || ctx.lispTree[0] === require_types.LispType.StringIndex || ctx.lispTree[0] === require_types.LispType.LiteralIndex || ctx.lispTree[0] === require_types.LispType.RegexIndex) throw new SyntaxError("Invalid left-hand side expression in postfix operation");
		ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: incrementTypes["$" + res[0]],
			a: ctx.lispTree,
			b: require_types.LispType.None
		}), false, ctx);
	});
	const adderTypes = {
		"&&": require_types.LispType.And,
		"||": require_types.LispType.Or,
		"??": require_types.LispType.NullishCoalescing,
		instanceof: require_types.LispType.Instanceof,
		in: require_types.LispType.In,
		"=": require_types.LispType.Assign,
		"-=": require_types.LispType.SubractEquals,
		"+=": require_types.LispType.AddEquals,
		"/=": require_types.LispType.DivideEquals,
		"**=": require_types.LispType.PowerEquals,
		"*=": require_types.LispType.MultiplyEquals,
		"%=": require_types.LispType.ModulusEquals,
		"^=": require_types.LispType.BitNegateEquals,
		"&=": require_types.LispType.BitAndEquals,
		"|=": require_types.LispType.BitOrEquals,
		">>>=": require_types.LispType.UnsignedShiftRightEquals,
		"<<=": require_types.LispType.ShiftLeftEquals,
		">>=": require_types.LispType.ShiftRightEquals,
		"&&=": require_types.LispType.AndEquals,
		"||=": require_types.LispType.OrEquals,
		"??=": require_types.LispType.NullishCoalescingEquals
	};
	setLispType([
		"assign",
		"assignModify",
		"nullishCoalescing"
	], (ctx) => {
		const { constants, type, part, res } = ctx;
		if (type !== "nullishCoalescing" && require_ExecContext.isLisp(ctx.lispTree) && (ctx.lispTree[0] === require_types.LispType.PropOptional || ctx.lispTree[0] === require_types.LispType.CallOptional)) throw new SyntaxError("Invalid left-hand side in assignment");
		if (res[0] === "=") {
			const patternStr = getDestructurePatternSource(ctx.lispTree);
			if (patternStr) {
				const rhsStr = part.substring(res[0].length).toString();
				const tempName = `$$_da${Math.random().toString(36).slice(2)}`;
				const expandedCode = `internal ${tempName} = (${rhsStr}); ${expandDestructure("", patternStr, tempName)}; ${tempName}`;
				ctx.lispTree = createLisp({
					op: require_types.LispType.InternalBlock,
					a: lispifyBlock(new require_CodeString.CodeString(expandedCode), constants, false, ctx),
					b: require_types.LispType.None
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
		"&": require_types.LispType.BitAnd,
		"|": require_types.LispType.BitOr,
		"^": require_types.LispType.BitNegate,
		"<<": require_types.LispType.BitShiftLeft,
		">>": require_types.LispType.BitShiftRight,
		">>>": require_types.LispType.BitUnsignedShiftRight,
		"<=": require_types.LispType.SmallerEqualThan,
		">=": require_types.LispType.LargerEqualThan,
		"<": require_types.LispType.SmallerThan,
		">": require_types.LispType.LargerThan,
		"!==": require_types.LispType.StrictNotEqual,
		"!=": require_types.LispType.NotEqual,
		"===": require_types.LispType.StrictEqual,
		"==": require_types.LispType.Equal,
		"+": require_types.LispType.Plus,
		"-": require_types.LispType.Minus,
		"/": require_types.LispType.Divide,
		"**": require_types.LispType.Power,
		"*": require_types.LispType.Multiply,
		"%": require_types.LispType.Modulus,
		"&&": require_types.LispType.And,
		"||": require_types.LispType.Or,
		instanceof: require_types.LispType.Instanceof,
		in: require_types.LispType.In
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
			op: require_types.LispType.InlineIf,
			a: ctx.lispTree,
			b: createLisp({
				op: require_types.LispType.InlineIfCase,
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
exports.registerOperatorLispTypes = registerOperatorLispTypes;
