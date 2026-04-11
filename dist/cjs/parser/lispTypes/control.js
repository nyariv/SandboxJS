const require_CodeString = require("../../utils/CodeString.js");
const require_types = require("../../utils/types.js");
require("../../utils/index.js");
//#region src/parser/lispTypes/control.ts
function registerControlLispTypes({ ParseError, createLisp, emptyString, expandDestructure, extractStatementLabels, insertSemicolons, lispify, lispifyBlock, lispifyExpr, lispifyReturnExpr, restOfExp, semiColon, setLispType, startingExecpted, wrapLabeledStatement }) {
	const iteratorRegex = /^((let|var|const|internal)\s+)?\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s+(in|of)(?![\w$])/;
	const iteratorDestructureRegex = /^((let|var|const|internal)\s+)\s*([[{])/;
	const ofStart2 = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("let $$iterator = $$obj[Symbol.iterator]()"), ["initialize"]);
	const ofStart3 = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("let $$next = $$iterator.next()"), ["initialize"]);
	const ofCondition = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("return !$$next.done"), ["initialize"]);
	const ofStep = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("$$next = $$iterator.next()"));
	const asyncOfStart2 = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("let $$iterator = $$obj"), ["initialize"]);
	const asyncOfStart3 = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("let $$next = $$iterator.next()"), ["initialize"]);
	const asyncOfStep = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("$$next = $$iterator.next()"));
	const inStart2 = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("let $$keys = Object.keys($$obj)"), ["initialize"]);
	const inStart3 = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("let $$keyIndex = 0"), ["initialize"]);
	const inStep = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("$$keyIndex++"));
	const inCondition = lispify({ maxDepth: 10 }, new require_CodeString.CodeString("return $$keyIndex < $$keys.length"), ["initialize"]);
	setLispType([
		"for",
		"do",
		"while"
	], (ctx) => {
		const { constants, type, part, res } = ctx;
		const labels = extractStatementLabels(res[1]);
		let i = 0;
		let startStep = require_types.LispType.True;
		let startInternal = [];
		let getIterator = require_types.LispType.None;
		let beforeStep = require_types.LispType.None;
		let checkFirst = require_types.LispType.True;
		let condition;
		let step = require_types.LispType.True;
		let body;
		const isForAwait = type === "for" && res[2] ? require_types.LispType.True : require_types.LispType.None;
		switch (type) {
			case "while": {
				i = part.toString().indexOf("(") + 1;
				const extract = restOfExp(constants, part.substring(i), [], "(");
				if (!extract.trimStart().length) throw new SyntaxError("Unexpected end of expression");
				condition = lispifyReturnExpr(constants, extract);
				body = restOfExp(constants, part.substring(i + extract.length + 1)).trim();
				if (body.char(0) === "{") body = body.slice(1, -1);
				break;
			}
			case "for": {
				i = part.toString().indexOf("(") + 1;
				const args = [];
				let extract2 = emptyString;
				for (let k = 0; k < 3; k++) {
					extract2 = restOfExp(constants, part.substring(i), [/^[;)]/]);
					args.push(extract2.trim());
					i += extract2.length + 1;
					if (part.char(i - 1) === ")") break;
				}
				let iterator;
				let iteratorDestructure;
				if (args.length === 1 && (iterator = iteratorRegex.exec(args[0].toString()))) {
					const iterableExpr = args[0].substring(iterator[0].length);
					if (!iterableExpr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
					if (iterator[4] === "of") {
						getIterator = lispifyReturnExpr(constants, iterableExpr);
						startInternal = isForAwait ? [asyncOfStart2, asyncOfStart3] : [ofStart2, ofStart3];
						condition = ofCondition;
						step = isForAwait ? asyncOfStep : ofStep;
						beforeStep = lispify(constants, new require_CodeString.CodeString((iterator[1] || "let ") + iterator[3] + " = $$next.value"), ["initialize"]);
					} else {
						if (isForAwait) throw new SyntaxError("Unexpected token 'in'");
						getIterator = lispifyReturnExpr(constants, iterableExpr);
						startInternal = [inStart2, inStart3];
						step = inStep;
						condition = inCondition;
						beforeStep = lispify(constants, new require_CodeString.CodeString((iterator[1] || "let ") + iterator[3] + " = $$keys[$$keyIndex]"), ["initialize"]);
					}
				} else if (args.length === 1 && (iteratorDestructure = iteratorDestructureRegex.exec(args[0].toString()))) {
					const keyword = iteratorDestructure[1].trim();
					const openBracket = iteratorDestructure[3];
					const closeBracket = openBracket === "[" ? "]" : "}";
					const keywordPrefixLen = iteratorDestructure[0].length - 1;
					const patternContent = restOfExp(constants, args[0].substring(keywordPrefixLen + 1), [], openBracket);
					const patternStr = openBracket + patternContent.toString() + closeBracket;
					const afterClose = args[0].substring(keywordPrefixLen + 1 + patternContent.length + 1).trimStart();
					const inOfMatch = /^(in|of)(?![\w$])\s*/.exec(afterClose.toString());
					if (!inOfMatch) throw new SyntaxError("Invalid for loop definition");
					const inOf = inOfMatch[1];
					const iterExpr = afterClose.substring(inOfMatch[0].length);
					if (!iterExpr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
					const tempVarName = "$$_fv";
					if (inOf === "of") {
						getIterator = lispifyReturnExpr(constants, iterExpr);
						startInternal = isForAwait ? [asyncOfStart2, asyncOfStart3] : [ofStart2, ofStart3];
						condition = ofCondition;
						step = isForAwait ? asyncOfStep : ofStep;
						const stmts = lispifyBlock(new require_CodeString.CodeString(expandDestructure(keyword, patternStr, tempVarName)), constants, false, ctx);
						beforeStep = createLisp({
							op: require_types.LispType.InternalBlock,
							a: [lispify(constants, new require_CodeString.CodeString(`${keyword} ${tempVarName} = $$next.value`), ["initialize"]), ...stmts],
							b: require_types.LispType.None
						});
					} else {
						getIterator = lispifyReturnExpr(constants, iterExpr);
						startInternal = [inStart2, inStart3];
						step = inStep;
						condition = inCondition;
						const stmts = lispifyBlock(new require_CodeString.CodeString(expandDestructure(keyword, patternStr, tempVarName)), constants, false, ctx);
						beforeStep = createLisp({
							op: require_types.LispType.InternalBlock,
							a: [lispify(constants, new require_CodeString.CodeString(`${keyword} ${tempVarName} = $$keys[$$keyIndex]`), ["initialize"]), ...stmts],
							b: require_types.LispType.None
						});
					}
				} else if (args.length === 3) {
					const [startArg, conditionArg, stepArg] = args;
					if (startArg.length) startStep = lispifyExpr(constants, startArg, startingExecpted, ctx);
					condition = conditionArg.length ? lispifyReturnExpr(constants, conditionArg) : require_types.LispType.True;
					if (stepArg.length) step = lispifyExpr(constants, stepArg, void 0, ctx);
				} else throw new SyntaxError("Invalid for loop definition");
				body = restOfExp(constants, part.substring(i)).trim();
				if (body.char(0) === "{") body = body.slice(1, -1);
				break;
			}
			case "do": {
				checkFirst = require_types.LispType.None;
				const isBlock = !!res[2];
				body = restOfExp(constants, part.substring(res[0].length), isBlock ? [/^\}/] : [semiColon]);
				condition = lispifyReturnExpr(constants, restOfExp(constants, part.substring(part.toString().indexOf("(", res[0].length + body.length) + 1), [], "("));
				break;
			}
		}
		const a = [
			checkFirst,
			startInternal,
			getIterator,
			startStep,
			step,
			condition,
			beforeStep,
			isForAwait,
			labels
		];
		ctx.lispTree = createLisp({
			op: require_types.LispType.Loop,
			a,
			b: lispifyBlock(body, constants, false, ctx)
		});
	});
	setLispType(["block"], (ctx) => {
		const { constants, part, res } = ctx;
		ctx.lispTree = wrapLabeledStatement(extractStatementLabels(res[1]), createLisp({
			op: require_types.LispType.Block,
			a: lispifyBlock(restOfExp(constants, part.substring(res[0].length), [], "{"), constants, false, ctx),
			b: require_types.LispType.None
		}));
	});
	setLispType(["loopAction"], (ctx) => {
		const { part, res } = ctx;
		const remaining = part.substring(res[0].length).trimStart();
		if (remaining.length && !res[2]) throw new SyntaxError(`Unexpected token '${remaining.char(0)}'`);
		ctx.lispTree = createLisp({
			op: require_types.LispType.LoopAction,
			a: res[1],
			b: res[2] || require_types.LispType.None
		});
	});
	const catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s*\))?|finally)\s*\{/;
	const catchEmptyBindingReg = /^\s*catch\s*\(\s*\)/;
	const catchReservedBindingReg = /^\s*catch\s*\(\s*(break|case|catch|continue|debugger|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with|class|const|enum|export|extends|implements|import|interface|let|package|private|protected|public|static|super|yield|await)\s*\)/;
	const finallyKeywordReg = /^\s*finally\b/;
	setLispType(["try"], (ctx) => {
		const { constants, part, res } = ctx;
		const body = restOfExp(constants, part.substring(res[0].length), [], "{");
		const afterBody = part.substring(res[0].length + body.length + 1).toString();
		if (catchEmptyBindingReg.test(afterBody)) throw new ParseError("Unexpected token ')'", part.toString());
		const reservedMatch = catchReservedBindingReg.exec(afterBody);
		if (reservedMatch) throw new ParseError(`Unexpected token '${reservedMatch[1]}'`, part.toString());
		const finallyMatch = finallyKeywordReg.exec(afterBody);
		if (finallyMatch && !/^\s*\{/.test(afterBody.substring(finallyMatch[0].length))) throw new ParseError("Unexpected token", part.toString());
		let catchRes = catchReg.exec(afterBody);
		let finallyBody;
		let exception = "";
		let catchBody;
		let offset = 0;
		if (!catchRes) throw new ParseError("Missing catch or finally after try", part.toString());
		if (catchRes[1].startsWith("catch")) {
			catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
			exception = catchRes[3] || "";
			catchBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
			offset = res[0].length + body.length + 1 + catchRes[0].length + catchBody.length + 1;
			if ((catchRes = catchReg.exec(part.substring(offset).toString())) && catchRes[1].startsWith("finally")) finallyBody = restOfExp(constants, part.substring(offset + catchRes[0].length), [], "{");
		} else finallyBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
		const b = [
			exception,
			lispifyBlock(insertSemicolons(constants, catchBody || emptyString), constants, false, ctx),
			lispifyBlock(insertSemicolons(constants, finallyBody || emptyString), constants, false, ctx)
		];
		ctx.lispTree = wrapLabeledStatement(extractStatementLabels(res[1]), createLisp({
			op: require_types.LispType.Try,
			a: lispifyBlock(insertSemicolons(constants, body), constants, false, ctx),
			b
		}));
	});
}
//#endregion
exports.registerControlLispTypes = registerControlLispTypes;
