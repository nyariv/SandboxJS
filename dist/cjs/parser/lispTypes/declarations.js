const require_CodeString = require("../../utils/CodeString.js");
const require_types = require("../../utils/types.js");
require("../../utils/index.js");
//#region src/parser/lispTypes/declarations.ts
function registerDeclarationLispTypes({ createLisp, expectTypes, expandDestructure, expandFunctionParamDestructure, lispify, lispifyBlock, lispifyFunction, restOfExp, semiColon, setLispType, splitByCommasDestructure }) {
	setLispType(["initializeDestructure"], (ctx) => {
		const { constants, part, res } = ctx;
		const keyword = res[1];
		const openBracket = res[2];
		const closeBracket = openBracket === "[" ? "]" : "}";
		const patternContent = restOfExp(constants, part.substring(res[0].length), [], openBracket);
		const patternStr = openBracket + patternContent.toString() + closeBracket;
		const afterClose = part.substring(res[0].length + patternContent.length + 1).trimStart();
		if (!afterClose.length || afterClose.char(0) !== "=") throw new SyntaxError("Destructuring declaration requires an initializer");
		const stmts = lispifyBlock(new require_CodeString.CodeString(expandDestructure(keyword, patternStr, restOfExp(constants, afterClose.substring(1).trimStart(), [semiColon]).toString())), constants, false, ctx);
		ctx.lispTree = createLisp({
			op: require_types.LispType.InternalBlock,
			a: stmts,
			b: require_types.LispType.None
		});
	});
	setLispType(["initialize"], (ctx) => {
		const { constants, part, res, expect } = ctx;
		const lt = res[1] === "var" ? require_types.LispType.Var : res[1] === "let" ? require_types.LispType.Let : res[1] === "const" ? require_types.LispType.Const : require_types.LispType.Internal;
		if (!res[3]) ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
			op: lt,
			a: res[2],
			b: require_types.LispType.None
		}), false, ctx);
		else {
			const initExpr = part.substring(res[0].length);
			if (!initExpr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
			ctx.lispTree = createLisp({
				op: lt,
				a: res[2],
				b: lispify(constants, initExpr, expectTypes[expect].next, void 0, false, ctx)
			});
		}
	});
	setLispType([
		"function",
		"inlineFunction",
		"arrowFunction",
		"arrowFunctionSingle"
	], (ctx) => {
		const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
		const isArrow = type !== "function" && type !== "inlineFunction";
		const isReturn = isArrow && !res[res.length - 1];
		const isGenerator = !isArrow && res[2] && res[2].trimStart().startsWith("*") ? require_types.LispType.True : require_types.LispType.None;
		const isAsync = res[1] ? require_types.LispType.True : require_types.LispType.None;
		let rawArgStr;
		let bodyOffset;
		if (type === "function" || type === "inlineFunction") {
			const argsCode = restOfExp(constants, part.substring(res[0].length), [], "(");
			rawArgStr = argsCode.toString().trim();
			bodyOffset = res[0].length + argsCode.length + 1;
			const afterParen = part.substring(bodyOffset).trimStart();
			bodyOffset = part.length - afterParen.length + 1;
		} else {
			rawArgStr = res[2] ?? "";
			bodyOffset = 0;
		}
		const args = [...rawArgStr ? splitByCommasDestructure(rawArgStr).map((a) => a.trim()).filter(Boolean) : []];
		if (!isArrow) args.unshift((res[3] || "").trimStart());
		let ended = false;
		args.forEach((arg) => {
			if (ended) throw new SyntaxError("Rest parameter must be last formal parameter");
			if (arg.startsWith("...")) ended = true;
		});
		const f = restOfExp(constants, isArrow ? part.substring(res[0].length) : part.substring(bodyOffset), !isReturn ? [/^}/] : [/^[,)}\]]/, semiColon]);
		let funcBody = isReturn ? "return " + f : f.toString();
		const expanded = expandFunctionParamDestructure(isArrow ? args : args.slice(1), funcBody);
		const finalArgs = isArrow ? expanded.args : [args[0], ...expanded.args];
		funcBody = expanded.body;
		finalArgs.forEach((arg) => {
			if (require_types.reservedWords.has(arg.replace(/^\.\.\./, ""))) throw new SyntaxError(`Unexpected token '${arg}'`);
		});
		const afterFunc = isArrow ? res[0].length + f.length + 1 : bodyOffset + f.length + 1;
		ctx.lispTree = lispify(constants, part.substring(afterFunc), expectTypes[expect].next, createLisp({
			op: isArrow ? require_types.LispType.ArrowFunction : type === "function" ? require_types.LispType.Function : require_types.LispType.InlineFunction,
			a: isArrow ? [isAsync, ...finalArgs] : [
				isAsync,
				isGenerator,
				...finalArgs
			],
			b: constants.eager ? lispifyFunction(new require_CodeString.CodeString(funcBody), constants, false, isArrow ? {
				generatorDepth: 0,
				asyncDepth: 0,
				lispDepth: 0
			} : {
				generatorDepth: isGenerator === require_types.LispType.True ? generatorDepth + 1 : 0,
				asyncDepth: isAsync === require_types.LispType.True ? asyncDepth + 1 : 0,
				lispDepth: 0
			}) : funcBody
		}), false, ctx);
	});
}
//#endregion
exports.registerDeclarationLispTypes = registerDeclarationLispTypes;
