Object.defineProperties(exports, {
	__esModule: { value: true },
	[Symbol.toStringTag]: { value: "Module" }
});
const require_utils = require("./utils.js");
const require_unraw = require("./unraw.js");
//#region src/parser.ts
function createLisp(obj) {
	return [
		obj.op,
		obj.a,
		obj.b
	];
}
var NullLisp = createLisp({
	op: require_utils.LispType.None,
	a: require_utils.LispType.None,
	b: require_utils.LispType.None
});
var statementLabelRegex = /([a-zA-Z$_][\w$]*)\s*:/g;
function extractStatementLabels(prefix = "") {
	return [...prefix.matchAll(statementLabelRegex)].map((match) => match[1]);
}
function wrapLabeledStatement(labels, statement) {
	return labels.reduceRight((current, label) => createLisp({
		op: require_utils.LispType.Labeled,
		a: label,
		b: current
	}), statement);
}
var lispTypes = /* @__PURE__ */ new Map();
var ParseError = class extends Error {
	constructor(message, code) {
		super(message + ": " + code.substring(0, 40));
		this.code = code;
	}
};
var lastType;
var inlineIfElse = /^:/;
var elseIf = /^else(?![\w$])/;
var ifElse = /^if(?![\w$])/;
var space = /^\s/;
var expectTypes = {
	splitter: {
		types: {
			power: /^(\*\*)(?!=)/,
			opHigh: /^(\/|\*(?!\*)|%)(?!=)/,
			op: /^(\+(?!(\+))|-(?!(-)))(?!=)/,
			comparitor: /^(<=|>=|<(?!<)|>(?!>)|!==|!=(?!=)|===|==)/,
			bitwiseShift: /^(<<|>>(?!>)|>>>)(?!=)/,
			bitwiseAnd: /^(&(?!&))(?!=)/,
			bitwiseXor: /^(\^)(?!=)/,
			bitwiseOr: /^(\|(?!\|))(?!=)/,
			boolOpAnd: /^(&&)(?!=)/,
			boolOpOr: /^(\|\|(?!=)|instanceof(?![\w$])|in(?![\w$]))/,
			nullishCoalescing: /^\?\?(?!=)/
		},
		next: [
			"modifier",
			"value",
			"prop",
			"incrementerBefore"
		]
	},
	inlineIf: {
		types: { inlineIf: /^\?(?!\.(?!\d))/ },
		next: ["expEnd"]
	},
	assignment: {
		types: {
			assignModify: /^(-=|\+=|\/=|\*\*=|\*=|%=|\^=|&=|\|=|>>>=|>>=|<<=|&&=|\|\|=|\?\?=)/,
			assign: /^(=)(?!=)/
		},
		next: [
			"modifier",
			"value",
			"prop",
			"incrementerBefore"
		]
	},
	incrementerBefore: {
		types: { incrementerBefore: /^(\+\+|--)/ },
		next: ["prop"]
	},
	expEdge: {
		types: {
			call: /^(\?\.)?[(]/,
			incrementerAfter: /^(\+\+|--)/,
			taggedTemplate: /^`(\d+)`/
		},
		next: [
			"splitter",
			"assignment",
			"expEdge",
			"dot",
			"inlineIf",
			"expEnd"
		]
	},
	modifier: {
		types: {
			not: /^!/,
			inverse: /^~/,
			negative: /^-(?!-)/,
			positive: /^\+(?!\+)/,
			typeof: /^typeof(?![\w$])/,
			delete: /^delete(?![\w$])/
		},
		next: [
			"modifier",
			"value",
			"prop",
			"incrementerBefore"
		]
	},
	dot: {
		types: {
			arrayProp: /^(\?\.)?\[/,
			dot: /^(\?)?\.(?=\s*[a-zA-Z$_])/
		},
		next: [
			"splitter",
			"assignment",
			"expEdge",
			"dot",
			"inlineIf",
			"expEnd"
		]
	},
	prop: {
		types: { prop: /^[a-zA-Z$_][a-zA-Z\d$_]*/ },
		next: [
			"splitter",
			"assignment",
			"expEdge",
			"dot",
			"inlineIf",
			"expEnd"
		]
	},
	value: {
		types: {
			createObject: /^\{/,
			createArray: /^\[/,
			number: /^(0b[01]+(_[01]+)*|0o[0-7]+(_[0-7]+)*|0x[\da-f]+(_[\da-f]+)*|(\d+(_\d+)*(\.\d+(_\d+)*)?|\.\d+(_\d+)*))(e[+-]?\d+(_\d+)*)?(n)?(?!\d)/i,
			string: /^"(\d+)"/,
			literal: /^`(\d+)`/,
			regex: /^\/(\d+)\/r(?![\w$])/,
			boolean: /^(true|false)(?![\w$])/,
			null: /^null(?![\w$])/,
			und: /^undefined(?![\w$])/,
			arrowFunctionSingle: /^(async\s+)?([a-zA-Z$_][a-zA-Z\d$_]*)\s*=>\s*({)?/,
			arrowFunction: /^(async\s*)?\(\s*([^)(]*?)\s*\)\s*=>\s*({)?/,
			inlineFunction: /^(async\s+)?function(\*\s*|\s*)([a-zA-Z$_][a-zA-Z\d$_]*)?\s*\(\s*/,
			yield: /^yield\*(?![\w$])\s*|^yield(?![\w$])\s*/,
			group: /^\(/,
			NaN: /^NaN(?![\w$])/,
			Infinity: /^Infinity(?![\w$])/,
			void: /^void(?![\w$])\s*/,
			await: /^await(?![\w$])\s*/,
			new: /^new(?![\w$])\s*/
		},
		next: [
			"splitter",
			"expEdge",
			"dot",
			"inlineIf",
			"expEnd"
		]
	},
	initialize: {
		types: {
			initializeDestructure: /^(var|let|const|internal)\s+([{[])/,
			initialize: /^(var|let|const|internal)\s+([a-zA-Z$_][a-zA-Z\d$_]*)\s*(=)?/,
			return: /^return(?![\w$])/,
			throw: /^throw(?![\w$])\s*/
		},
		next: [
			"modifier",
			"value",
			"prop",
			"incrementerBefore",
			"expEnd"
		]
	},
	spreadObject: {
		types: { spreadObject: /^\.\.\./ },
		next: ["value", "prop"]
	},
	spreadArray: {
		types: { spreadArray: /^\.\.\./ },
		next: ["value", "prop"]
	},
	expEnd: {
		types: {},
		next: []
	},
	expFunction: {
		types: { function: /^(async\s+)?function(\*\s*|\s+)([a-zA-Z$_][a-zA-Z\d$_]*)\s*\(\s*/ },
		next: ["expEdge", "expEnd"]
	},
	expSingle: {
		types: {
			for: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*for(\s+await)?\s*\(/,
			do: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*do(?![\w$])\s*(\{)?/,
			while: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*while\s*\(/,
			loopAction: /^(break|continue)(?![\w$])\s*([a-zA-Z$_][\w$]*)?/,
			if: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*if\s*\(/,
			try: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*try\s*{/,
			block: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*{/,
			switch: /^((?:[a-zA-Z$_][\w$]*\s*:\s*)*)\s*switch\s*\(/
		},
		next: ["expEnd"]
	}
};
var closings = {
	"(": ")",
	"[": "]",
	"{": "}",
	"'": "'",
	"\"": "\"",
	"`": "`"
};
function testMultiple(str, tests) {
	let found = null;
	for (let i = 0; i < tests.length; i++) {
		found = tests[i].exec(str);
		if (found) break;
	}
	return found;
}
var emptyString = new require_utils.CodeString("");
var okFirstChars = /^[+\-~ !]/;
var aNumber = expectTypes.value.types.number;
var wordReg = /^((if|for|else|while|do|function)(?![\w$])|[\w$]+)/;
var semiColon = /^;/;
var insertedSemicolons = /* @__PURE__ */ new WeakMap();
var quoteCache = /* @__PURE__ */ new WeakMap();
function restOfExp(constants, part, tests, quote, firstOpening, closingsTests, details = {}, depth = 0) {
	if (!part.length) return part;
	if (depth > constants.maxDepth) throw new require_utils.SandboxCapabilityError("Maximum expression depth exceeded");
	details.words = details.words || [];
	let isStart = true;
	tests = tests || [];
	const hasSemiTest = tests.includes(semiColon);
	if (hasSemiTest) tests = tests.filter((a) => a !== semiColon);
	const insertedSemis = insertedSemicolons.get(part.ref) || [];
	const cache = quoteCache.get(part.ref) || /* @__PURE__ */ new Map();
	quoteCache.set(part.ref, cache);
	if (quote && cache.has(part.start - 1)) return part.substring(0, cache.get(part.start - 1) - part.start);
	let escape = false;
	let done = false;
	let lastChar = "";
	let isOneLiner = false;
	let i;
	let lastInertedSemi = false;
	let seenKeyword = false;
	let skipNextWord = false;
	for (i = 0; i < part.length && !done; i++) {
		let char = part.char(i);
		if (quote === "\"" || quote === "'" || quote === "`") {
			if (quote === "`" && char === "$" && part.char(i + 1) === "{" && !escape) {
				const skip = restOfExp(constants, part.substring(i + 2), [], "{", void 0, void 0, {}, depth + 1);
				i += skip.length + 2;
			} else if (char === quote && !escape) return part.substring(0, i);
			escape = !escape && char === "\\";
		} else if (closings[char]) {
			if (!lastInertedSemi && insertedSemis[i + part.start]) {
				lastInertedSemi = true;
				if (hasSemiTest) break;
				i--;
				lastChar = ";";
				continue;
			}
			if (isOneLiner && char === "{") isOneLiner = false;
			if (char === firstOpening) {
				done = true;
				break;
			} else {
				const skip = restOfExp(constants, part.substring(i + 1), [], char, void 0, void 0, {}, depth + 1);
				cache.set(skip.start - 1, skip.end);
				i += skip.length + 1;
				isStart = false;
				if (closingsTests) {
					const sub = part.substring(i);
					let found;
					if (found = testMultiple(sub.toString(), closingsTests)) {
						details.regRes = found;
						done = true;
					}
				}
			}
		} else if (!quote) {
			let sub = part.substring(i).toString();
			let foundWord;
			let foundNumber;
			if (closingsTests) {
				let found;
				if (found = testMultiple(sub, closingsTests)) {
					details.regRes = found;
					i++;
					done = true;
					break;
				}
			}
			if (foundNumber = aNumber.exec(sub)) {
				i += foundNumber[0].length - 1;
				sub = part.substring(i).toString();
				if (closingsTests) {
					let found;
					if (found = testMultiple(sub, closingsTests)) {
						details.regRes = found;
						i++;
						done = true;
						break;
					}
				}
			} else if (lastChar != char) {
				let found = null;
				if (char === ";" || insertedSemis[i + part.start] && !isStart && !lastInertedSemi) {
					if (hasSemiTest) found = [";"];
					else if (insertedSemis[i + part.start]) {
						lastInertedSemi = true;
						i--;
						lastChar = ";";
						continue;
					}
					char = sub = ";";
				} else lastInertedSemi = false;
				if (!found) found = testMultiple(sub, tests);
				if (found) done = true;
				if (!done && (foundWord = wordReg.exec(sub))) {
					isOneLiner = true;
					if (foundWord[2]) {
						seenKeyword = true;
						skipNextWord = true;
					} else if (seenKeyword) if (skipNextWord) skipNextWord = false;
					else details.bodyContentAfterKeyword = true;
					if (foundWord[0].length > 1) {
						details.words.push(foundWord[1]);
						details.lastAnyWord = foundWord[1];
						if (foundWord[2]) details.lastWord = foundWord[2];
					}
					if (foundWord[0].length > 2) i += foundWord[0].length - 2;
				}
			}
			if (isStart) if (okFirstChars.test(sub)) done = false;
			else isStart = false;
			if (done) break;
		} else if (char === closings[quote]) return part.substring(0, i);
		lastChar = char;
	}
	if (quote) throw new SyntaxError("Unclosed '" + quote + "'");
	if (details) details.oneliner = isOneLiner;
	return part.substring(0, i);
}
restOfExp.next = [
	"splitter",
	"expEnd",
	"inlineIf"
];
var startingExecpted = [
	"initialize",
	"expSingle",
	"expFunction",
	"value",
	"modifier",
	"prop",
	"incrementerBefore",
	"expEnd"
];
var setLispType = (types, fn) => {
	types.forEach((type) => {
		lispTypes.set(type, fn);
	});
};
var closingsCreate = {
	createArray: /^\]/,
	createObject: /^\}/,
	group: /^\)/,
	arrayProp: /^\]/,
	call: /^\)/
};
var typesCreate = {
	createArray: require_utils.LispType.CreateArray,
	createObject: require_utils.LispType.CreateObject,
	group: require_utils.LispType.Group,
	arrayProp: require_utils.LispType.ArrayProp,
	call: require_utils.LispType.Call,
	prop: require_utils.LispType.Prop,
	"?prop": require_utils.LispType.PropOptional,
	"?call": require_utils.LispType.CallOptional
};
setLispType([
	"createArray",
	"createObject",
	"group",
	"arrayProp",
	"call"
], (ctx) => {
	const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
	let extract = emptyString;
	const arg = [];
	let end = false;
	let i = res[0].length;
	const start = i;
	while (i < part.length && !end) {
		extract = restOfExp(constants, part.substring(i), [closingsCreate[type], /^,/]);
		i += extract.length;
		if (extract.trim().length) arg.push(extract);
		if (part.char(i) !== ",") end = true;
		else {
			if (!extract.trim().length && type === "call") throw new SyntaxError("Unexpected end of expression");
			i++;
		}
	}
	const next = type === "createArray" || type === "createObject" || type === "group" ? [
		"value",
		"modifier",
		"prop",
		"incrementerBefore",
		"assignment",
		"expEnd"
	] : [
		"value",
		"modifier",
		"prop",
		"incrementerBefore",
		"expEnd"
	];
	let l;
	let funcFound;
	switch (type) {
		case "group": {
			const groupContentStr = part.substring(start, i).trim().toString();
			if (groupContentStr.startsWith("{") || groupContentStr.startsWith("[")) {
				const patternEnd = findPatternEndIdx(groupContentStr);
				const patternStr = groupContentStr.slice(0, patternEnd).trim();
				const afterPattern = groupContentStr.slice(patternEnd).trimStart();
				if (afterPattern.startsWith("=")) {
					const rhsStr = afterPattern.slice(1).trim();
					const tempName = `$$_da${Math.random().toString(36).slice(2)}`;
					const expandedCode = `internal ${tempName} = (${rhsStr}); ${expandDestructure("", patternStr, tempName)}; ${tempName}`;
					l = createLisp({
						op: require_utils.LispType.InternalBlock,
						a: lispifyBlock(new require_utils.CodeString(expandedCode), constants, false, ctx),
						b: require_utils.LispType.None
					});
					break;
				}
			}
		}
		case "arrayProp": {
			const arrayPropExpr = part.substring(start, i);
			if (!arrayPropExpr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
			l = lispifyExpr(constants, arrayPropExpr, void 0, {
				...ctx,
				lispDepth: ctx.lispDepth + 1
			});
			break;
		}
		case "call":
		case "createArray":
			l = arg.map((e) => lispify(constants, e, [...next, "spreadArray"], void 0, false, ctx));
			break;
		case "createObject":
			l = arg.map((str) => {
				str = str.trimStart();
				let value;
				let key = "";
				if (str.char(0) === "[") {
					const innerExpr = restOfExp(constants, str.substring(1), [], "[");
					const afterBracket = str.substring(1 + innerExpr.length + 1).trimStart();
					key = lispify(constants, innerExpr, next);
					if (afterBracket.length > 0 && afterBracket.char(0) === ":") value = lispify(constants, afterBracket.substring(1));
					else if (afterBracket.length > 0 && afterBracket.char(0) === "(") value = lispify(constants, new require_utils.CodeString("function" + afterBracket.toString()));
					else throw new SyntaxError("Unexpected token in computed property");
					return createLisp({
						op: require_utils.LispType.KeyVal,
						a: key,
						b: value
					});
				}
				funcFound = expectTypes.expFunction.types.function.exec("function " + str);
				if (funcFound) {
					key = funcFound[3].trimStart();
					value = lispify(constants, new require_utils.CodeString("function " + str.toString().replace(key, "")));
				} else {
					const extract = restOfExp(constants, str, [/^:/]);
					key = lispify(constants, extract, [...next, "spreadObject"]);
					if (require_utils.isLisp(key) && key[0] === require_utils.LispType.SpreadObject) value = NullLisp;
					else {
						if (key[0] === require_utils.LispType.Prop) key = key[2];
						if (str.length > extract.length && str.char(extract.length) === ":") value = lispify(constants, str.substring(extract.length + 1));
						else value = lispify(constants, extract, next);
					}
				}
				return createLisp({
					op: require_utils.LispType.KeyVal,
					a: key,
					b: value
				});
			});
			break;
	}
	const lisptype = type === "arrayProp" ? res[1] ? require_utils.LispType.PropOptional : require_utils.LispType.Prop : type === "call" ? res[1] ? require_utils.LispType.CallOptional : require_utils.LispType.Call : typesCreate[type];
	const currentTree = createLisp({
		op: lisptype,
		a: ctx.lispTree,
		b: l
	});
	if (lisptype === require_utils.LispType.Group || lisptype === require_utils.LispType.CreateArray || lisptype === require_utils.LispType.CreateObject) currentTree.source = part.substring(start, i).toString();
	ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, currentTree, false, ctx);
});
var modifierTypes = {
	inverse: require_utils.LispType.Inverse,
	not: require_utils.LispType.Not,
	positive: require_utils.LispType.Positive,
	negative: require_utils.LispType.Negative,
	typeof: require_utils.LispType.Typeof,
	delete: require_utils.LispType.Delete
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
	const { constants, type, part, res, expect } = ctx;
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
		op: require_utils.LispType.StringIndex,
		a: require_utils.LispType.None,
		b: String(constants.strings.push(str) - 1)
	}));
	const stringsArrayLisp = createLisp({
		op: require_utils.LispType.CreateArray,
		a: createLisp({
			op: require_utils.LispType.None,
			a: require_utils.LispType.None,
			b: require_utils.LispType.None
		}),
		b: stringsArray
	});
	ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
		op: require_utils.LispType.Call,
		a: ctx.lispTree,
		b: [stringsArrayLisp, ...expressions]
	}), false, ctx);
});
var incrementTypes = {
	"++$": require_utils.LispType.IncrementBefore,
	"--$": require_utils.LispType.DecrementBefore,
	"$++": require_utils.LispType.IncrementAfter,
	"$--": require_utils.LispType.DecrementAfter
};
setLispType(["incrementerBefore"], (ctx) => {
	const { constants, part, res, expect } = ctx;
	const extract = restOfExp(constants, part.substring(2), [/^[^\s.\w$]/]);
	ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, createLisp({
		op: incrementTypes[res[0] + "$"],
		a: lispify(constants, extract, expectTypes[expect].next),
		b: require_utils.LispType.None
	}), false, ctx);
});
setLispType(["incrementerAfter"], (ctx) => {
	const { constants, part, res, expect } = ctx;
	if (require_utils.isLisp(ctx.lispTree) && (ctx.lispTree[0] === require_utils.LispType.Number || ctx.lispTree[0] === require_utils.LispType.BigInt || ctx.lispTree[0] === require_utils.LispType.GlobalSymbol || ctx.lispTree[0] === require_utils.LispType.StringIndex || ctx.lispTree[0] === require_utils.LispType.LiteralIndex || ctx.lispTree[0] === require_utils.LispType.RegexIndex)) throw new SyntaxError("Invalid left-hand side expression in postfix operation");
	ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
		op: incrementTypes["$" + res[0]],
		a: ctx.lispTree,
		b: require_utils.LispType.None
	}), false, ctx);
});
var adderTypes = {
	"&&": require_utils.LispType.And,
	"||": require_utils.LispType.Or,
	"??": require_utils.LispType.NullishCoalescing,
	instanceof: require_utils.LispType.Instanceof,
	in: require_utils.LispType.In,
	"=": require_utils.LispType.Assign,
	"-=": require_utils.LispType.SubractEquals,
	"+=": require_utils.LispType.AddEquals,
	"/=": require_utils.LispType.DivideEquals,
	"**=": require_utils.LispType.PowerEquals,
	"*=": require_utils.LispType.MultiplyEquals,
	"%=": require_utils.LispType.ModulusEquals,
	"^=": require_utils.LispType.BitNegateEquals,
	"&=": require_utils.LispType.BitAndEquals,
	"|=": require_utils.LispType.BitOrEquals,
	">>>=": require_utils.LispType.UnsignedShiftRightEquals,
	"<<=": require_utils.LispType.ShiftLeftEquals,
	">>=": require_utils.LispType.ShiftRightEquals,
	"&&=": require_utils.LispType.AndEquals,
	"||=": require_utils.LispType.OrEquals,
	"??=": require_utils.LispType.NullishCoalescingEquals
};
setLispType([
	"assign",
	"assignModify",
	"nullishCoalescing"
], (ctx) => {
	const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
	if (type !== "nullishCoalescing" && require_utils.isLisp(ctx.lispTree) && (ctx.lispTree[0] === require_utils.LispType.PropOptional || ctx.lispTree[0] === require_utils.LispType.CallOptional)) throw new SyntaxError("Invalid left-hand side in assignment");
	if (res[0] === "=") {
		const patternStr = getDestructurePatternSource(ctx.lispTree);
		if (patternStr) {
			const rhsStr = part.substring(res[0].length).toString();
			const tempName = `$$_da${Math.random().toString(36).slice(2)}`;
			const expandedCode = `internal ${tempName} = (${rhsStr}); ${expandDestructure("", patternStr, tempName)}; ${tempName}`;
			ctx.lispTree = createLisp({
				op: require_utils.LispType.InternalBlock,
				a: lispifyBlock(new require_utils.CodeString(expandedCode), constants, false, ctx),
				b: require_utils.LispType.None
			});
			return;
		}
	}
	ctx.lispTree = createLisp({
		op: adderTypes[res[0]],
		a: ctx.lispTree,
		b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next, void 0, false, {
			...ctx,
			lispDepth: ctx.lispDepth + 1
		})
	});
});
var opTypes = {
	"&": require_utils.LispType.BitAnd,
	"|": require_utils.LispType.BitOr,
	"^": require_utils.LispType.BitNegate,
	"<<": require_utils.LispType.BitShiftLeft,
	">>": require_utils.LispType.BitShiftRight,
	">>>": require_utils.LispType.BitUnsignedShiftRight,
	"<=": require_utils.LispType.SmallerEqualThan,
	">=": require_utils.LispType.LargerEqualThan,
	"<": require_utils.LispType.SmallerThan,
	">": require_utils.LispType.LargerThan,
	"!==": require_utils.LispType.StrictNotEqual,
	"!=": require_utils.LispType.NotEqual,
	"===": require_utils.LispType.StrictEqual,
	"==": require_utils.LispType.Equal,
	"+": require_utils.LispType.Plus,
	"-": require_utils.LispType.Minus,
	"/": require_utils.LispType.Divide,
	"**": require_utils.LispType.Power,
	"*": require_utils.LispType.Multiply,
	"%": require_utils.LispType.Modulus,
	"&&": require_utils.LispType.And,
	"||": require_utils.LispType.Or,
	instanceof: require_utils.LispType.Instanceof,
	in: require_utils.LispType.In
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
	const { constants, type, part, res, expect } = ctx;
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
		b: lispify(constants, extract, expectTypes[expect].next)
	}), false, ctx);
});
setLispType(["inlineIf"], (ctx) => {
	const { constants, part, res, expect, generatorDepth, asyncDepth } = ctx;
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
		op: require_utils.LispType.InlineIf,
		a: ctx.lispTree,
		b: createLisp({
			op: require_utils.LispType.InlineIfCase,
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
function extractIfElse(constants, part, depth = 0) {
	if (depth > constants.maxDepth) throw new require_utils.SandboxCapabilityError("Maximum expression depth exceeded");
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
	const { constants, part, res, generatorDepth, asyncDepth } = ctx;
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
		op: require_utils.LispType.If,
		a: lispifyExpr(constants, condition, void 0, ctx),
		b: createLisp({
			op: require_utils.LispType.IfCase,
			a: lispifyBlock(trueBlock, constants, false, ctx),
			b: lispifyBlock(elseBlock, constants, false, ctx)
		})
	}));
});
setLispType(["switch"], (ctx) => {
	const { constants, part, res, generatorDepth, asyncDepth } = ctx;
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
			op: require_utils.LispType.SwitchCase,
			a: caseFound[1] === "default" ? require_utils.LispType.None : lispifyExpr(constants, cond, void 0, ctx),
			b: exprs
		}));
	}
	ctx.lispTree = wrapLabeledStatement(labels, createLisp({
		op: require_utils.LispType.Switch,
		a: lispifyExpr(constants, test, void 0, ctx),
		b: cases
	}));
});
setLispType(["dot", "prop"], (ctx) => {
	const { constants, type, part, res, expect } = ctx;
	let prop = res[0];
	let index = res[0].length;
	let op = "prop";
	if (type === "dot") {
		if (res[1]) op = "?prop";
		const matches = part.substring(res[0].length).toString().match(expectTypes.prop.types.prop);
		if (matches && matches.length) {
			prop = matches[0];
			index = prop.length + res[0].length;
		} else throw new SyntaxError("Hanging dot");
	} else if (require_utils.reservedWords.has(prop) && prop !== "this") throw new SyntaxError(`Unexpected token '${prop}'`);
	ctx.lispTree = lispify(constants, part.substring(index), expectTypes[expect].next, createLisp({
		op: typesCreate[op],
		a: ctx.lispTree,
		b: prop
	}), false, ctx);
});
setLispType(["spreadArray", "spreadObject"], (ctx) => {
	const { constants, type, part, res, expect } = ctx;
	ctx.lispTree = createLisp({
		op: type === "spreadArray" ? require_utils.LispType.SpreadArray : require_utils.LispType.SpreadObject,
		a: require_utils.LispType.None,
		b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
	});
});
setLispType(["return", "throw"], (ctx) => {
	const { constants, type, part, res, generatorDepth, asyncDepth } = ctx;
	const expr = part.substring(res[0].length);
	if (type === "throw" && !expr.trimStart().length) throw new SyntaxError("Unexpected end of expression");
	ctx.lispTree = createLisp({
		op: type === "return" ? require_utils.LispType.Return : require_utils.LispType.Throw,
		a: require_utils.LispType.None,
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
		op: type === "number" ? res[12] ? require_utils.LispType.BigInt : require_utils.LispType.Number : require_utils.LispType.GlobalSymbol,
		a: require_utils.LispType.None,
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
		op: type === "string" ? require_utils.LispType.StringIndex : type === "literal" ? require_utils.LispType.LiteralIndex : require_utils.LispType.RegexIndex,
		a: require_utils.LispType.None,
		b: res[1]
	}), false, ctx);
});
function splitByCommasDestructure(s) {
	const parts = [];
	let depth = 0;
	let cur = "";
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === "[" || c === "{" || c === "(") depth++;
		else if (c === "]" || c === "}" || c === ")") depth--;
		if (c === "," && depth === 0) {
			parts.push(cur);
			cur = "";
		} else cur += c;
	}
	parts.push(cur);
	return parts;
}
function findFirstAtTopLevel(s, ch) {
	let depth = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === "[" || c === "{" || c === "(") depth++;
		else if (c === "]" || c === "}" || c === ")") depth--;
		if (c === ch && depth === 0) return i;
	}
	return -1;
}
function findPatternEndIdx(s) {
	let depth = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === "[" || c === "{") depth++;
		else if (c === "]" || c === "}") {
			depth--;
			if (depth === 0) return i + 1;
		}
	}
	return s.length;
}
var validIdentifier = /^[a-zA-Z$_][a-zA-Z\d$_]*$/;
function assertIdentifier(name) {
	if (!validIdentifier.test(name)) throw new SyntaxError(`Invalid destructuring target: '${name}'`);
	return name;
}
function expandDestructure(keyword, patternStr, rhsStr) {
	const stmts = [];
	function genTemp() {
		return `$$_d${Math.random().toString(36).slice(2)}`;
	}
	function processPattern(pattern, src) {
		pattern = pattern.trim();
		if (pattern.startsWith("[")) processArrayPattern(pattern.slice(1, -1), src);
		else if (pattern.startsWith("{")) processObjectPattern(pattern.slice(1, -1), src);
	}
	function processArrayPattern(content, src) {
		const elements = splitByCommasDestructure(content);
		for (let i = 0; i < elements.length; i++) {
			const elem = elements[i].trim();
			if (!elem) continue;
			if (elem.startsWith("...")) {
				const rest = elem.slice(3).trim();
				if (rest.startsWith("[") || rest.startsWith("{")) {
					const t = genTemp();
					stmts.push(`internal ${t} = ${src}.slice(${i})`);
					processPattern(rest, t);
				} else stmts.push(`${keyword} ${assertIdentifier(rest)} = ${src}.slice(${i})`);
				break;
			}
			const eqIdx = findFirstAtTopLevel(elem, "=");
			const target = eqIdx !== -1 ? elem.slice(0, eqIdx).trim() : elem.trim();
			const defaultVal = eqIdx !== -1 ? elem.slice(eqIdx + 1).trim() : void 0;
			if (target.startsWith("[") || target.startsWith("{")) {
				const t = genTemp();
				stmts.push(defaultVal !== void 0 ? `internal ${t} = ${src}[${i}] !== undefined ? ${src}[${i}] : (${defaultVal})` : `internal ${t} = ${src}[${i}]`);
				processPattern(target, t);
			} else stmts.push(defaultVal !== void 0 ? `${keyword} ${assertIdentifier(target)} = ${src}[${i}] !== undefined ? ${src}[${i}] : (${defaultVal})` : `${keyword} ${assertIdentifier(target)} = ${src}[${i}]`);
		}
	}
	function processObjectPattern(content, src) {
		const props = splitByCommasDestructure(content);
		const usedKeys = [];
		for (const prop of props) {
			const p = prop.trim();
			if (!p) continue;
			if (p.startsWith("...")) {
				const restIdx = props.indexOf(prop);
				if (props.slice(restIdx + 1).some((pp) => pp.trim().length > 0)) throw new SyntaxError("Rest element must be last element");
				const rest = p.slice(3).trim();
				const exclTemp = genTemp();
				const keyTemp = genTemp();
				const resTemp = genTemp();
				const exclEntries = usedKeys.map((k) => `${assertIdentifier(k)}:1`).join(",");
				stmts.push(`internal ${exclTemp} = {${exclEntries}}`);
				stmts.push(`internal ${resTemp} = {}`);
				stmts.push(`for (internal ${keyTemp} in ${src}) { if (!(${keyTemp} in ${exclTemp})) { ${resTemp}[${keyTemp}] = ${src}[${keyTemp}] } }`);
				if (rest.startsWith("[") || rest.startsWith("{")) processPattern(rest, resTemp);
				else stmts.push(`${keyword} ${assertIdentifier(rest)} = ${resTemp}`);
				break;
			}
			if (p.startsWith("[")) {
				let closeBracket = -1;
				let depth = 1;
				for (let ci = 1; ci < p.length; ci++) if (p[ci] === "[") depth++;
				else if (p[ci] === "]") {
					depth--;
					if (depth === 0) {
						closeBracket = ci;
						break;
					}
				}
				if (closeBracket !== -1) {
					const computedExpr = p.slice(1, closeBracket);
					const after = p.slice(closeBracket + 1).trim();
					if (after.startsWith(":")) {
						const valueStr = after.slice(1).trim();
						const accessor = `${src}[${computedExpr}]`;
						const eqIdx = findFirstAtTopLevel(valueStr, "=");
						const tgt = eqIdx !== -1 && !valueStr.slice(0, eqIdx).trim().match(/^[[{]/) ? valueStr.slice(0, eqIdx).trim() : valueStr.trim();
						const defVal = eqIdx !== -1 && !valueStr.slice(0, eqIdx).trim().match(/^[[{]/) ? valueStr.slice(eqIdx + 1).trim() : void 0;
						if (tgt.startsWith("[") || tgt.startsWith("{")) {
							const t = genTemp();
							stmts.push(defVal !== void 0 ? `internal ${t} = ${accessor} !== undefined ? ${accessor} : (${defVal})` : `internal ${t} = ${accessor}`);
							processPattern(tgt, t);
						} else stmts.push(defVal !== void 0 ? `${keyword} ${assertIdentifier(tgt)} = ${accessor} !== undefined ? ${accessor} : (${defVal})` : `${keyword} ${assertIdentifier(tgt)} = ${accessor}`);
					}
				}
				continue;
			}
			const colonIdx = findFirstAtTopLevel(p, ":");
			if (colonIdx !== -1) {
				const key = assertIdentifier(p.slice(0, colonIdx).trim());
				const valueStr = p.slice(colonIdx + 1).trim();
				usedKeys.push(key);
				const accessor = `${src}.${key}`;
				const eqIdx = findFirstAtTopLevel(valueStr, "=");
				const beforeEq = eqIdx !== -1 ? valueStr.slice(0, eqIdx).trim() : valueStr.trim();
				const isNestedPattern = beforeEq.startsWith("[") || beforeEq.startsWith("{");
				const tgt = isNestedPattern ? valueStr.trim() : beforeEq;
				const defVal = !isNestedPattern && eqIdx !== -1 ? valueStr.slice(eqIdx + 1).trim() : void 0;
				if (tgt.startsWith("[") || tgt.startsWith("{")) {
					const patEnd = findPatternEndIdx(tgt);
					const finalPattern = tgt.slice(0, patEnd);
					const afterPat = tgt.slice(patEnd).trim();
					const nestedDef = afterPat.startsWith("=") ? afterPat.slice(1).trim() : void 0;
					const t = genTemp();
					stmts.push(nestedDef !== void 0 ? `internal ${t} = ${accessor} !== undefined ? ${accessor} : (${nestedDef})` : `internal ${t} = ${accessor}`);
					processPattern(finalPattern, t);
				} else stmts.push(defVal !== void 0 ? `${keyword} ${assertIdentifier(tgt)} = ${accessor} !== undefined ? ${accessor} : (${defVal})` : `${keyword} ${assertIdentifier(tgt)} = ${accessor}`);
				continue;
			}
			const eqIdx = findFirstAtTopLevel(p, "=");
			if (eqIdx !== -1) {
				const name = assertIdentifier(p.slice(0, eqIdx).trim());
				const defaultVal = p.slice(eqIdx + 1).trim();
				usedKeys.push(name);
				stmts.push(`${keyword} ${name} = ${src}.${name} !== undefined ? ${src}.${name} : (${defaultVal})`);
			} else {
				assertIdentifier(p);
				usedKeys.push(p);
				stmts.push(`${keyword} ${p} = ${src}.${p}`);
			}
		}
	}
	const rootTemp = genTemp();
	stmts.unshift(`var ${rootTemp} = (${rhsStr})`);
	processPattern(patternStr, rootTemp);
	return stmts.join("; ");
}
function getDestructurePatternSource(tree) {
	if (!require_utils.isLisp(tree)) return null;
	const source = tree.source?.trim();
	if (source && (source.startsWith("[") || source.startsWith("{"))) return source;
	if (tree[0] === require_utils.LispType.Group) return getDestructurePatternSource(tree[2]);
	return null;
}
function expandFunctionParamDestructure(args, funcBody) {
	const injected = [];
	const newArgs = args.map((arg, i) => {
		const a = arg.trim();
		if (a.startsWith("[") || a.startsWith("{")) {
			const tempName = `$$_p${i}`;
			const patEnd = findPatternEndIdx(a);
			const patternOnly = a.slice(0, patEnd);
			const afterPat = a.slice(patEnd).trim();
			if (afterPat.startsWith("=")) {
				const defaultVal = afterPat.slice(1).trim();
				injected.push(expandDestructure("const", patternOnly, `${tempName} !== undefined ? ${tempName} : (${defaultVal})`));
			} else injected.push(expandDestructure("const", patternOnly, tempName));
			return tempName;
		}
		const eqIdx = findFirstAtTopLevel(a, "=");
		if (eqIdx !== -1 && !a.startsWith("...")) {
			const paramName = a.slice(0, eqIdx).trim();
			const defaultVal = a.slice(eqIdx + 1).trim();
			injected.push(`if (${paramName} === undefined) ${paramName} = (${defaultVal})`);
			return paramName;
		}
		return a;
	});
	if (injected.length === 0) return {
		args: newArgs,
		body: funcBody
	};
	return {
		args: newArgs,
		body: injected.join("; ") + "; " + funcBody
	};
}
setLispType(["initializeDestructure"], (ctx) => {
	const { constants, part, res, generatorDepth, asyncDepth } = ctx;
	const keyword = res[1];
	const openBracket = res[2];
	const closeBracket = openBracket === "[" ? "]" : "}";
	const patternContent = restOfExp(constants, part.substring(res[0].length), [], openBracket);
	const patternStr = openBracket + patternContent.toString() + closeBracket;
	const afterClose = part.substring(res[0].length + patternContent.length + 1).trimStart();
	if (!afterClose.length || afterClose.char(0) !== "=") throw new SyntaxError("Destructuring declaration requires an initializer");
	const stmts = lispifyBlock(new require_utils.CodeString(expandDestructure(keyword, patternStr, restOfExp(constants, afterClose.substring(1).trimStart(), [semiColon]).toString())), constants, false, ctx);
	ctx.lispTree = createLisp({
		op: require_utils.LispType.InternalBlock,
		a: stmts,
		b: require_utils.LispType.None
	});
});
setLispType(["initialize"], (ctx) => {
	const { constants, type, part, res, expect } = ctx;
	const lt = res[1] === "var" ? require_utils.LispType.Var : res[1] === "let" ? require_utils.LispType.Let : res[1] === "const" ? require_utils.LispType.Const : require_utils.LispType.Internal;
	if (!res[3]) ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
		op: lt,
		a: res[2],
		b: require_utils.LispType.None
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
	const isGenerator = !isArrow && res[2] && res[2].trimStart().startsWith("*") ? require_utils.LispType.True : require_utils.LispType.None;
	const isAsync = res[1] ? require_utils.LispType.True : require_utils.LispType.None;
	let rawArgStr;
	let bodyOffset;
	if (type === "function" || type === "inlineFunction") {
		const argsCode = restOfExp(constants, part.substring(res[0].length), [], "(");
		rawArgStr = argsCode.toString().trim();
		bodyOffset = res[0].length + argsCode.length + 1;
		const afterParen = part.substring(bodyOffset).trimStart();
		bodyOffset = part.length - afterParen.length + 1;
	} else {
		rawArgStr = type === "arrowFunctionSingle" ? res[2] ?? "" : res[2] ?? "";
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
		if (require_utils.reservedWords.has(arg.replace(/^\.\.\./, ""))) throw new SyntaxError(`Unexpected token '${arg}'`);
	});
	const afterFunc = isArrow ? res[0].length + f.length + 1 : bodyOffset + f.length + 1;
	ctx.lispTree = lispify(constants, part.substring(afterFunc), expectTypes[expect].next, createLisp({
		op: isArrow ? require_utils.LispType.ArrowFunction : type === "function" ? require_utils.LispType.Function : require_utils.LispType.InlineFunction,
		a: isArrow ? [isAsync, ...finalArgs] : [
			isAsync,
			isGenerator,
			...finalArgs
		],
		b: constants.eager ? lispifyFunction(new require_utils.CodeString(funcBody), constants, false, isArrow ? {
			generatorDepth: 0,
			asyncDepth: 0,
			lispDepth: 0
		} : {
			generatorDepth: isGenerator === require_utils.LispType.True ? generatorDepth + 1 : 0,
			asyncDepth: isAsync === require_utils.LispType.True ? asyncDepth + 1 : 0,
			lispDepth: 0
		}) : funcBody
	}), false, ctx);
});
var iteratorRegex = /^((let|var|const|internal)\s+)?\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s+(in|of)(?![\w$])/;
var iteratorDestructureRegex = /^((let|var|const|internal)\s+)\s*([[{])/;
setLispType([
	"for",
	"do",
	"while"
], (ctx) => {
	const { constants, type, part, res, expect, generatorDepth, asyncDepth } = ctx;
	const labels = extractStatementLabels(res[1]);
	let i = 0;
	let startStep = require_utils.LispType.True;
	let startInternal = [];
	let getIterator = require_utils.LispType.None;
	let beforeStep = require_utils.LispType.None;
	let checkFirst = require_utils.LispType.True;
	let condition;
	let step = require_utils.LispType.True;
	let body;
	const isForAwait = type === "for" && res[2] ? require_utils.LispType.True : require_utils.LispType.None;
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
					getIterator = lispifyReturnExpr(constants, iterableExpr), startInternal = isForAwait ? [asyncOfStart2, asyncOfStart3] : [ofStart2, ofStart3];
					condition = ofCondition;
					step = isForAwait ? asyncOfStep : ofStep;
					beforeStep = lispify(constants, new require_utils.CodeString((iterator[1] || "let ") + iterator[3] + " = $$next.value"), ["initialize"]);
				} else {
					if (isForAwait) throw new SyntaxError("Unexpected token 'in'");
					getIterator = lispifyReturnExpr(constants, iterableExpr), startInternal = [inStart2, inStart3];
					step = inStep;
					condition = inCondition;
					beforeStep = lispify(constants, new require_utils.CodeString((iterator[1] || "let ") + iterator[3] + " = $$keys[$$keyIndex]"), ["initialize"]);
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
					const stmts = lispifyBlock(new require_utils.CodeString(expandDestructure(keyword, patternStr, tempVarName)), constants, false, ctx);
					beforeStep = createLisp({
						op: require_utils.LispType.InternalBlock,
						a: [lispify(constants, new require_utils.CodeString(`${keyword} ${tempVarName} = $$next.value`), ["initialize"]), ...stmts],
						b: require_utils.LispType.None
					});
				} else {
					getIterator = lispifyReturnExpr(constants, iterExpr);
					startInternal = [inStart2, inStart3];
					step = inStep;
					condition = inCondition;
					const stmts = lispifyBlock(new require_utils.CodeString(expandDestructure(keyword, patternStr, tempVarName)), constants, false, ctx);
					beforeStep = createLisp({
						op: require_utils.LispType.InternalBlock,
						a: [lispify(constants, new require_utils.CodeString(`${keyword} ${tempVarName} = $$keys[$$keyIndex]`), ["initialize"]), ...stmts],
						b: require_utils.LispType.None
					});
				}
			} else if (args.length === 3) {
				const [startArg, conditionArg, stepArg] = args;
				if (startArg.length) startStep = lispifyExpr(constants, startArg, startingExecpted, ctx);
				if (conditionArg.length) condition = lispifyReturnExpr(constants, conditionArg);
				else condition = require_utils.LispType.True;
				if (stepArg.length) step = lispifyExpr(constants, stepArg, void 0, ctx);
			} else throw new SyntaxError("Invalid for loop definition");
			body = restOfExp(constants, part.substring(i)).trim();
			if (body.char(0) === "{") body = body.slice(1, -1);
			break;
		}
		case "do": {
			checkFirst = require_utils.LispType.None;
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
		op: require_utils.LispType.Loop,
		a,
		b: lispifyBlock(body, constants, false, ctx)
	});
});
setLispType(["block"], (ctx) => {
	const { constants, part, res, generatorDepth, asyncDepth } = ctx;
	ctx.lispTree = wrapLabeledStatement(extractStatementLabels(res[1]), createLisp({
		op: require_utils.LispType.Block,
		a: lispifyBlock(restOfExp(constants, part.substring(res[0].length), [], "{"), constants, false, ctx),
		b: require_utils.LispType.None
	}));
});
setLispType(["loopAction"], (ctx) => {
	const { part, res } = ctx;
	const remaining = part.substring(res[0].length).trimStart();
	if (remaining.length && !res[2]) throw new SyntaxError(`Unexpected token '${remaining.char(0)}'`);
	ctx.lispTree = createLisp({
		op: require_utils.LispType.LoopAction,
		a: res[1],
		b: res[2] || require_utils.LispType.None
	});
});
var catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s*\))?|finally)\s*\{/;
var catchEmptyBindingReg = /^\s*catch\s*\(\s*\)/;
var catchReservedBindingReg = /^\s*catch\s*\(\s*(break|case|catch|continue|debugger|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with|class|const|enum|export|extends|implements|import|interface|let|package|private|protected|public|static|super|yield|await)\s*\)/;
var finallyKeywordReg = /^\s*finally\b/;
setLispType(["try"], (ctx) => {
	const { constants, part, res, generatorDepth, asyncDepth } = ctx;
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
		op: require_utils.LispType.Try,
		a: lispifyBlock(insertSemicolons(constants, body), constants, false, ctx),
		b
	}));
});
setLispType(["void", "await"], (ctx) => {
	const { constants, type, part, res, expect } = ctx;
	const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
	if (!extract.trimStart().length) throw new SyntaxError("Unexpected end of expression");
	ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp({
		op: type === "void" ? require_utils.LispType.Void : require_utils.LispType.Await,
		a: lispify(constants, extract),
		b: require_utils.LispType.None
	}), false, ctx);
});
setLispType(["yield"], (ctx) => {
	const { constants, part, res, expect, generatorDepth } = ctx;
	if (generatorDepth === 0) throw new SyntaxError("Unexpected token");
	const isDelegate = res[0].trimEnd().endsWith("*");
	const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
	if (isDelegate && !extract.trimStart().length) throw new SyntaxError("Unexpected end of expression");
	ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp({
		op: isDelegate ? require_utils.LispType.YieldDelegate : require_utils.LispType.Yield,
		a: lispify(constants, extract),
		b: require_utils.LispType.None
	}), false, ctx);
});
setLispType(["new"], (ctx) => {
	const { constants, part, res, expect } = ctx;
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
		op: require_utils.LispType.New,
		a: lispify(constants, obj, expectTypes.initialize.next),
		b: args.map((arg) => lispify(constants, arg, expectTypes.initialize.next))
	}), false, ctx);
});
var ofStart2 = lispify({ maxDepth: 10 }, new require_utils.CodeString("let $$iterator = $$obj[Symbol.iterator]()"), ["initialize"]);
var ofStart3 = lispify({ maxDepth: 10 }, new require_utils.CodeString("let $$next = $$iterator.next()"), ["initialize"]);
var ofCondition = lispify({ maxDepth: 10 }, new require_utils.CodeString("return !$$next.done"), ["initialize"]);
var ofStep = lispify({ maxDepth: 10 }, new require_utils.CodeString("$$next = $$iterator.next()"));
var asyncOfStart2 = lispify({ maxDepth: 10 }, new require_utils.CodeString("let $$iterator = $$obj"), ["initialize"]);
var asyncOfStart3 = lispify({ maxDepth: 10 }, new require_utils.CodeString("let $$next = $$iterator.next()"), ["initialize"]);
var asyncOfStep = lispify({ maxDepth: 10 }, new require_utils.CodeString("$$next = $$iterator.next()"));
var inStart2 = lispify({ maxDepth: 10 }, new require_utils.CodeString("let $$keys = Object.keys($$obj)"), ["initialize"]);
var inStart3 = lispify({ maxDepth: 10 }, new require_utils.CodeString("let $$keyIndex = 0"), ["initialize"]);
var inStep = lispify({ maxDepth: 10 }, new require_utils.CodeString("$$keyIndex++"));
var inCondition = lispify({ maxDepth: 10 }, new require_utils.CodeString("return $$keyIndex < $$keys.length"), ["initialize"]);
function lispify(constants, part, expected, lispTree, topLevel = false, depthCtx = {
	generatorDepth: 0,
	asyncDepth: 0,
	lispDepth: 0
}) {
	if (depthCtx.lispDepth > constants.maxDepth) throw new require_utils.SandboxCapabilityError("Maximum expression depth exceeded");
	const { generatorDepth, asyncDepth, lispDepth } = depthCtx;
	lispTree = lispTree || NullLisp;
	expected = expected || expectTypes.initialize.next;
	if (part === void 0) return lispTree;
	part = part.trimStart();
	const str = part.toString();
	if (!part.length && !expected.includes("expEnd")) throw new SyntaxError("Unexpected end of expression");
	if (!part.length) return lispTree;
	const ctx = {
		constants,
		type: "",
		part,
		res: [],
		expect: "",
		lispTree,
		generatorDepth,
		asyncDepth,
		lispDepth
	};
	let res;
	for (const expect of expected) {
		if (expect === "expEnd") continue;
		for (const type in expectTypes[expect].types) {
			if (type === "expEnd") continue;
			if (res = expectTypes[expect].types[type].exec(str)) {
				lastType = type;
				ctx.type = type;
				ctx.part = part;
				ctx.res = res;
				ctx.expect = expect;
				try {
					lispTypes.get(type)?.(ctx);
				} catch (e) {
					if (topLevel && e instanceof SyntaxError) throw new ParseError(e.message, str);
					throw e;
				}
				break;
			}
		}
		if (res) break;
	}
	if (!res && part.length) {
		if (topLevel) throw new ParseError(`Unexpected token after ${lastType}: ${part.char(0)}`, str);
		throw new SyntaxError(`Unexpected token after ${lastType}: ${part.char(0)}`);
	}
	return ctx.lispTree;
}
var startingExpectedWithoutSingle = startingExecpted.filter((r) => r !== "expSingle");
function lispifyExpr(constants, str, expected, depthCtx = {
	generatorDepth: 0,
	asyncDepth: 0,
	lispDepth: 0
}) {
	if (depthCtx.lispDepth > constants.maxDepth) throw new require_utils.SandboxCapabilityError("Maximum expression depth exceeded");
	if (!str.trimStart().length) return NullLisp;
	const subExpressions = [];
	let sub;
	let pos = 0;
	expected = expected || expectTypes.initialize.next;
	if (expected.includes("expSingle")) {
		if (testMultiple(str.toString(), Object.values(expectTypes.expSingle.types))) return lispify(constants, str, ["expSingle"], void 0, true, depthCtx);
	}
	if (expected === startingExecpted) expected = startingExpectedWithoutSingle;
	while ((sub = restOfExp(constants, str.substring(pos), [/^,/])).length) {
		subExpressions.push(sub.trimStart());
		pos += sub.length + 1;
	}
	if (subExpressions.length === 1) return lispify(constants, str, expected, void 0, true, depthCtx);
	if (expected.includes("initialize")) {
		const defined = expectTypes.initialize.types.initialize.exec(subExpressions[0].toString());
		if (defined) return createLisp({
			op: require_utils.LispType.InternalBlock,
			a: subExpressions.map((str, i) => lispify(constants, i ? new require_utils.CodeString(defined[1] + " " + str) : str, ["initialize"], void 0, true, depthCtx)),
			b: require_utils.LispType.None
		});
		else if (expectTypes.initialize.types.return.exec(subExpressions[0].toString())) return lispify(constants, str, expected, void 0, true, depthCtx);
	}
	const exprs = subExpressions.map((str) => lispify(constants, str, expected, void 0, true, depthCtx));
	return createLisp({
		op: require_utils.LispType.Expression,
		a: exprs,
		b: require_utils.LispType.None
	});
}
function lispifyReturnExpr(constants, str) {
	return createLisp({
		op: require_utils.LispType.Return,
		a: require_utils.LispType.None,
		b: lispifyExpr(constants, str)
	});
}
function lispifyBlock(str, constants, expression = false, depthCtx = {
	generatorDepth: 0,
	asyncDepth: 0,
	lispDepth: 0
}) {
	str = insertSemicolons(constants, str);
	if (!str.trim().length) return [];
	const parts = [];
	let part;
	let pos = 0;
	let start = 0;
	let details = {};
	let skipped = false;
	let isInserted = false;
	while ((part = restOfExp(constants, str.substring(pos), [semiColon], void 0, void 0, void 0, details)).length) {
		isInserted = !!(str.char(pos + part.length) && str.char(pos + part.length) !== ";");
		pos += part.length + (isInserted ? 0 : 1);
		if (/^\s*else(?![\w$])/.test(str.substring(pos).toString())) skipped = true;
		else if (details["words"]?.includes("do") && /^\s*while(?![\w$])/.test(str.substring(pos).toString())) skipped = true;
		else {
			skipped = false;
			parts.push(str.substring(start, pos - (isInserted ? 0 : 1)));
			start = pos;
		}
		details = {};
		if (expression) break;
	}
	if (skipped) parts.push(str.substring(start, pos - (isInserted ? 0 : 1)));
	return parts.map((str) => str.trimStart()).filter((str) => str.length).map((str) => {
		return lispifyExpr(constants, str.trimStart(), startingExecpted, depthCtx);
	});
}
function lispifyFunction(str, constants, expression = false, depthCtx = {
	generatorDepth: 0,
	asyncDepth: 0,
	lispDepth: 0
}) {
	if (!str.trim().length) return [];
	const tree = lispifyBlock(str, constants, expression, depthCtx);
	hoist(tree);
	return tree;
}
function hoist(item, res = []) {
	if (require_utils.isLisp(item)) {
		if (!require_utils.isLisp(item)) return false;
		const [op, a, b] = item;
		if (op === require_utils.LispType.Labeled || op === require_utils.LispType.Try || op === require_utils.LispType.If || op === require_utils.LispType.Loop || op === require_utils.LispType.Switch) {
			hoist(a, res);
			hoist(b, res);
		} else if (op === require_utils.LispType.Var) res.push(createLisp({
			op: require_utils.LispType.Var,
			a,
			b: require_utils.LispType.None
		}));
		else if (op === require_utils.LispType.Function && a[2]) {
			res.push(item);
			return true;
		}
	} else if (Array.isArray(item)) {
		const rep = [];
		for (const it of item) if (!hoist(it, res)) rep.push(it);
		if (rep.length !== item.length) {
			item.length = 0;
			item.push(...res, ...rep);
		}
	}
	return false;
}
var closingsNoInsertion = /^(\})\s*(catch|finally|else|while|instanceof)(?![\w$])/;
var colonsRegex = /^((([\w$\])"'`]|\+\+|--)\s*\r?\n\s*([\w$+\-!~]))|(\}\s*[\w$!~+\-{("'`]))/;
function insertSemicolons(constants, str) {
	let rest = str;
	let sub = emptyString;
	let details = {};
	let pendingDoWhile = false;
	const inserted = insertedSemicolons.get(str.ref) || new Array(str.ref.str.length);
	while ((sub = restOfExp(constants, rest, [], void 0, void 0, [colonsRegex], details)).length) {
		let valid = false;
		let part = sub;
		let edge = sub.length;
		if (details.regRes) {
			valid = true;
			const [, , a, , , b] = details.regRes;
			edge = details.regRes[3] === "++" || details.regRes[3] === "--" ? sub.length + 1 : sub.length;
			part = rest.substring(0, edge);
			if (b) {
				const res = closingsNoInsertion.exec(rest.substring(sub.length - 1).toString());
				if (res) if (res[2] === "while") if (details.lastWord === "do") {
					valid = false;
					pendingDoWhile = true;
				} else valid = true;
				else valid = false;
				else if (details.lastWord === "function" && details.regRes[5][0] === "}" && details.regRes[5].slice(-1) === "(") valid = false;
			} else if (a) {
				if (pendingDoWhile && details.lastWord === "while") {
					valid = true;
					pendingDoWhile = false;
				} else if (details.lastWord === "if" || details.lastWord === "while" || details.lastWord === "for" || details.lastWord === "else") valid = !!details.bodyContentAfterKeyword;
			}
		}
		if (valid) inserted[part.end] = true;
		rest = rest.substring(edge);
		details = {};
	}
	insertedSemicolons.set(str.ref, inserted);
	return str;
}
function checkRegex(str) {
	let i = 1;
	let escape = false;
	let done = false;
	let cancel = false;
	while (i < str.length && !done && !cancel) {
		done = str[i] === "/" && !escape;
		escape = str[i] === "\\" && !escape;
		cancel = str[i] === "\n";
		i++;
	}
	const after = str.substring(i);
	cancel = cancel || !done || /^\s*\d/.test(after);
	if (cancel) return null;
	const flags = /^[a-z]*/.exec(after);
	if (/^\s+[\w$]/.test(str.substring(i + flags[0].length))) return null;
	const regexPattern = str.substring(1, i - 1);
	const regexFlags = flags && flags[0] || "";
	try {
		new RegExp(regexPattern, regexFlags);
	} catch (e) {
		if (e instanceof SyntaxError) throw e;
	}
	return {
		regex: regexPattern,
		flags: regexFlags,
		length: i + (flags && flags[0].length || 0)
	};
}
var notDivide = /(typeof|delete|instanceof|return|in|of|throw|new|void|do|if)$/;
var possibleDivide = /^([\w$\])]|\+\+|--)[\s/]/;
function extractConstants(constants, str, currentEnclosure = "", depth = 0) {
	if (depth > constants.maxDepth) throw new require_utils.SandboxCapabilityError("Maximum expression depth exceeded");
	let quote;
	let extract = [];
	let escape = false;
	let regexFound;
	let comment = "";
	let commentStart = -1;
	let currJs = [];
	let char = "";
	const strRes = [];
	const enclosures = [];
	let isPossibleDivide = null;
	let i = 0;
	for (i = 0; i < str.length; i++) {
		char = str[i];
		if (comment) {
			if (char === comment) {
				if (comment === "*" && str[i + 1] === "/") {
					comment = "";
					i++;
				} else if (comment === "\n") {
					comment = "";
					strRes.push("\n");
				}
			}
		} else {
			if (escape) {
				escape = false;
				extract.push(char);
				continue;
			}
			if (quote) if (quote === "`" && char === "$" && str[i + 1] === "{") {
				const skip = extractConstants(constants, str.substring(i + 2), "{", depth + 1);
				if (!skip.str.trim().length) throw new SyntaxError("Unexpected end of expression");
				currJs.push(skip.str);
				extract.push("${", currJs.length - 1, `}`);
				i += skip.length + 2;
			} else if (quote === char) {
				if (quote === "`") {
					const li = createLisp({
						op: require_utils.LispType.Literal,
						a: require_unraw.default(extract.join("")),
						b: []
					});
					li.tempJsStrings = currJs;
					constants.literals.push(li);
					strRes.push(`\``, constants.literals.length - 1, `\``);
				} else {
					constants.strings.push(require_unraw.default(extract.join("")));
					strRes.push(`"`, constants.strings.length - 1, `"`);
				}
				quote = null;
				extract = [];
			} else extract.push(char);
			else {
				if (char === "'" || char === "\"" || char === "`") {
					currJs = [];
					quote = char;
				} else if (closings[currentEnclosure] === char && !enclosures.length) return {
					str: strRes.join(""),
					length: i
				};
				else if (closings[char]) {
					enclosures.push(char);
					strRes.push(char);
				} else if (closings[enclosures[enclosures.length - 1]] === char) {
					enclosures.pop();
					strRes.push(char);
				} else if (char === "/" && (str[i + 1] === "*" || str[i + 1] === "/")) {
					comment = str[i + 1] === "*" ? "*" : "\n";
					commentStart = i;
				} else if (char === "/" && !isPossibleDivide && (regexFound = checkRegex(str.substring(i)))) {
					constants.regexes.push(regexFound);
					strRes.push(`/`, constants.regexes.length - 1, `/r`);
					i += regexFound.length - 1;
				} else strRes.push(char);
				if (!isPossibleDivide || !space.test(char)) {
					if (isPossibleDivide = possibleDivide.exec(str.substring(i))) {
						if (notDivide.test(str.substring(0, i + isPossibleDivide[1].length))) isPossibleDivide = null;
					}
				}
			}
			escape = !!(quote && char === "\\");
		}
	}
	if (quote) throw new SyntaxError(`Unclosed '${quote}'`);
	if (comment) {
		if (comment === "*") throw new SyntaxError(`Unclosed comment '/*': ${str.substring(commentStart)}`);
	}
	return {
		str: strRes.join(""),
		length: i
	};
}
function parse(code, eager = false, expression = false, maxParserRecursionDepth = 256) {
	if (typeof code !== "string") throw new ParseError(`Cannot parse ${code}`, String(code));
	let str = " " + code;
	const constants = {
		strings: [],
		literals: [],
		regexes: [],
		eager,
		maxDepth: maxParserRecursionDepth
	};
	str = extractConstants(constants, str).str;
	for (const l of constants.literals) {
		l[2] = l.tempJsStrings.map((js) => lispifyExpr(constants, new require_utils.CodeString(js)));
		delete l.tempJsStrings;
	}
	return {
		tree: lispifyFunction(new require_utils.CodeString(str), constants, expression),
		constants
	};
}
//#endregion
exports.ParseError = ParseError;
exports.checkRegex = checkRegex;
exports.default = parse;
exports.expectTypes = expectTypes;
exports.extractConstants = extractConstants;
exports.insertSemicolons = insertSemicolons;
exports.lispifyBlock = lispifyBlock;
exports.lispifyFunction = lispifyFunction;
exports.lispifyReturnExpr = lispifyReturnExpr;
exports.restOfExp = restOfExp;
exports.setLispType = setLispType;
exports.testMultiple = testMultiple;
