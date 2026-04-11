import unraw from "../utils/unraw.js";
import { SandboxCapabilityError } from "../utils/errors.js";
import { CodeString } from "../utils/CodeString.js";
import { LispType } from "../utils/types.js";
import { isLisp } from "../utils/ExecContext.js";
import "../utils/index.js";
import { registerLispTypes } from "./lispTypes/index.js";
//#region src/parser/parserUtils.ts
function createLisp(obj) {
	return [
		obj.op,
		obj.a,
		obj.b
	];
}
var NullLisp = createLisp({
	op: LispType.None,
	a: LispType.None,
	b: LispType.None
});
var statementLabelRegex = /([a-zA-Z$_][\w$]*)\s*:/g;
function extractStatementLabels(prefix = "") {
	return [...prefix.matchAll(statementLabelRegex)].map((match) => match[1]);
}
function wrapLabeledStatement(labels, statement) {
	return labels.reduceRight((current, label) => createLisp({
		op: LispType.Labeled,
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
var emptyString = new CodeString("");
var okFirstChars = /^[+\-~ !]/;
var aNumber = expectTypes.value.types.number;
var wordReg = /^((if|for|else|while|do|function)(?![\w$])|[\w$]+)/;
var semiColon = /^;/;
var insertedSemicolons = /* @__PURE__ */ new WeakMap();
var quoteCache = /* @__PURE__ */ new WeakMap();
function restOfExp(constants, part, tests, quote, firstOpening, closingsTests, details = {}, depth = 0) {
	if (!part.length) return part;
	if (depth > constants.maxDepth) throw new SandboxCapabilityError("Maximum expression depth exceeded");
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
registerLispTypes({
	NullLisp,
	ParseError,
	createLisp,
	emptyString,
	expectTypes,
	expandDestructure,
	expandFunctionParamDestructure,
	extractStatementLabels,
	findPatternEndIdx,
	getDestructurePatternSource,
	insertSemicolons,
	lispify,
	lispifyBlock,
	lispifyExpr,
	lispifyFunction,
	lispifyReturnExpr,
	restOfExp,
	semiColon,
	setLispType,
	splitByCommasDestructure,
	startingExecpted,
	wrapLabeledStatement
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
	if (!isLisp(tree)) return null;
	const source = tree.source?.trim();
	if (source && (source.startsWith("[") || source.startsWith("{"))) return source;
	if (tree[0] === LispType.Group) return getDestructurePatternSource(tree[2]);
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
function lispify(constants, part, expected, lispTree, topLevel = false, depthCtx = {
	generatorDepth: 0,
	asyncDepth: 0,
	lispDepth: 0
}) {
	if (depthCtx.lispDepth > constants.maxDepth) throw new SandboxCapabilityError("Maximum expression depth exceeded");
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
	if (depthCtx.lispDepth > constants.maxDepth) throw new SandboxCapabilityError("Maximum expression depth exceeded");
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
			op: LispType.InternalBlock,
			a: subExpressions.map((str, i) => lispify(constants, i ? new CodeString(defined[1] + " " + str) : str, ["initialize"], void 0, true, depthCtx)),
			b: LispType.None
		});
		else if (expectTypes.initialize.types.return.exec(subExpressions[0].toString())) return lispify(constants, str, expected, void 0, true, depthCtx);
	}
	const exprs = subExpressions.map((str) => lispify(constants, str, expected, void 0, true, depthCtx));
	return createLisp({
		op: LispType.Expression,
		a: exprs,
		b: LispType.None
	});
}
function lispifyReturnExpr(constants, str) {
	return createLisp({
		op: LispType.Return,
		a: LispType.None,
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
	if (isLisp(item)) {
		if (!isLisp(item)) return false;
		const [op, a, b] = item;
		if (op === LispType.Labeled || op === LispType.Try || op === LispType.If || op === LispType.Loop || op === LispType.Switch) {
			hoist(a, res);
			hoist(b, res);
		} else if (op === LispType.Var) res.push(createLisp({
			op: LispType.Var,
			a,
			b: LispType.None
		}));
		else if (op === LispType.Function && a[2]) {
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
	if (depth > constants.maxDepth) throw new SandboxCapabilityError("Maximum expression depth exceeded");
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
						op: LispType.Literal,
						a: unraw(extract.join("")),
						b: []
					});
					li.tempJsStrings = currJs;
					constants.literals.push(li);
					strRes.push(`\``, constants.literals.length - 1, `\``);
				} else {
					constants.strings.push(unraw(extract.join("")));
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
		l[2] = l.tempJsStrings.map((js) => lispifyExpr(constants, new CodeString(js)));
		delete l.tempJsStrings;
	}
	return {
		tree: lispifyFunction(new CodeString(str), constants, expression),
		constants
	};
}
//#endregion
export { ParseError, checkRegex, parse as default, expectTypes, extractConstants, insertSemicolons, lispifyBlock, lispifyFunction, lispifyReturnExpr, restOfExp, setLispType, testMultiple };

//# sourceMappingURL=parserUtils.js.map