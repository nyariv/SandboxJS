const require_errors = require("../../utils/errors.js");
const require_types = require("../../utils/types.js");
require("../../utils/index.js");
//#region src/parser/lispTypes/conditionals.ts
function registerConditionalLispTypes({ createLisp, emptyString, extractStatementLabels, insertSemicolons, lispifyBlock, lispifyExpr, restOfExp, semiColon, setLispType, wrapLabeledStatement }) {
	const elseIf = /^else(?![\w$])/;
	const ifElse = /^if(?![\w$])/;
	function extractIfElse(constants, part, depth = 0) {
		if (depth > constants.maxDepth) throw new require_errors.SandboxCapabilityError("Maximum expression depth exceeded");
		let count = 0;
		let found = part.substring(0, 0);
		let foundElse = emptyString;
		let foundTrue;
		let first = true;
		let elseReg;
		let details = {};
		while ((found = restOfExp(constants, part.substring(found.end - part.start), [
			elseIf,
			ifElse,
			semiColon
		], void 0, void 0, void 0, details)).length || first) {
			first = false;
			const f = part.substring(found.end - part.start).toString();
			if (f.startsWith("if")) {
				found.end++;
				count++;
			} else if (f.startsWith("else")) {
				foundTrue = part.substring(0, found.end - part.start);
				found.end++;
				count--;
				if (!count) found.end--;
			} else if (elseReg = /^;?\s*else(?![\w$])/.exec(f)) {
				foundTrue = part.substring(0, found.end - part.start);
				found.end += elseReg[0].length - 1;
				count--;
				if (!count) found.end -= elseReg[0].length - 1;
			} else {
				foundTrue = foundElse.length ? foundTrue : part.substring(0, found.end - part.start);
				break;
			}
			if (!count) {
				foundElse = extractIfElse(constants, part.substring(found.end - part.start + (/^;?\s*else(?![\w$])/.exec(f)?.[0].length || 0)), depth + 1).all;
				break;
			}
			details = {};
		}
		foundTrue = foundTrue || part.substring(0, found.end - part.start);
		return {
			all: part.substring(0, Math.max(foundTrue.end, foundElse.end) - part.start),
			true: foundTrue,
			false: foundElse
		};
	}
	setLispType(["if"], (ctx) => {
		const { constants, part, res } = ctx;
		const labels = extractStatementLabels(res[1]);
		let condition = restOfExp(constants, part.substring(res[0].length), [], "(");
		const ie = extractIfElse(constants, part.substring(res[1].length));
		const startTrue = res[0].length - res[1].length + condition.length + 1;
		let trueBlock = ie.true.substring(startTrue);
		let elseBlock = ie.false;
		condition = condition.trim();
		trueBlock = trueBlock.trim();
		elseBlock = elseBlock.trim();
		if (!trueBlock.length || /^else(?![\w$])/.test(trueBlock.toString())) throw new SyntaxError("Unexpected token");
		if (trueBlock.char(0) === "{") trueBlock = trueBlock.slice(1, -1);
		if (elseBlock.char(0) === "{") elseBlock = elseBlock.slice(1, -1);
		ctx.lispTree = wrapLabeledStatement(labels, createLisp({
			op: require_types.LispType.If,
			a: lispifyExpr(constants, condition, void 0, ctx),
			b: createLisp({
				op: require_types.LispType.IfCase,
				a: lispifyBlock(trueBlock, constants, false, ctx),
				b: lispifyBlock(elseBlock, constants, false, ctx)
			})
		}));
	});
	setLispType(["switch"], (ctx) => {
		const { constants, part, res } = ctx;
		const labels = extractStatementLabels(res[1]);
		const test = restOfExp(constants, part.substring(res[0].length), [], "(");
		let start = part.toString().indexOf("{", res[0].length + test.length + 1);
		if (start === -1) throw new SyntaxError("Invalid switch");
		let statement = insertSemicolons(constants, restOfExp(constants, part.substring(start + 1), [], "{"));
		let caseFound;
		const caseTest = /^\s*(case\s|default)\s*/;
		const caseNoTestReg = /^\s*case\s*:/;
		const cases = [];
		let defaultFound = false;
		while ((caseFound = caseTest.exec(statement.toString())) || caseNoTestReg.test(statement.toString())) {
			if (!caseFound) throw new SyntaxError("Unexpected end of expression");
			if (caseFound[1] === "default") {
				if (defaultFound) throw new SyntaxError("Only one default switch case allowed");
				defaultFound = true;
			}
			const cond = restOfExp(constants, statement.substring(caseFound[0].length), [/^:/]);
			if (caseFound[1] !== "default" && !cond.trimStart().length) throw new SyntaxError("Unexpected end of expression");
			let found = emptyString;
			let i = start = caseFound[0].length + cond.length + 1;
			const bracketFound = /^\s*\{/.exec(statement.substring(i).toString());
			let exprs = [];
			if (bracketFound) {
				i += bracketFound[0].length;
				found = restOfExp(constants, statement.substring(i), [], "{");
				i += found.length + 1;
				exprs = lispifyBlock(found, constants, false, ctx);
			} else {
				const notEmpty = restOfExp(constants, statement.substring(i), [caseTest]);
				if (!notEmpty.trim().length) {
					exprs = [];
					i += notEmpty.length;
				} else {
					while ((found = restOfExp(constants, statement.substring(i), [semiColon])).length) {
						i += found.length + (statement.char(i + found.length) === ";" ? 1 : 0);
						if (caseTest.test(statement.substring(i).toString())) break;
					}
					exprs = lispifyBlock(statement.substring(start, found.end - statement.start), constants, false, ctx);
				}
			}
			statement = statement.substring(i);
			cases.push(createLisp({
				op: require_types.LispType.SwitchCase,
				a: caseFound[1] === "default" ? require_types.LispType.None : lispifyExpr(constants, cond, void 0, ctx),
				b: exprs
			}));
		}
		ctx.lispTree = wrapLabeledStatement(labels, createLisp({
			op: require_types.LispType.Switch,
			a: lispifyExpr(constants, test, void 0, ctx),
			b: cases
		}));
	});
}
//#endregion
exports.registerConditionalLispTypes = registerConditionalLispTypes;
