'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Parse a string as a base-16 number. This is more strict than `parseInt` as it
 * will not allow any other characters, including (for example) "+", "-", and
 * ".".
 * @param hex A string containing a hexadecimal number.
 * @returns The parsed integer, or `NaN` if the string is not a valid hex
 * number.
 */
function parseHexToInt(hex) {
    const isOnlyHexChars = !hex.match(/[^a-f0-9]/i);
    return isOnlyHexChars ? parseInt(hex, 16) : NaN;
}
/**
 * Check the validity and length of a hexadecimal code and optionally enforces
 * a specific number of hex digits.
 * @param hex The string to validate and parse.
 * @param errorName The name of the error message to throw a `SyntaxError` with
 * if `hex` is invalid. This is used to index `errorMessages`.
 * @param enforcedLength If provided, will throw an error if `hex` is not
 * exactly this many characters.
 * @returns The parsed hex number as a normal number.
 * @throws {SyntaxError} If the code is not valid.
 */
function validateAndParseHex(hex, errorName, enforcedLength) {
    const parsedHex = parseHexToInt(hex);
    if (Number.isNaN(parsedHex) ||
        (enforcedLength !== undefined && enforcedLength !== hex.length)) {
        throw new SyntaxError(errorName + ': ' + hex);
    }
    return parsedHex;
}
/**
 * Parse a two-digit hexadecimal character escape code.
 * @param code The two-digit hexadecimal number that represents the character to
 * output.
 * @returns The single character represented by the code.
 * @throws {SyntaxError} If the code is not valid hex or is not the right
 * length.
 */
function parseHexadecimalCode(code) {
    const parsedCode = validateAndParseHex(code, 'Malformed Hexadecimal', 2);
    return String.fromCharCode(parsedCode);
}
/**
 * Parse a four-digit Unicode character escape code.
 * @param code The four-digit unicode number that represents the character to
 * output.
 * @param surrogateCode Optional four-digit unicode surrogate that represents
 * the other half of the character to output.
 * @returns The single character represented by the code.
 * @throws {SyntaxError} If the codes are not valid hex or are not the right
 * length.
 */
function parseUnicodeCode(code, surrogateCode) {
    const parsedCode = validateAndParseHex(code, 'Malformed Unicode', 4);
    if (surrogateCode !== undefined) {
        const parsedSurrogateCode = validateAndParseHex(surrogateCode, 'Malformed Unicode', 4);
        return String.fromCharCode(parsedCode, parsedSurrogateCode);
    }
    return String.fromCharCode(parsedCode);
}
/**
 * Test if the text is surrounded by curly braces (`{}`).
 * @param text Text to check.
 * @returns `true` if the text is in the form `{*}`.
 */
function isCurlyBraced(text) {
    return text.charAt(0) === "{" && text.charAt(text.length - 1) === "}";
}
/**
 * Parse a Unicode code point character escape code.
 * @param codePoint A unicode escape code point, including the surrounding curly
 * braces.
 * @returns The single character represented by the code.
 * @throws {SyntaxError} If the code is not valid hex or does not have the
 * surrounding curly braces.
 */
function parseUnicodeCodePointCode(codePoint) {
    if (!isCurlyBraced(codePoint)) {
        throw new SyntaxError('Malformed Unicode: +' + codePoint);
    }
    const withoutBraces = codePoint.slice(1, -1);
    const parsedCode = validateAndParseHex(withoutBraces, 'Malformed Unicode');
    try {
        return String.fromCodePoint(parsedCode);
    }
    catch (err) {
        throw err instanceof RangeError
            ? new SyntaxError('Code Point Limit:' + parsedCode)
            : err;
    }
}
/**
 * Map of unescaped letters to their corresponding special JS escape characters.
 * Intentionally does not include characters that map to themselves like "\'".
 */
const singleCharacterEscapes = new Map([
    ["b", "\b"],
    ["f", "\f"],
    ["n", "\n"],
    ["r", "\r"],
    ["t", "\t"],
    ["v", "\v"],
    ["0", "\0"]
]);
/**
 * Parse a single character escape sequence and return the matching character.
 * If none is matched, defaults to `code`.
 * @param code A single character code.
 */
function parseSingleCharacterCode(code) {
    return singleCharacterEscapes.get(code) || code;
}
/**
 * Matches every escape sequence possible, including invalid ones.
 *
 * All capture groups (described below) are unique (only one will match), except
 * for 4, which can only potentially match if 3 does.
 *
 * **Capture Groups:**
 * 0. A single backslash
 * 1. Hexadecimal code
 * 2. Unicode code point code with surrounding curly braces
 * 3. Unicode escape code with surrogate
 * 4. Surrogate code
 * 5. Unicode escape code without surrogate
 * 6. Octal code _NOTE: includes "0"._
 * 7. A single character (will never be \, x, u, or 0-3)
 */
const escapeMatch = /\\(?:(\\)|x([\s\S]{0,2})|u(\{[^}]*\}?)|u([\s\S]{4})\\u([^{][\s\S]{0,3})|u([\s\S]{0,4})|([0-3]?[0-7]{1,2})|([\s\S])|$)/g;
/**
 * Replace raw escape character strings with their escape characters.
 * @param raw A string where escape characters are represented as raw string
 * values like `\'` rather than `'`.
 * @param allowOctals If `true`, will process the now-deprecated octal escape
 * sequences (ie, `\111`).
 * @returns The processed string, with escape characters replaced by their
 * respective actual Unicode characters.
 */
function unraw(raw) {
    return raw.replace(escapeMatch, function (_, backslash, hex, codePoint, unicodeWithSurrogate, surrogate, unicode, octal, singleCharacter) {
        // Compare groups to undefined because empty strings mean different errors
        // Otherwise, `\u` would fail the same as `\` which is wrong.
        if (backslash !== undefined) {
            return "\\";
        }
        if (hex !== undefined) {
            return parseHexadecimalCode(hex);
        }
        if (codePoint !== undefined) {
            return parseUnicodeCodePointCode(codePoint);
        }
        if (unicodeWithSurrogate !== undefined) {
            return parseUnicodeCode(unicodeWithSurrogate, surrogate);
        }
        if (unicode !== undefined) {
            return parseUnicodeCode(unicode);
        }
        if (octal === "0") {
            return "\0";
        }
        if (octal !== undefined) {
            throw new SyntaxError('Octal Deprecation: ' + octal);
        }
        if (singleCharacter !== undefined) {
            return parseSingleCharacterCode(singleCharacter);
        }
        throw new SyntaxError('End of string');
    });
}

function createLisp(obj) {
    return [obj.op, obj.a, obj.b];
}
let lispTypes = new Map();
class ParseError extends Error {
    constructor(message, code) {
        super(message + ": " + code.substring(0, 40));
        this.code = code;
    }
}
const inlineIfElse = /^:/;
const elseIf = /^else(?![\w\$])/;
const ifElse = /^if(?![\w\$])/;
const space = /^\s/;
let expectTypes = {
    splitter: {
        types: {
            opHigh: /^(\/|\*\*|\*(?!\*)|\%)(?!\=)/,
            op: /^(\+(?!(\+))|\-(?!(\-)))(?!\=)/,
            comparitor: /^(<=|>=|<(?!<)|>(?!>)|!==|!=(?!\=)|===|==)/,
            boolOp: /^(&&|\|\||instanceof(?![\w\$])|in(?![\w\$]))/,
            bitwise: /^(&(?!&)|\|(?!\|)|\^|<<|>>(?!>)|>>>)(?!\=)/,
        },
        next: [
            'modifier',
            'value',
            'prop',
            'incrementerBefore',
        ]
    },
    inlineIf: {
        types: {
            inlineIf: /^\?(?!\.(?!\d))/,
        },
        next: [
            'expEnd'
        ]
    },
    assignment: {
        types: {
            assignModify: /^(\-=|\+=|\/=|\*\*=|\*=|%=|\^=|\&=|\|=|>>>=|>>=|<<=)/,
            assign: /^(=)(?!=)/
        },
        next: [
            'modifier',
            'value',
            'prop',
            'incrementerBefore',
        ]
    },
    incrementerBefore: {
        types: { incrementerBefore: /^(\+\+|\-\-)/ },
        next: [
            'prop',
        ]
    },
    expEdge: {
        types: {
            call: /^(\?\.)?[\(]/,
            incrementerAfter: /^(\+\+|\-\-)/
        },
        next: [
            'splitter',
            'expEdge',
            'dot',
            'inlineIf',
            'expEnd'
        ]
    },
    modifier: {
        types: {
            not: /^!/,
            inverse: /^~/,
            negative: /^\-(?!\-)/,
            positive: /^\+(?!\+)/,
            typeof: /^typeof(?![\w\$])/,
            delete: /^delete(?![\w\$])/,
        },
        next: [
            'modifier',
            'value',
            'prop',
            'incrementerBefore',
        ]
    },
    dot: {
        types: {
            arrayProp: /^(\?\.)?\[/,
            dot: /^(\?)?\.(?=\s*[a-zA-Z\$\_])/,
        },
        next: [
            'splitter',
            'assignment',
            'expEdge',
            'dot',
            'inlineIf',
            'expEnd'
        ]
    },
    prop: {
        types: {
            prop: /^[a-zA-Z\$\_][a-zA-Z\d\$\_]*/,
        },
        next: [
            'splitter',
            'assignment',
            'expEdge',
            'dot',
            'inlineIf',
            'expEnd'
        ]
    },
    value: {
        types: {
            createObject: /^\{/,
            createArray: /^\[/,
            number: /^(0x[\da-f]+(_[\da-f]+)*|(\d+(_\d+)*(\.\d+(_\d+)*)?|\.\d+(_\d+)*))(e[\+\-]?\d+(_\d+)*)?(n)?(?!\d)/i,
            string: /^"(\d+)"/,
            literal: /^`(\d+)`/,
            regex: /^\/(\d+)\/r(?![\w\$])/,
            boolean: /^(true|false)(?![\w\$])/,
            null: /^null(?![\w\$])/,
            und: /^undefined(?![\w\$])/,
            arrowFunctionSingle: /^(async\s+)?([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*=>\s*({)?/,
            arrowFunction: /^(async\s*)?\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*=>\s*({)?/,
            inlineFunction: /^(async\s+)?function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)?\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
            group: /^\(/,
            NaN: /^NaN(?![\w\$])/,
            Infinity: /^Infinity(?![\w\$])/,
            void: /^void(?![\w\$])\s*/,
            await: /^await(?![\w\$])\s*/,
            new: /^new(?![\w\$])\s*/,
        },
        next: [
            'splitter',
            'expEdge',
            'dot',
            'inlineIf',
            'expEnd'
        ]
    },
    initialize: {
        types: {
            initialize: /^(var|let|const)\s+([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*(=)?/,
            return: /^return(?![\w\$])/,
            throw: /^throw(?![\w\$])\s*/
        },
        next: [
            'modifier',
            'value',
            'prop',
            'incrementerBefore',
            'expEnd'
        ]
    },
    spreadObject: {
        types: {
            spreadObject: /^\.\.\./
        },
        next: [
            'value',
            'prop',
        ]
    },
    spreadArray: {
        types: {
            spreadArray: /^\.\.\./
        },
        next: [
            'value',
            'prop',
        ]
    },
    expEnd: { types: {}, next: [] },
    expFunction: {
        types: {
            function: /^(async\s+)?function(\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\(\s*((\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z\$_][a-zA-Z\d\$_]*)*)?\s*\)\s*{/,
        },
        next: [
            'expEdge',
            'expEnd'
        ]
    },
    expSingle: {
        types: {
            for: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*for\s*\(/,
            do: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*do(?![\w\$])\s*(\{)?/,
            while: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*while\s*\(/,
            loopAction: /^(break|continue)(?![\w\$])\s*([a-zA-Z\$\_][\w\$]*)?/,
            if: /^((([a-zA-Z\$\_][\w\$]*)\s*:)?\s*)if\s*\(/,
            try: /^try\s*{/,
            block: /^{/,
            switch: /^(([a-zA-Z\$\_][\w\$]*)\s*:)?\s*switch\s*\(/,
        },
        next: [
            'expEnd'
        ]
    }
};
let closings = {
    "(": ")",
    "[": "]",
    "{": "}",
    "'": "'",
    '"': '"',
    "`": "`"
};
function testMultiple(str, tests) {
    let found;
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        found = test.exec(str);
        if (found)
            break;
    }
    return found;
}
class CodeString {
    constructor(str) {
        this.ref = { str: "" };
        if (str instanceof CodeString) {
            this.ref = str.ref;
            this.start = str.start;
            this.end = str.end;
        }
        else {
            this.ref.str = str;
            this.start = 0;
            this.end = str.length;
        }
    }
    substring(start, end) {
        if (!this.length)
            return this;
        start = this.start + start;
        if (start < 0) {
            start = 0;
        }
        if (start > this.end) {
            start = this.end;
        }
        end = end === undefined ? this.end : this.start + end;
        if (end < 0) {
            end = 0;
        }
        if (end > this.end) {
            end = this.end;
        }
        const code = new CodeString(this);
        code.start = start;
        code.end = end;
        return code;
    }
    get length() {
        const len = this.end - this.start;
        return len < 0 ? 0 : len;
    }
    char(i) {
        if (this.start === this.end)
            return undefined;
        return this.ref.str[this.start + i];
    }
    toString() {
        return this.ref.str.substring(this.start, this.end);
    }
    trimStart() {
        const found = /^\s+/.exec(this.toString());
        const code = new CodeString(this);
        if (found) {
            code.start += found[0].length;
        }
        return code;
    }
    slice(start, end) {
        if (start < 0) {
            start = this.end - this.start + start;
        }
        if (start < 0) {
            start = 0;
        }
        if (end === undefined) {
            end = this.end - this.start;
        }
        if (end < 0) {
            end = this.end - this.start + end;
        }
        if (end < 0) {
            end = 0;
        }
        return this.substring(start, end);
    }
    trim() {
        const code = this.trimStart();
        const found = /\s+$/.exec(code.toString());
        if (found) {
            code.end -= found[0].length;
        }
        return code;
    }
    valueOf() {
        return this.toString();
    }
}
const emptyString = new CodeString("");
const okFirstChars = /^[\+\-~ !]/;
const aNumber = expectTypes.value.types.number;
const wordReg = /^((if|for|else|while|do|function)(?![\w\$])|[\w\$]+)/;
const semiColon = /^;/;
const insertedSemicolons = new WeakMap();
const quoteCache = new WeakMap();
function restOfExp(constants, part, tests, quote, firstOpening, closingsTests, details = {}) {
    if (!part.length) {
        return part;
    }
    details.words = details.words || [];
    let isStart = true;
    tests = tests || [];
    const hasSemiTest = tests.includes(semiColon);
    if (hasSemiTest) {
        tests = tests.filter((a) => a !== semiColon);
    }
    const insertedSemis = insertedSemicolons.get(part.ref) || [];
    const cache = quoteCache.get(part.ref) || new Map();
    quoteCache.set(part.ref, cache);
    if (quote && cache.has(part.start - 1)) {
        return part.substring(0, cache.get(part.start - 1) - part.start);
    }
    let escape = false;
    let done = false;
    let lastChar = "";
    let isOneLiner = false;
    let i;
    let lastInertedSemi = false;
    for (i = 0; i < part.length && !done; i++) {
        let char = part.char(i);
        if (quote === '"' || quote === "'" || quote === "`") {
            if (quote === "`" && char === "$" && part.char(i + 1) === "{" && !escape) {
                let skip = restOfExp(constants, part.substring(i + 2), [], "{");
                i += skip.length + 2;
            }
            else if (char === quote && !escape) {
                return part.substring(0, i);
            }
            escape = !escape && char === "\\";
        }
        else if (closings[char]) {
            if (!lastInertedSemi && insertedSemis[i + part.start]) {
                lastInertedSemi = true;
                if (hasSemiTest) {
                    break;
                }
                i--;
                lastChar = ';';
                continue;
            }
            if (isOneLiner && char === "{") {
                isOneLiner = false;
            }
            if (char === firstOpening) {
                done = true;
                break;
            }
            else {
                let skip = restOfExp(constants, part.substring(i + 1), [], char);
                cache.set(skip.start - 1, skip.end);
                i += skip.length + 1;
                isStart = false;
                if (closingsTests) {
                    let sub = part.substring(i);
                    let found;
                    if (found = testMultiple(sub.toString(), closingsTests)) {
                        details.regRes = found;
                        done = true;
                    }
                }
            }
        }
        else if (!quote) {
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
            }
            else if (lastChar != char) {
                let found;
                if (char === ';' || (insertedSemis[i + part.start] && !isStart && !lastInertedSemi)) {
                    if (hasSemiTest) {
                        found = [";"];
                    }
                    else if (insertedSemis[i + part.start]) {
                        lastInertedSemi = true;
                        i--;
                        lastChar = ';';
                        continue;
                    }
                    char = sub = ';';
                }
                else {
                    lastInertedSemi = false;
                }
                if (!found) {
                    found = testMultiple(sub, tests);
                }
                if (found) {
                    done = true;
                }
                if (!done && (foundWord = wordReg.exec(sub))) {
                    isOneLiner = true;
                    if (foundWord[0].length > 1) {
                        details.words.push(foundWord[1]);
                        details.lastAnyWord = foundWord[1];
                        if (foundWord[2]) {
                            details.lastWord = foundWord[2];
                        }
                    }
                    if (foundWord[0].length > 2) {
                        i += foundWord[0].length - 2;
                    }
                }
            }
            if (isStart) {
                if (okFirstChars.test(sub)) {
                    done = false;
                }
                else {
                    isStart = false;
                }
            }
            if (done)
                break;
        }
        else if (char === closings[quote]) {
            return part.substring(0, i);
        }
        lastChar = char;
    }
    if (quote) {
        throw new SyntaxError("Unclosed '" + quote + "'");
    }
    if (details) {
        details.oneliner = isOneLiner;
    }
    return part.substring(0, i);
}
restOfExp.next = [
    'splitter',
    'expEnd',
    'inlineIf'
];
const startingExecpted = ['initialize', 'expSingle', 'expFunction', 'value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];
const setLispType = (types, fn) => {
    types.forEach((type) => {
        lispTypes.set(type, fn);
    });
};
const closingsCreate = {
    'createArray': /^\]/,
    'createObject': /^\}/,
    'group': /^\)/,
    'arrayProp': /^\]/,
    'call': /^\)/
};
const typesCreate = {
    'createArray': 12 /* LispType.CreateArray */,
    'createObject': 22 /* LispType.CreateObject */,
    'group': 23 /* LispType.Group */,
    'arrayProp': 19 /* LispType.ArrayProp */,
    'call': 5 /* LispType.Call */,
    'prop': 1 /* LispType.Prop */,
    '?prop': 20 /* LispType.PropOptional */,
    '?call': 21 /* LispType.CallOptional */,
};
setLispType(['createArray', 'createObject', 'group', 'arrayProp', 'call'], (constants, type, part, res, expect, ctx) => {
    let extract = emptyString;
    let arg = [];
    let end = false;
    let i = res[0].length;
    const start = i;
    while (i < part.length && !end) {
        extract = restOfExp(constants, part.substring(i), [
            closingsCreate[type],
            /^,/
        ]);
        i += extract.length;
        if (extract.trim().length) {
            arg.push(extract);
        }
        if (part.char(i) !== ',') {
            end = true;
        }
        else {
            i++;
        }
    }
    const next = ['value', 'modifier', 'prop', 'incrementerBefore', 'expEnd'];
    let l;
    let funcFound;
    switch (type) {
        case 'group':
        case 'arrayProp':
            l = lispifyExpr(constants, part.substring(start, i));
            break;
        case 'call':
        case 'createArray':
            // @TODO: support 'empty' values
            l = arg.map((e) => lispify(constants, e, [...next, 'spreadArray']));
            break;
        case 'createObject':
            l = arg.map((str) => {
                str = str.trimStart();
                let value;
                let key = '';
                funcFound = expectTypes.expFunction.types.function.exec('function ' + str);
                if (funcFound) {
                    key = funcFound[2].trimStart();
                    value = lispify(constants, new CodeString('function ' + str.toString().replace(key, "")));
                }
                else {
                    let extract = restOfExp(constants, str, [/^:/]);
                    key = lispify(constants, extract, [...next, 'spreadObject']);
                    if (key[0] === 1 /* LispType.Prop */) {
                        key = key[2];
                    }
                    value = lispify(constants, str.substring(extract.length + 1));
                }
                return createLisp({
                    op: 6 /* LispType.KeyVal */,
                    a: key,
                    b: value
                });
            });
            break;
    }
    let lisptype = (type === 'arrayProp' ? (res[1] ? 20 /* LispType.PropOptional */ : 1 /* LispType.Prop */) : (type === 'call' ? (res[1] ? 21 /* LispType.CallOptional */ : 5 /* LispType.Call */) : typesCreate[type]));
    ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, createLisp({
        op: lisptype,
        a: ctx.lispTree,
        b: l,
    }));
});
const modifierTypes = {
    'inverse': 64 /* LispType.Inverse */,
    'not': 24 /* LispType.Not */,
    'positive': 59 /* LispType.Positive */,
    'negative': 58 /* LispType.Negative */,
    'typeof': 60 /* LispType.Typeof */,
    'delete': 61 /* LispType.Delete */
};
setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete'], (constants, type, part, res, expect, ctx) => {
    let extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s\.\?\w\$]|\?[^\.])/]);
    ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp({
        op: modifierTypes[type],
        a: ctx.lispTree,
        b: lispify(constants, extract, expectTypes[expect].next),
    }));
});
const incrementTypes = {
    '++$': 25 /* LispType.IncrementBefore */,
    '--$': 27 /* LispType.DecrementBefore */,
    '$++': 26 /* LispType.IncrementAfter */,
    '$--': 28 /* LispType.DecrementAfter */
};
setLispType(['incrementerBefore'], (constants, type, part, res, expect, ctx) => {
    let extract = restOfExp(constants, part.substring(2), [/^[^\s\.\w\$]/]);
    ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, createLisp({
        op: incrementTypes[res[0] + "$"],
        a: lispify(constants, extract, expectTypes[expect].next),
        b: 0 /* LispType.None */
    }));
});
setLispType(['incrementerAfter'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
        op: incrementTypes["$" + res[0]],
        a: ctx.lispTree,
        b: 0 /* LispType.None */
    }));
});
const adderTypes = {
    '&&': 29 /* LispType.And */,
    '||': 30 /* LispType.Or */,
    'instanceof': 62 /* LispType.Instanceof */,
    'in': 63 /* LispType.In */,
    '=': 9 /* LispType.Assign */,
    '-=': 65 /* LispType.SubractEquals */,
    '+=': 66 /* LispType.AddEquals */,
    '/=': 67 /* LispType.DivideEquals */,
    '**=': 68 /* LispType.PowerEquals */,
    '*=': 69 /* LispType.MultiplyEquals */,
    '%=': 70 /* LispType.ModulusEquals */,
    '^=': 71 /* LispType.BitNegateEquals */,
    '&=': 72 /* LispType.BitAndEquals */,
    '|=': 73 /* LispType.BitOrEquals */,
    '>>>=': 74 /* LispType.UnsignedShiftRightEquals */,
    '<<=': 76 /* LispType.ShiftLeftEquals */,
    '>>=': 75 /* LispType.ShiftRightEquals */,
};
setLispType(['assign', 'assignModify', 'boolOp'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: adderTypes[res[0]],
        a: ctx.lispTree,
        b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
    });
});
const opTypes = {
    '&': 77 /* LispType.BitAnd */,
    '|': 78 /* LispType.BitOr */,
    '^': 79 /* LispType.BitNegate */,
    '<<': 80 /* LispType.BitShiftLeft */,
    '>>': 81 /* LispType.BitShiftRight */,
    '>>>': 82 /* LispType.BitUnsignedShiftRight */,
    '<=': 54 /* LispType.SmallerEqualThan */,
    '>=': 55 /* LispType.LargerEqualThan */,
    '<': 56 /* LispType.SmallerThan */,
    '>': 57 /* LispType.LargerThan */,
    '!==': 31 /* LispType.StrictNotEqual */,
    '!=': 53 /* LispType.NotEqual */,
    '===': 32 /* LispType.StrictEqual */,
    '==': 52 /* LispType.Equal */,
    '+': 33 /* LispType.Plus */,
    '-': 47 /* LispType.Minus */,
    '/': 48 /* LispType.Divide */,
    '**': 49 /* LispType.Power */,
    '*': 50 /* LispType.Multiply */,
    '%': 51 /* LispType.Modulus */,
};
setLispType(['opHigh', 'op', 'comparitor', 'bitwise'], (constants, type, part, res, expect, ctx) => {
    const next = [
        expectTypes.inlineIf.types.inlineIf,
        inlineIfElse
    ];
    switch (type) {
        case 'opHigh':
            next.push(expectTypes.splitter.types.opHigh);
        case 'op':
            next.push(expectTypes.splitter.types.op);
        case 'comparitor':
            next.push(expectTypes.splitter.types.comparitor);
        case 'bitwise':
            next.push(expectTypes.splitter.types.bitwise);
            next.push(expectTypes.splitter.types.boolOp);
    }
    let extract = restOfExp(constants, part.substring(res[0].length), next);
    ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp({
        op: opTypes[res[0]],
        a: ctx.lispTree,
        b: lispify(constants, extract, expectTypes[expect].next),
    }));
});
setLispType(['inlineIf'], (constants, type, part, res, expect, ctx) => {
    let found = false;
    let extract = part.substring(0, 0);
    let quoteCount = 1;
    while (!found && extract.length < part.length) {
        extract.end = restOfExp(constants, part.substring(extract.length + 1), [
            expectTypes.inlineIf.types.inlineIf,
            inlineIfElse
        ]).end;
        if (part.char(extract.length) === '?') {
            quoteCount++;
        }
        else {
            quoteCount--;
        }
        if (!quoteCount) {
            found = true;
        }
    }
    extract.start = part.start + 1;
    ctx.lispTree = createLisp({
        op: 15 /* LispType.InlineIf */,
        a: ctx.lispTree,
        b: createLisp({
            op: 16 /* LispType.InlineIfCase */,
            a: lispifyExpr(constants, extract),
            b: lispifyExpr(constants, part.substring(res[0].length + extract.length + 1))
        })
    });
});
function extractIfElse(constants, part) {
    let count = 0;
    let found = part.substring(0, 0);
    let foundElse = emptyString;
    let foundTrue;
    let first = true;
    let elseReg;
    let details = {};
    while ((found = restOfExp(constants, part.substring(found.end - part.start), [elseIf, ifElse, semiColon], undefined, undefined, undefined, details)).length || first) {
        first = false;
        const f = part.substring(found.end - part.start).toString();
        if (f.startsWith("if")) {
            found.end++;
            count++;
        }
        else if (f.startsWith('else')) {
            foundTrue = part.substring(0, found.end - part.start);
            found.end++;
            count--;
            if (!count) {
                found.end--;
            }
        }
        else if (elseReg = /^;?\s*else(?![\w\$])/.exec(f)) {
            foundTrue = part.substring(0, found.end - part.start);
            found.end += elseReg[0].length - 1;
            count--;
            if (!count) {
                found.end -= elseReg[0].length - 1;
            }
        }
        else {
            foundTrue = foundElse.length ? foundTrue : part.substring(0, found.end - part.start);
            break;
        }
        if (!count) {
            let ie = extractIfElse(constants, part.substring(found.end - part.start + (/^;?\s*else(?![\w\$])/.exec(f)?.[0].length)));
            foundElse = ie.all;
            break;
        }
        details = {};
    }
    foundTrue = foundTrue || part.substring(0, found.end - part.start);
    return { all: part.substring(0, Math.max(foundTrue.end, foundElse.end) - part.start), true: foundTrue, false: foundElse };
}
setLispType(['if'], (constants, type, part, res, expect, ctx) => {
    let condition = restOfExp(constants, part.substring(res[0].length), [], "(");
    const ie = extractIfElse(constants, part.substring(res[1].length));
    /^\s*\{/.exec(part.substring(res[0].length + condition.length + 1).toString());
    const startTrue = res[0].length - res[1].length + condition.length + 1;
    let trueBlock = ie.true.substring(startTrue);
    let elseBlock = ie.false;
    condition = condition.trim();
    trueBlock = trueBlock.trim();
    elseBlock = elseBlock.trim();
    if (trueBlock.char(0) === "{")
        trueBlock = trueBlock.slice(1, -1);
    if (elseBlock.char(0) === "{")
        elseBlock = elseBlock.slice(1, -1);
    ctx.lispTree = createLisp({
        op: 13 /* LispType.If */,
        a: lispifyExpr(constants, condition),
        b: createLisp({
            op: 14 /* LispType.IfCase */,
            a: lispifyBlock(trueBlock, constants),
            b: lispifyBlock(elseBlock, constants)
        })
    });
});
setLispType(['switch'], (constants, type, part, res, expect, ctx) => {
    const test = restOfExp(constants, part.substring(res[0].length), [], "(");
    let start = part.toString().indexOf("{", res[0].length + test.length + 1);
    if (start === -1)
        throw new SyntaxError("Invalid switch");
    let statement = insertSemicolons(constants, restOfExp(constants, part.substring(start + 1), [], "{"));
    let caseFound;
    const caseTest = /^\s*(case\s|default)\s*/;
    let cases = [];
    let defaultFound = false;
    while (caseFound = caseTest.exec(statement.toString())) {
        if (caseFound[1] === 'default') {
            if (defaultFound)
                throw new SyntaxError("Only one default switch case allowed");
            defaultFound = true;
        }
        let cond = restOfExp(constants, statement.substring(caseFound[0].length), [/^:/]);
        let found = emptyString;
        let i = start = caseFound[0].length + cond.length + 1;
        let bracketFound = /^\s*\{/.exec(statement.substring(i).toString());
        let exprs = [];
        if (bracketFound) {
            i += bracketFound[0].length;
            found = restOfExp(constants, statement.substring(i), [], "{");
            i += found.length + 1;
            exprs = lispifyBlock(found, constants);
        }
        else {
            let notEmpty = restOfExp(constants, statement.substring(i), [caseTest]);
            if (!notEmpty.trim().length) {
                exprs = [];
                i += notEmpty.length;
            }
            else {
                while ((found = restOfExp(constants, statement.substring(i), [semiColon])).length) {
                    i += found.length + (statement.char(i + found.length) === ';' ? 1 : 0);
                    if (caseTest.test(statement.substring(i).toString())) {
                        break;
                    }
                }
                exprs = lispifyBlock(statement.substring(start, found.end - statement.start), constants);
            }
        }
        statement = statement.substring(i);
        cases.push(createLisp({
            op: 41 /* LispType.SwitchCase */,
            a: caseFound[1] === "default" ? undefined : lispifyExpr(constants, cond),
            b: exprs
        }));
    }
    ctx.lispTree = createLisp({
        op: 40 /* LispType.Switch */,
        a: lispifyExpr(constants, test),
        b: cases
    });
});
setLispType(['dot', 'prop'], (constants, type, part, res, expect, ctx) => {
    let prop = res[0];
    let index = res[0].length;
    let op = 'prop';
    if (type === 'dot') {
        if (res[1]) {
            op = '?prop';
        }
        let matches = part.substring(res[0].length).toString().match(expectTypes.prop.types.prop);
        if (matches && matches.length) {
            prop = matches[0];
            index = prop.length + res[0].length;
        }
        else {
            throw new SyntaxError('Hanging  dot');
        }
    }
    ctx.lispTree = lispify(constants, part.substring(index), expectTypes[expect].next, createLisp({
        op: typesCreate[op],
        a: ctx.lispTree,
        b: prop
    }));
});
setLispType(['spreadArray', 'spreadObject'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: type === 'spreadArray' ? 18 /* LispType.SpreadArray */ : 17 /* LispType.SpreadObject */,
        a: 0 /* LispType.None */,
        b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
    });
});
setLispType(['return', 'throw'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: type === 'return' ? 8 /* LispType.Return */ : 46 /* LispType.Throw */,
        a: 0 /* LispType.None */,
        b: lispifyExpr(constants, part.substring(res[0].length))
    });
});
setLispType(['number', 'boolean', 'null', 'und', 'NaN', 'Infinity'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
        op: type === "number" ? res[10] ? 83 /* LispType.BigInt */ : 7 /* LispType.Number */ : 35 /* LispType.GlobalSymbol */,
        a: 0 /* LispType.None */,
        b: res[10] ? res[1] : res[0]
    }));
});
setLispType(['string', 'literal', 'regex'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
        op: type === 'string' ? 2 /* LispType.StringIndex */ : type === 'literal' ? 84 /* LispType.LiteralIndex */ : 85 /* LispType.RegexIndex */,
        a: 0 /* LispType.None */,
        b: res[1],
    }));
});
setLispType(['initialize'], (constants, type, part, res, expect, ctx) => {
    const lt = res[1] === 'var' ? 34 /* LispType.Var */ : res[1] === 'let' ? 3 /* LispType.Let */ : 4 /* LispType.Const */;
    if (!res[3]) {
        ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
            op: lt,
            a: res[2],
            b: 0 /* LispType.None */
        }));
    }
    else {
        ctx.lispTree = createLisp({
            op: lt,
            a: res[2],
            b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next)
        });
    }
});
setLispType(['function', 'inlineFunction', 'arrowFunction', 'arrowFunctionSingle'], (constants, type, part, res, expect, ctx) => {
    const isArrow = type !== 'function' && type !== 'inlineFunction';
    const isReturn = isArrow && !res[res.length - 1];
    const argPos = isArrow ? 2 : 3;
    const isAsync = res[1] ? 88 /* LispType.True */ : 0 /* LispType.None */;
    const args = res[argPos] ? res[argPos].replace(/\s+/g, "").split(/,/g) : [];
    if (!isArrow) {
        args.unshift((res[2] || "").trimStart());
    }
    let ended = false;
    args.forEach((arg) => {
        if (ended)
            throw new SyntaxError('Rest parameter must be last formal parameter');
        if (arg.startsWith('...'))
            ended = true;
    });
    args.unshift(isAsync);
    const f = restOfExp(constants, part.substring(res[0].length), !isReturn ? [/^}/] : [/^[,\)\}\]]/, semiColon]);
    const func = (isReturn ? 'return ' + f : f.toString());
    ctx.lispTree = lispify(constants, part.substring(res[0].length + func.length + 1), expectTypes[expect].next, createLisp({
        op: isArrow ? 11 /* LispType.ArrowFunction */ : type === 'function' ? 37 /* LispType.Function */ : 10 /* LispType.InlineFunction */,
        a: args,
        b: constants.eager ? lispifyFunction(new CodeString(func), constants) : func
    }));
});
const iteratorRegex = /^((let|var|const)\s+)?\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s+(in|of)(?![\w\$])/;
setLispType(['for', 'do', 'while'], (constants, type, part, res, expect, ctx) => {
    let i = 0;
    let startStep = 88 /* LispType.True */;
    let startInternal = [];
    let getIterator;
    let beforeStep = 0 /* LispType.None */;
    let checkFirst = 88 /* LispType.True */;
    let condition;
    let step = 88 /* LispType.True */;
    let body;
    switch (type) {
        case 'while':
            i = part.toString().indexOf("(") + 1;
            let extract = restOfExp(constants, part.substring(i), [], "(");
            condition = lispifyReturnExpr(constants, extract);
            body = restOfExp(constants, part.substring(i + extract.length + 1)).trim();
            if (body[0] === "{")
                body = body.slice(1, -1);
            break;
        case 'for':
            i = part.toString().indexOf("(") + 1;
            let args = [];
            let extract2 = emptyString;
            for (let k = 0; k < 3; k++) {
                extract2 = restOfExp(constants, part.substring(i), [/^[;\)]/]);
                args.push(extract2.trim());
                i += extract2.length + 1;
                if (part.char(i - 1) === ")")
                    break;
            }
            let iterator;
            if (args.length === 1 && (iterator = iteratorRegex.exec(args[0].toString()))) {
                if (iterator[4] === 'of') {
                    getIterator = lispifyReturnExpr(constants, args[0].substring(iterator[0].length)),
                        startInternal = [
                            ofStart2,
                            ofStart3
                        ];
                    condition = ofCondition;
                    step = ofStep;
                    beforeStep = lispify(constants, new CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$next.value'), ['initialize']);
                }
                else {
                    getIterator = lispifyReturnExpr(constants, args[0].substring(iterator[0].length)),
                        startInternal = [
                            inStart2,
                            inStart3
                        ];
                    step = inStep;
                    condition = inCondition;
                    beforeStep = lispify(constants, new CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$keys[$$keyIndex]'), ['initialize']);
                }
            }
            else if (args.length === 3) {
                startStep = lispifyExpr(constants, args.shift(), startingExecpted);
                condition = lispifyReturnExpr(constants, args.shift());
                step = lispifyExpr(constants, args.shift());
            }
            else {
                throw new SyntaxError("Invalid for loop definition");
            }
            body = restOfExp(constants, part.substring(i)).trim();
            if (body[0] === "{")
                body = body.slice(1, -1);
            break;
        case 'do':
            checkFirst = 0 /* LispType.None */;
            const isBlock = !!res[3];
            body = restOfExp(constants, part.substring(res[0].length), isBlock ? [/^\}/] : [semiColon]);
            condition = lispifyReturnExpr(constants, restOfExp(constants, part.substring(part.toString().indexOf("(", res[0].length + body.length) + 1), [], "("));
            break;
    }
    const a = [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep];
    ctx.lispTree = createLisp({
        op: 38 /* LispType.Loop */,
        a,
        b: lispifyBlock(body, constants)
    });
});
setLispType(['block'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: 42 /* LispType.Block */,
        a: lispifyBlock(restOfExp(constants, part.substring(1), [], "{"), constants),
        b: 0 /* LispType.None */
    });
});
setLispType(['loopAction'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: 86 /* LispType.LoopAction */,
        a: res[1],
        b: 0 /* LispType.None */
    });
});
const catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z\$_][a-zA-Z\d\$_]*)\s*\))?|finally)\s*\{/;
setLispType(['try'], (constants, type, part, res, expect, ctx) => {
    const body = restOfExp(constants, part.substring(res[0].length), [], "{");
    let catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
    let finallyBody;
    let exception = "";
    let catchBody;
    let offset = 0;
    if (catchRes[1].startsWith('catch')) {
        catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
        exception = catchRes[2];
        catchBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
        offset = res[0].length + body.length + 1 + catchRes[0].length + catchBody.length + 1;
        if ((catchRes = catchReg.exec(part.substring(offset).toString())) && catchRes[1].startsWith('finally')) {
            finallyBody = restOfExp(constants, part.substring(offset + catchRes[0].length), [], "{");
        }
    }
    else {
        finallyBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], "{");
    }
    const b = [
        exception,
        lispifyBlock(insertSemicolons(constants, catchBody || emptyString), constants),
        lispifyBlock(insertSemicolons(constants, finallyBody || emptyString), constants),
    ];
    ctx.lispTree = createLisp({
        op: 39 /* LispType.Try */,
        a: lispifyBlock(insertSemicolons(constants, body), constants),
        b
    });
});
setLispType(['void', 'await'], (constants, type, part, res, expect, ctx) => {
    const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s\.\?\w\$]|\?[^\.])/]);
    ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp({
        op: type === 'void' ? 87 /* LispType.Void */ : 44 /* LispType.Await */,
        a: lispify(constants, extract),
        b: 0 /* LispType.None */
    }));
});
setLispType(['new'], (constants, type, part, res, expect, ctx) => {
    let i = res[0].length;
    const obj = restOfExp(constants, part.substring(i), [], undefined, "(");
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
        op: 45 /* LispType.New */,
        a: lispify(constants, obj, expectTypes.initialize.next),
        b: args.map((arg) => lispify(constants, arg, expectTypes.initialize.next)),
    }));
});
const ofStart2 = lispify(undefined, new CodeString('let $$iterator = $$obj[Symbol.iterator]()'), ['initialize']);
const ofStart3 = lispify(undefined, new CodeString('let $$next = $$iterator.next()'), ['initialize']);
const ofCondition = lispify(undefined, new CodeString('return !$$next.done'), ['initialize']);
const ofStep = lispify(undefined, new CodeString('$$next = $$iterator.next()'));
const inStart2 = lispify(undefined, new CodeString('let $$keys = Object.keys($$obj)'), ['initialize']);
const inStart3 = lispify(undefined, new CodeString('let $$keyIndex = 0'), ['initialize']);
const inStep = lispify(undefined, new CodeString('$$keyIndex++'));
const inCondition = lispify(undefined, new CodeString('return $$keyIndex < $$keys.length'), ['initialize']);
var lastType;
function lispify(constants, part, expected, lispTree, topLevel = false) {
    lispTree = lispTree || [0 /* LispType.None */, 0 /* LispType.None */, 0 /* LispType.None */];
    expected = expected || expectTypes.initialize.next;
    if (part === undefined)
        return lispTree;
    part = part.trimStart();
    const str = part.toString();
    if (!part.length && !expected.includes('expEnd')) {
        throw new SyntaxError("Unexpected end of expression");
    }
    if (!part.length)
        return lispTree;
    let ctx = { lispTree: lispTree };
    let res;
    for (let expect of expected) {
        if (expect === 'expEnd') {
            continue;
        }
        for (let type in expectTypes[expect].types) {
            if (type === 'expEnd') {
                continue;
            }
            if (res = expectTypes[expect].types[type].exec(str)) {
                lastType = type;
                try {
                    lispTypes.get(type)(constants, type, part, res, expect, ctx);
                }
                catch (e) {
                    if (topLevel && e instanceof SyntaxError) {
                        throw new ParseError(e.message, str);
                    }
                    throw e;
                }
                break;
            }
        }
        if (res)
            break;
    }
    if (!res && part.length) {
        `Unexpected token after ${lastType}: ${part.char(0)}`;
        if (topLevel) {
            throw new ParseError(`Unexpected token after ${lastType}: ${part.char(0)}`, str);
        }
        throw new SyntaxError(`Unexpected token after ${lastType}: ${part.char(0)}`);
    }
    return ctx.lispTree;
}
const startingExpectedWithoutSingle = startingExecpted.filter((r) => r !== 'expSingle');
function lispifyExpr(constants, str, expected) {
    if (!str.trimStart().length)
        return undefined;
    let subExpressions = [];
    let sub;
    let pos = 0;
    expected = expected || expectTypes.initialize.next;
    if (expected.includes('expSingle')) {
        if (testMultiple(str.toString(), Object.values(expectTypes.expSingle.types))) {
            return lispify(constants, str, ['expSingle'], undefined, true);
        }
    }
    if (expected === startingExecpted)
        expected = startingExpectedWithoutSingle;
    while ((sub = restOfExp(constants, str.substring(pos), [/^,/])).length) {
        subExpressions.push(sub.trimStart());
        pos += sub.length + 1;
    }
    if (subExpressions.length === 1) {
        return lispify(constants, str, expected, undefined, true);
    }
    if (expected.includes('initialize')) {
        let defined = expectTypes.initialize.types.initialize.exec(subExpressions[0].toString());
        if (defined) {
            return createLisp({
                op: 42 /* LispType.Block */,
                a: subExpressions.map((str, i) => lispify(constants, i ? new CodeString(defined[1] + ' ' + str) : str, ['initialize'], undefined, true)),
                b: 0 /* LispType.None */
            });
        }
        else if (expectTypes.initialize.types.return.exec(subExpressions[0].toString())) {
            return lispify(constants, str, expected, undefined, true);
        }
    }
    const exprs = subExpressions.map((str, i) => lispify(constants, str, expected, undefined, true));
    return createLisp({ op: 43 /* LispType.Expression */, a: exprs, b: 0 /* LispType.None */ });
}
function lispifyReturnExpr(constants, str) {
    return createLisp({ op: 8 /* LispType.Return */, a: 0 /* LispType.None */, b: lispifyExpr(constants, str) });
}
function lispifyBlock(str, constants, expression = false) {
    str = insertSemicolons(constants, str);
    if (!str.trim().length)
        return [];
    let parts = [];
    let part;
    let pos = 0;
    let start = 0;
    let details = {};
    let skipped = false;
    let isInserted = false;
    while ((part = restOfExp(constants, str.substring(pos), [semiColon], undefined, undefined, undefined, details)).length) {
        isInserted = str.char(pos + part.length) && str.char(pos + part.length) !== ';';
        pos += part.length + (isInserted ? 0 : 1);
        if (/^\s*else(?![\w\$])/.test(str.substring(pos).toString())) {
            skipped = true;
        }
        else if (details.words.includes('do') && /^\s*while(?![\w\$])/.test(str.substring(pos).toString())) {
            skipped = true;
        }
        else {
            skipped = false;
            parts.push(str.substring(start, pos - (isInserted ? 0 : 1)));
            start = pos;
        }
        details = {};
        if (expression)
            break;
    }
    if (skipped) {
        parts.push(str.substring(start, pos - (isInserted ? 0 : 1)));
    }
    return parts.map((str) => str.trimStart()).filter((str) => str.length).map((str, j) => {
        return lispifyExpr(constants, str.trimStart(), startingExecpted);
    });
}
function lispifyFunction(str, constants, expression = false) {
    if (!str.trim().length)
        return [];
    const tree = lispifyBlock(str, constants, expression);
    let hoisted = [];
    hoist(tree, hoisted);
    return hoisted.concat(tree);
}
function isLisp(item) {
    return Array.isArray(item) && typeof item[0] === 'number' && item[0] !== 0 /* LispType.None */ && item[0] !== 88 /* LispType.True */;
}
function hoist(item, res) {
    if (isLisp(item)) {
        const [op, a, b] = item;
        if (op === 39 /* LispType.Try */ || op === 13 /* LispType.If */ || op === 38 /* LispType.Loop */ || op === 40 /* LispType.Switch */) {
            hoist(a, res);
            hoist(b, res);
        }
        else if (op === 34 /* LispType.Var */) {
            res.push(createLisp({ op: 34 /* LispType.Var */, a: a, b: 0 /* LispType.None */ }));
        }
        else if (op === 37 /* LispType.Function */ && a[1]) {
            res.push(item);
            return true;
        }
    }
    else if (Array.isArray(item)) {
        const rep = [];
        for (let it of item) {
            if (!hoist(it, res)) {
                rep.push(it);
            }
        }
        if (rep.length !== item.length) {
            item.length = 0;
            item.push(...rep);
        }
    }
    return false;
}
const closingsNoInsertion = /^(\})\s*(catch|finally|else|while|instanceof)(?![\w\$])/;
//  \w|)|] \n \w = 2                                  // \} \w|\{ = 5 
const colonsRegex = /^((([\w\$\]\)\"\'\`]|\+\+|\-\-)\s*\r?\n\s*([\w\$\+\-\!~]))|(\}\s*[\w\$\!~\+\-\{\(\"\'\`]))/;
// if () \w \n; \w              == \w \n \w    | last === if             a
// if () { }; \w                == \} ^else    | last === if             b
// if () \w \n; else \n \w \n;  == \w \n \w    | last === else           a
// if () {} else {}; \w         == \} \w       | last === else           b
// while () \n \w \n; \w        == \w \n \w    | last === while          a
// while () { }; \w             == \} \w       | last === while          b
// do \w \n; while (); \w       == \w \n while | last === do             a
// do { } while (); \w          == \) \w       | last === while          c
// try {} catch () {}; \w       == \} \w       | last === catch|finally  b
// \w \n; \w                    == \w \n \w    | last === none           a
// cb() \n \w                   == \) \n \w    | last === none           a
// obj[a] \n \w                 == \] \n \w    | last === none           a
// {} {}                        == \} \{       | last === none           b
function insertSemicolons(constants, str) {
    let rest = str;
    let sub = emptyString;
    let details = {};
    const inserted = insertedSemicolons.get(str.ref) || new Array(str.ref.str.length);
    while ((sub = restOfExp(constants, rest, [], undefined, undefined, [colonsRegex], details)).length) {
        let valid = false;
        let part = sub;
        let edge = sub.length;
        if (details.regRes) {
            valid = true;
            const [, , a, , , b] = details.regRes;
            edge = details.regRes[3] === "++" || details.regRes[3] === "--" ? sub.length + 1 : sub.length;
            part = rest.substring(0, edge);
            if (b) {
                let res = closingsNoInsertion.exec(rest.substring(sub.length - 1).toString());
                if (res) {
                    if (res[2] === 'while') {
                        valid = details.lastWord !== 'do';
                    }
                    else {
                        valid = false;
                    }
                }
                else if (details.lastWord === 'function' && details.regRes[5][0] === "}" && details.regRes[5].slice(-1) === '(') {
                    valid = false;
                }
            }
            else if (a) {
                if (details.lastWord === 'if' || details.lastWord === 'while' || details.lastWord === 'for' || details.lastWord === 'else') {
                    valid = false;
                }
            }
        }
        if (valid) {
            inserted[part.end] = true;
        }
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
        done = (str[i] === '/' && !escape);
        escape = str[i] === '\\' && !escape;
        cancel = str[i] === '\n';
        i++;
    }
    let after = str.substring(i);
    cancel = (cancel || !done) || /^\s*\d/.test(after);
    if (cancel)
        return null;
    let flags = /^[a-z]*/.exec(after);
    if (/^\s+[\w\$]/.test(str.substring(i + flags[0].length))) {
        return null;
    }
    return {
        regex: str.substring(1, i - 1),
        flags: (flags && flags[0]) || "",
        length: i + ((flags && flags[0].length) || 0)
    };
}
const notDivide = /(typeof|delete|instanceof|return|in|of|throw|new|void|do|if)$/;
const possibleDivide = /^([\w\$\]\)]|\+\+|\-\-)[\s\/]/;
function extractConstants(constants, str, currentEnclosure = "") {
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
    let isPossibleDivide;
    for (var i = 0; i < str.length; i++) {
        char = str[i];
        if (comment) {
            if (char === comment) {
                if (comment === "*" && str[i + 1] === "/") {
                    comment = "";
                    i++;
                }
                else if (comment === "\n") {
                    comment = "";
                }
            }
        }
        else {
            if (escape) {
                escape = false;
                extract.push(char);
                continue;
            }
            if (quote) {
                if (quote === "`" && char === "$" && str[i + 1] === "{") {
                    let skip = extractConstants(constants, str.substring(i + 2), "{");
                    currJs.push(skip.str);
                    extract.push('${', currJs.length - 1, `}`);
                    i += skip.length + 2;
                }
                else if (quote === char) {
                    if (quote === '`') {
                        const li = createLisp({
                            op: 36 /* LispType.Literal */,
                            a: unraw(extract.join("")),
                            b: [],
                        });
                        li.tempJsStrings = currJs;
                        constants.literals.push(li);
                        strRes.push(`\``, constants.literals.length - 1, `\``);
                    }
                    else {
                        constants.strings.push(unraw(extract.join("")));
                        strRes.push(`"`, constants.strings.length - 1, `"`);
                    }
                    quote = null;
                    extract = [];
                }
                else {
                    extract.push(char);
                }
            }
            else {
                if ((char === "'" || char === '"' || char === '`')) {
                    currJs = [];
                    quote = char;
                }
                else if (closings[currentEnclosure] === char && !enclosures.length) {
                    return { str: strRes.join(""), length: i };
                }
                else if (closings[char]) {
                    enclosures.push(char);
                    strRes.push(char);
                }
                else if (closings[enclosures[enclosures.length - 1]] === char) {
                    enclosures.pop();
                    strRes.push(char);
                }
                else if (char === "/" && (str[i + 1] === "*" || str[i + 1] === "/")) {
                    comment = str[i + 1] === "*" ? "*" : "\n";
                    commentStart = i;
                }
                else if (char === '/' && !isPossibleDivide && (regexFound = checkRegex(str.substring(i)))) {
                    constants.regexes.push(regexFound);
                    strRes.push(`/`, constants.regexes.length - 1, `/r`);
                    i += regexFound.length - 1;
                }
                else {
                    strRes.push(char);
                }
                if (!isPossibleDivide || !space.test(char)) {
                    if (isPossibleDivide = possibleDivide.exec(str.substring(i))) {
                        if (notDivide.test(str.substring(0, i + isPossibleDivide[1].length))) {
                            isPossibleDivide = null;
                        }
                    }
                }
            }
            escape = quote && char === "\\";
        }
    }
    if (comment) {
        if (comment === "*") {
            throw new SyntaxError(`Unclosed comment '/*': ${str.substring(commentStart)}`);
        }
    }
    return { str: strRes.join(""), length: i };
}
function parse(code, eager = false, expression = false) {
    if (typeof code !== 'string')
        throw new ParseError(`Cannot parse ${code}`, code);
    let str = ' ' + code;
    const constants = { strings: [], literals: [], regexes: [], eager };
    str = extractConstants(constants, str).str;
    for (let l of constants.literals) {
        l[2] = l.tempJsStrings.map((js) => lispifyExpr(constants, new CodeString(js)));
        delete l.tempJsStrings;
    }
    return { tree: lispifyFunction(new CodeString(str), constants, expression), constants };
}

class ExecReturn {
    constructor(auditReport, result, returned, breakLoop = false, continueLoop = false) {
        this.auditReport = auditReport;
        this.result = result;
        this.returned = returned;
        this.breakLoop = breakLoop;
        this.continueLoop = continueLoop;
    }
}
class Prop {
    constructor(context, prop, isConst = false, isGlobal = false, isVariable = false) {
        this.context = context;
        this.prop = prop;
        this.isConst = isConst;
        this.isGlobal = isGlobal;
        this.isVariable = isVariable;
    }
    get(context) {
        if (this.context === undefined)
            throw new ReferenceError(`${this.prop} is not defined`);
        context.getSubscriptions.forEach((cb) => cb(this.context, this.prop));
        return this.context[this.prop];
    }
}
const optional = {};
const reservedWords = new Set([
    'instanceof',
    'typeof',
    'return',
    'try',
    'catch',
    'if',
    'finally',
    'else',
    'in',
    'of',
    'var',
    'let',
    'const',
    'for',
    'delete',
    'false',
    'true',
    'while',
    'do',
    'break',
    'continue',
    'new',
    'function',
    'async',
    'await',
    'switch',
    'case'
]);
var VarType;
(function (VarType) {
    VarType["let"] = "let";
    VarType["const"] = "const";
    VarType["var"] = "var";
})(VarType || (VarType = {}));
function keysOnly(obj) {
    const ret = Object.assign({}, obj);
    for (let key in ret) {
        ret[key] = true;
    }
    return ret;
}
class Scope {
    constructor(parent, vars = {}, functionThis) {
        this.const = {};
        this.let = {};
        this.var = {};
        const isFuncScope = functionThis !== undefined || parent === null;
        this.parent = parent;
        this.allVars = vars;
        this.let = isFuncScope ? this.let : keysOnly(vars);
        this.var = isFuncScope ? keysOnly(vars) : this.var;
        this.globals = parent === null ? keysOnly(vars) : {};
        this.functionThis = functionThis;
    }
    get(key, functionScope = false) {
        if (key === 'this' && this.functionThis !== undefined) {
            return new Prop({ this: this.functionThis }, key, true, false, true);
        }
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        if (this.parent === null || !functionScope || this.functionThis !== undefined) {
            if (this.globals.hasOwnProperty(key)) {
                return new Prop(this.functionThis, key, false, true, true);
            }
            if (key in this.allVars && (!(key in {}) || this.allVars.hasOwnProperty(key))) {
                return new Prop(this.allVars, key, this.const.hasOwnProperty(key), this.globals.hasOwnProperty(key), true);
            }
            if (this.parent === null) {
                return new Prop(undefined, key);
            }
        }
        return this.parent.get(key, functionScope);
    }
    set(key, val) {
        if (key === 'this')
            throw new SyntaxError('"this" cannot be assigned');
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        let prop = this.get(key);
        if (prop.context === undefined) {
            throw new ReferenceError(`Variable '${key}' was not declared.`);
        }
        if (prop.isConst) {
            throw new TypeError(`Cannot assign to const variable '${key}'`);
        }
        if (prop.isGlobal) {
            throw new SandboxError(`Cannot override global variable '${key}'`);
        }
        prop.context[prop.prop] = val;
        return prop;
    }
    declare(key, type = null, value = undefined, isGlobal = false) {
        if (key === 'this')
            throw new SyntaxError('"this" cannot be declared');
        if (reservedWords.has(key))
            throw new SyntaxError("Unexepected token '" + key + "'");
        if (type === 'var' && this.functionThis === undefined && this.parent !== null) {
            return this.parent.declare(key, type, value, isGlobal);
        }
        else if ((this[type].hasOwnProperty(key) && type !== 'const' && !this.globals.hasOwnProperty(key)) || !(key in this.allVars)) {
            if (isGlobal) {
                this.globals[key] = true;
            }
            this[type][key] = true;
            this.allVars[key] = value;
        }
        else {
            throw new SandboxError(`Identifier '${key}' has already been declared`);
        }
        return new Prop(this.allVars, key, this.const.hasOwnProperty(key), isGlobal);
    }
}
class FunctionScope {
}
class LocalScope {
}
class SandboxError extends Error {
}
let currentTicks;
function sandboxFunction(context, ticks) {
    return SandboxFunction;
    function SandboxFunction(...params) {
        let code = params.pop() || "";
        let parsed = parse(code);
        return createFunction(params, parsed.tree, ticks || currentTicks, {
            ...context,
            constants: parsed.constants,
            tree: parsed.tree
        }, undefined, 'anonymous');
    }
}
function generateArgs(argNames, args) {
    const vars = {};
    argNames.forEach((arg, i) => {
        if (arg.startsWith('...')) {
            vars[arg.substring(3)] = args.slice(i);
        }
        else {
            vars[arg] = args[i];
        }
    });
    return vars;
}
const sandboxedFunctions = new WeakSet();
function createFunction(argNames, parsed, ticks, context, scope, name) {
    if (context.ctx.options.forbidFunctionCreation) {
        throw new SandboxError("Function creation is forbidden");
    }
    let func;
    if (name === undefined) {
        func = (...args) => {
            const vars = generateArgs(argNames, args);
            const res = executeTree(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars)]);
            return res.result;
        };
    }
    else {
        func = function sandboxedObject(...args) {
            const vars = generateArgs(argNames, args);
            const res = executeTree(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars, this)]);
            return res.result;
        };
    }
    context.registerSandboxFunction(func);
    sandboxedFunctions.add(func);
    return func;
}
function createFunctionAsync(argNames, parsed, ticks, context, scope, name) {
    if (context.ctx.options.forbidFunctionCreation) {
        throw new SandboxError("Function creation is forbidden");
    }
    if (!context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
        throw new SandboxError("Async/await not permitted");
    }
    let func;
    if (name === undefined) {
        func = async (...args) => {
            const vars = generateArgs(argNames, args);
            const res = await executeTreeAsync(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars)]);
            return res.result;
        };
    }
    else {
        func = async function sandboxedObject(...args) {
            const vars = generateArgs(argNames, args);
            const res = await executeTreeAsync(ticks, context, parsed, scope === undefined ? [] : [new Scope(scope, vars, this)]);
            return res.result;
        };
    }
    context.registerSandboxFunction(func);
    sandboxedFunctions.add(func);
    return func;
}
function sandboxedEval(func) {
    return sandboxEval;
    function sandboxEval(code) {
        return func(code)();
    }
}
function sandboxedSetTimeout(func) {
    return function sandboxSetTimeout(handler, ...args) {
        if (typeof handler !== 'string')
            return setTimeout(handler, ...args);
        return setTimeout(func(handler), ...args);
    };
}
function sandboxedSetInterval(func) {
    return function sandboxSetInterval(handler, ...args) {
        if (typeof handler !== 'string')
            return setInterval(handler, ...args);
        return setInterval(func(handler), ...args);
    };
}
function assignCheck(obj, context, op = 'assign') {
    if (obj.context === undefined) {
        throw new ReferenceError(`Cannot ${op} value to undefined.`);
    }
    if (typeof obj.context !== 'object' && typeof obj.context !== 'function') {
        throw new SyntaxError(`Cannot ${op} value to a primitive.`);
    }
    if (obj.isConst) {
        throw new TypeError(`Cannot set value to const variable '${obj.prop}'`);
    }
    if (obj.isGlobal) {
        throw new SandboxError(`Cannot ${op} property '${obj.prop}' of a global object`);
    }
    if (typeof obj.context[obj.prop] === 'function' && !obj.context.hasOwnProperty(obj.prop)) {
        throw new SandboxError(`Override prototype property '${obj.prop}' not allowed`);
    }
    if (op === "delete") {
        if (obj.context.hasOwnProperty(obj.prop)) {
            context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({ type: "delete", prop: obj.prop }));
            context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({ type: "delete", prop: obj.prop }));
        }
    }
    else if (obj.context.hasOwnProperty(obj.prop)) {
        context.setSubscriptions.get(obj.context)?.get(obj.prop)?.forEach((cb) => cb({
            type: "replace"
        }));
        context.setSubscriptionsGlobal.get(obj.context)?.get(obj.prop)?.forEach((cb) => cb({
            type: "replace"
        }));
    }
    else {
        context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb({ type: "create", prop: obj.prop }));
        context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb({ type: "create", prop: obj.prop }));
    }
}
const arrayChange = new Set([
    [].push,
    [].pop,
    [].shift,
    [].unshift,
    [].splice,
    [].reverse,
    [].sort,
    [].copyWithin
]);
class KeyVal {
    constructor(key, val) {
        this.key = key;
        this.val = val;
    }
}
class SpreadObject {
    constructor(item) {
        this.item = item;
    }
}
class SpreadArray {
    constructor(item) {
        this.item = item;
    }
}
class If {
    constructor(t, f) {
        this.t = t;
        this.f = f;
    }
}
const literalRegex = /(\$\$)*(\$)?\${(\d+)}/g;
const ops = new Map();
function addOps(type, cb) {
    ops.set(type, cb);
}
addOps(1 /* LispType.Prop */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (a === null) {
        throw new TypeError(`Cannot get property ${b} of null`);
    }
    const type = typeof a;
    if (type === 'undefined' && obj === undefined) {
        let prop = scope.get(b);
        if (prop.context === context.ctx.sandboxGlobal) {
            if (context.ctx.options.audit) {
                context.ctx.auditReport.globalsAccess.add(b);
            }
            const rep = context.ctx.globalsWhitelist.has(context.ctx.sandboxGlobal[b]) ? context.evals.get(context.ctx.sandboxGlobal[b]) : undefined;
            if (rep) {
                done(undefined, rep);
                return;
            }
        }
        if (prop.context && prop.context[b] === globalThis) {
            done(undefined, context.ctx.globalScope.get('this'));
            return;
        }
        done(undefined, prop);
        return;
    }
    else if (a === undefined) {
        throw new SandboxError("Cannot get property '" + b + "' of undefined");
    }
    if (type !== 'object') {
        if (type === 'number') {
            a = new Number(a);
        }
        else if (type === 'string') {
            a = new String(a);
        }
        else if (type === 'boolean') {
            a = new Boolean(a);
        }
    }
    else if (typeof a.hasOwnProperty === 'undefined') {
        done(undefined, new Prop(undefined, b));
        return;
    }
    const isFunction = type === 'function';
    let prototypeAccess = isFunction || !(a.hasOwnProperty(b) || typeof b === 'number');
    if (context.ctx.options.audit && prototypeAccess) {
        if (typeof b === 'string') {
            let prot = Object.getPrototypeOf(a);
            do {
                if (prot.hasOwnProperty(b)) {
                    if (!context.ctx.auditReport.prototypeAccess[prot.constructor.name]) {
                        context.ctx.auditReport.prototypeAccess[prot.constructor.name] = new Set();
                    }
                    context.ctx.auditReport.prototypeAccess[prot.constructor.name].add(b);
                }
            } while (prot = Object.getPrototypeOf(prot));
        }
    }
    if (prototypeAccess) {
        if (isFunction) {
            if (!['name', 'length', 'constructor'].includes(b) && a.hasOwnProperty(b)) {
                const whitelist = context.ctx.prototypeWhitelist.get(a.prototype);
                const replace = context.ctx.options.prototypeReplacements.get(a);
                if (replace) {
                    done(undefined, new Prop(replace(a, true), b));
                    return;
                }
                if (whitelist && (!whitelist.size || whitelist.has(b))) ;
                else {
                    throw new SandboxError(`Static method or property access not permitted: ${a.name}.${b}`);
                }
            }
        }
        else if (b !== 'constructor') {
            let prot = a;
            while (prot = Object.getPrototypeOf(prot)) {
                if (prot.hasOwnProperty(b)) {
                    const whitelist = context.ctx.prototypeWhitelist.get(prot);
                    const replace = context.ctx.options.prototypeReplacements.get(prot.constuctor);
                    if (replace) {
                        done(undefined, new Prop(replace(a, false), b));
                        return;
                    }
                    if (whitelist && (!whitelist.size || whitelist.has(b))) {
                        break;
                    }
                    throw new SandboxError(`Method or property access not permitted: ${prot.constructor.name}.${b}`);
                }
            }
        }
    }
    if (context.evals.has(a[b])) {
        done(undefined, context.evals.get(a[b]));
        return;
    }
    if (a[b] === globalThis) {
        done(undefined, context.ctx.globalScope.get('this'));
        return;
    }
    let g = obj.isGlobal || (isFunction && !sandboxedFunctions.has(a)) || context.ctx.globalsWhitelist.has(a);
    done(undefined, new Prop(a, b, false, g));
});
addOps(5 /* LispType.Call */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (context.ctx.options.forbidFunctionCalls)
        throw new SandboxError("Function invocations are not allowed");
    if (typeof a !== 'function') {
        throw new TypeError(`${typeof obj.prop === 'symbol' ? 'Symbol' : obj.prop} is not a function`);
    }
    const vals = b.map((item) => {
        if (item instanceof SpreadArray) {
            return [...item.item];
        }
        else {
            return [item];
        }
    }).flat().map((item) => valueOrProp(item, context));
    if (typeof obj === 'function') {
        done(undefined, obj(...vals));
        return;
    }
    if (obj.context[obj.prop] === JSON.stringify && context.getSubscriptions.size) {
        const cache = new Set();
        const recurse = (x) => {
            if (!x || !(typeof x === 'object') || cache.has(x))
                return;
            cache.add(x);
            for (let y in x) {
                context.getSubscriptions.forEach((cb) => cb(x, y));
                recurse(x[y]);
            }
        };
        recurse(vals[0]);
    }
    if (obj.context instanceof Array && arrayChange.has(obj.context[obj.prop]) && (context.changeSubscriptions.get(obj.context) || context.changeSubscriptionsGlobal.get(obj.context))) {
        let change;
        let changed = false;
        if (obj.prop === "push") {
            change = {
                type: "push",
                added: vals
            };
            changed = !!vals.length;
        }
        else if (obj.prop === "pop") {
            change = {
                type: "pop",
                removed: obj.context.slice(-1)
            };
            changed = !!change.removed.length;
        }
        else if (obj.prop === "shift") {
            change = {
                type: "shift",
                removed: obj.context.slice(0, 1)
            };
            changed = !!change.removed.length;
        }
        else if (obj.prop === "unshift") {
            change = {
                type: "unshift",
                added: vals
            };
            changed = !!vals.length;
        }
        else if (obj.prop === "splice") {
            change = {
                type: "splice",
                startIndex: vals[0],
                deleteCount: vals[1] === undefined ? obj.context.length : vals[1],
                added: vals.slice(2),
                removed: obj.context.slice(vals[0], vals[1] === undefined ? undefined : vals[0] + vals[1])
            };
            changed = !!change.added.length || !!change.removed.length;
        }
        else if (obj.prop === "reverse" || obj.prop === "sort") {
            change = { type: obj.prop };
            changed = !!obj.context.length;
        }
        else if (obj.prop === "copyWithin") {
            let len = vals[2] === undefined ? obj.context.length - vals[1] : Math.min(obj.context.length, vals[2] - vals[1]);
            change = {
                type: "copyWithin",
                startIndex: vals[0],
                endIndex: vals[0] + len,
                added: obj.context.slice(vals[1], vals[1] + len),
                removed: obj.context.slice(vals[0], vals[0] + len)
            };
            changed = !!change.added.length || !!change.removed.length;
        }
        if (changed) {
            context.changeSubscriptions.get(obj.context)?.forEach((cb) => cb(change));
            context.changeSubscriptionsGlobal.get(obj.context)?.forEach((cb) => cb(change));
        }
    }
    obj.get(context);
    done(undefined, obj.context[obj.prop](...vals));
});
addOps(22 /* LispType.CreateObject */, (exec, done, ticks, a, b, obj, context, scope) => {
    let res = {};
    for (let item of b) {
        if (item.key instanceof SpreadObject) {
            res = { ...res, ...item.key.item };
        }
        else {
            res[item.key] = item.val;
        }
    }
    done(undefined, res);
});
addOps(6 /* LispType.KeyVal */, (exec, done, ticks, a, b) => done(undefined, new KeyVal(a, b)));
addOps(12 /* LispType.CreateArray */, (exec, done, ticks, a, b, obj, context, scope) => {
    const items = b.map((item) => {
        if (item instanceof SpreadArray) {
            return [...item.item];
        }
        else {
            return [item];
        }
    }).flat().map((item) => valueOrProp(item, context));
    done(undefined, items);
});
addOps(23 /* LispType.Group */, (exec, done, ticks, a, b) => done(undefined, b));
addOps(35 /* LispType.GlobalSymbol */, (exec, done, ticks, a, b) => {
    switch (b) {
        case 'true': return done(undefined, true);
        case 'false': return done(undefined, false);
        case 'null': return done(undefined, null);
        case 'undefined': return done(undefined, undefined);
        case 'NaN': return done(undefined, NaN);
        case 'Infinity': return done(undefined, Infinity);
    }
    done(new Error('Unknown symbol: ' + b));
});
addOps(7 /* LispType.Number */, (exec, done, ticks, a, b) => done(undefined, Number(b)));
addOps(83 /* LispType.BigInt */, (exec, done, ticks, a, b) => done(undefined, BigInt(b)));
addOps(2 /* LispType.StringIndex */, (exec, done, ticks, a, b, obj, context) => done(undefined, context.constants.strings[parseInt(b)]));
addOps(85 /* LispType.RegexIndex */, (exec, done, ticks, a, b, obj, context) => {
    const reg = context.constants.regexes[parseInt(b)];
    if (!context.ctx.globalsWhitelist.has(RegExp)) {
        throw new SandboxError("Regex not permitted");
    }
    else {
        done(undefined, new RegExp(reg.regex, reg.flags));
    }
});
addOps(84 /* LispType.LiteralIndex */, (exec, done, ticks, a, b, obj, context, scope) => {
    let item = context.constants.literals[parseInt(b)];
    const [, name, js] = item;
    let found = [];
    let f;
    let resnums = [];
    while (f = literalRegex.exec(name)) {
        if (!f[2]) {
            found.push(js[parseInt(f[3], 10)]);
            resnums.push(f[3]);
        }
    }
    exec(ticks, found, scope, context, (err, processed) => {
        const reses = {};
        if (err) {
            done(err);
            return;
        }
        for (let i in resnums) {
            const num = resnums[i];
            reses[num] = processed[i];
        }
        done(undefined, name.replace(/(\\\\)*(\\)?\${(\d+)}/g, (match, $$, $, num) => {
            if ($)
                return match;
            let res = reses[num];
            return ($$ ? $$ : '') + `${valueOrProp(res, context)}`;
        }));
    });
});
addOps(18 /* LispType.SpreadArray */, (exec, done, ticks, a, b, obj, context, scope) => {
    done(undefined, new SpreadArray(b));
});
addOps(17 /* LispType.SpreadObject */, (exec, done, ticks, a, b, obj, context, scope) => {
    done(undefined, new SpreadObject(b));
});
addOps(24 /* LispType.Not */, (exec, done, ticks, a, b) => done(undefined, !b));
addOps(64 /* LispType.Inverse */, (exec, done, ticks, a, b) => done(undefined, ~b));
addOps(25 /* LispType.IncrementBefore */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, ++obj.context[obj.prop]);
});
addOps(26 /* LispType.IncrementAfter */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop]++);
});
addOps(27 /* LispType.DecrementBefore */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, --obj.context[obj.prop]);
});
addOps(28 /* LispType.DecrementAfter */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop]--);
});
addOps(9 /* LispType.Assign */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] = b);
});
addOps(66 /* LispType.AddEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] += b);
});
addOps(65 /* LispType.SubractEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] -= b);
});
addOps(67 /* LispType.DivideEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] /= b);
});
addOps(69 /* LispType.MultiplyEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] *= b);
});
addOps(68 /* LispType.PowerEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] **= b);
});
addOps(70 /* LispType.ModulusEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] %= b);
});
addOps(71 /* LispType.BitNegateEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] ^= b);
});
addOps(72 /* LispType.BitAndEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] &= b);
});
addOps(73 /* LispType.BitOrEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] |= b);
});
addOps(76 /* LispType.ShiftLeftEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] <<= b);
});
addOps(75 /* LispType.ShiftRightEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] >>= b);
});
addOps(74 /* LispType.UnsignedShiftRightEquals */, (exec, done, ticks, a, b, obj, context) => {
    assignCheck(obj, context);
    done(undefined, obj.context[obj.prop] >>= b);
});
addOps(57 /* LispType.LargerThan */, (exec, done, ticks, a, b) => done(undefined, a > b));
addOps(56 /* LispType.SmallerThan */, (exec, done, ticks, a, b) => done(undefined, a < b));
addOps(55 /* LispType.LargerEqualThan */, (exec, done, ticks, a, b) => done(undefined, a >= b));
addOps(54 /* LispType.SmallerEqualThan */, (exec, done, ticks, a, b) => done(undefined, a <= b));
addOps(52 /* LispType.Equal */, (exec, done, ticks, a, b) => done(undefined, a == b));
addOps(32 /* LispType.StrictEqual */, (exec, done, ticks, a, b) => done(undefined, a === b));
addOps(53 /* LispType.NotEqual */, (exec, done, ticks, a, b) => done(undefined, a != b));
addOps(31 /* LispType.StrictNotEqual */, (exec, done, ticks, a, b) => done(undefined, a !== b));
addOps(29 /* LispType.And */, (exec, done, ticks, a, b) => done(undefined, a && b));
addOps(30 /* LispType.Or */, (exec, done, ticks, a, b) => done(undefined, a || b));
addOps(77 /* LispType.BitAnd */, (exec, done, ticks, a, b) => done(undefined, a & b));
addOps(78 /* LispType.BitOr */, (exec, done, ticks, a, b) => done(undefined, a | b));
addOps(33 /* LispType.Plus */, (exec, done, ticks, a, b) => done(undefined, a + b));
addOps(47 /* LispType.Minus */, (exec, done, ticks, a, b) => done(undefined, a - b));
addOps(59 /* LispType.Positive */, (exec, done, ticks, a, b) => done(undefined, +b));
addOps(58 /* LispType.Negative */, (exec, done, ticks, a, b) => done(undefined, -b));
addOps(48 /* LispType.Divide */, (exec, done, ticks, a, b) => done(undefined, a / b));
addOps(79 /* LispType.BitNegate */, (exec, done, ticks, a, b) => done(undefined, a ^ b));
addOps(50 /* LispType.Multiply */, (exec, done, ticks, a, b) => done(undefined, a * b));
addOps(51 /* LispType.Modulus */, (exec, done, ticks, a, b) => done(undefined, a % b));
addOps(80 /* LispType.BitShiftLeft */, (exec, done, ticks, a, b) => done(undefined, a << b));
addOps(81 /* LispType.BitShiftRight */, (exec, done, ticks, a, b) => done(undefined, a >> b));
addOps(82 /* LispType.BitUnsignedShiftRight */, (exec, done, ticks, a, b) => done(undefined, a >>> b));
addOps(60 /* LispType.Typeof */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, b, scope, context, (e, prop) => {
        done(undefined, typeof valueOrProp(prop, context));
    });
});
addOps(62 /* LispType.Instanceof */, (exec, done, ticks, a, b) => done(undefined, a instanceof b));
addOps(63 /* LispType.In */, (exec, done, ticks, a, b) => done(undefined, a in b));
addOps(61 /* LispType.Delete */, (exec, done, ticks, a, b, obj, context, scope, bobj) => {
    if (bobj.context === undefined) {
        done(undefined, true);
        return;
    }
    assignCheck(bobj, context, 'delete');
    if (bobj.isVariable) {
        done(undefined, false);
        return;
    }
    done(undefined, delete bobj.context[bobj.prop]);
});
addOps(8 /* LispType.Return */, (exec, done, ticks, a, b, obj, context) => done(undefined, b));
addOps(34 /* LispType.Var */, (exec, done, ticks, a, b, obj, context, scope, bobj) => {
    done(undefined, scope.declare(a, VarType.var, b));
});
addOps(3 /* LispType.Let */, (exec, done, ticks, a, b, obj, context, scope, bobj) => {
    done(undefined, scope.declare(a, VarType.let, b, bobj && bobj.isGlobal));
});
addOps(4 /* LispType.Const */, (exec, done, ticks, a, b, obj, context, scope, bobj) => {
    done(undefined, scope.declare(a, VarType.const, b));
});
addOps(11 /* LispType.ArrowFunction */, (exec, done, ticks, a, b, obj, context, scope) => {
    a = [...a];
    if (typeof obj[2] === "string" || obj[2] instanceof CodeString) {
        obj[2] = b = lispifyFunction(new CodeString(obj[2]), context.constants);
    }
    if (a.shift()) {
        done(undefined, createFunctionAsync(a, b, ticks, context, scope));
    }
    else {
        done(undefined, createFunction(a, b, ticks, context, scope));
    }
});
addOps(37 /* LispType.Function */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (typeof obj[2] === "string" || obj[2] instanceof CodeString) {
        obj[2] = b = lispifyFunction(new CodeString(obj[2]), context.constants);
    }
    let isAsync = a.shift();
    let name = a.shift();
    let func;
    if (isAsync === 88 /* LispType.True */) {
        func = createFunctionAsync(a, b, ticks, context, scope, name);
    }
    else {
        func = createFunction(a, b, ticks, context, scope, name);
    }
    if (name) {
        scope.declare(name, VarType.var, func);
    }
    done(undefined, func);
});
addOps(10 /* LispType.InlineFunction */, (exec, done, ticks, a, b, obj, context, scope) => {
    if (typeof obj[2] === "string" || obj[2] instanceof CodeString) {
        obj[2] = b = lispifyFunction(new CodeString(obj[2]), context.constants);
    }
    let isAsync = a.shift();
    let name = a.shift();
    if (name) {
        scope = new Scope(scope, {});
    }
    let func;
    if (isAsync === 88 /* LispType.True */) {
        func = createFunctionAsync(a, b, ticks, context, scope, name);
    }
    else {
        func = createFunction(a, b, ticks, context, scope, name);
    }
    if (name) {
        scope.declare(name, VarType.let, func);
    }
    done(undefined, func);
});
addOps(38 /* LispType.Loop */, (exec, done, ticks, a, b, obj, context, scope) => {
    const [checkFirst, startInternal, getIterator, startStep, step, condition, beforeStep] = a;
    let loop = true;
    const loopScope = new Scope(scope, {});
    let internalVars = {
        '$$obj': undefined
    };
    const interalScope = new Scope(loopScope, internalVars);
    if (exec === execAsync) {
        (async () => {
            let ad;
            ad = asyncDone((d) => exec(ticks, startStep, loopScope, context, d));
            internalVars['$$obj'] = (ad = asyncDone((d) => exec(ticks, getIterator, loopScope, context, d))).isInstant === true ? ad.instant : (await ad.p).result;
            ad = asyncDone((d) => exec(ticks, startInternal, interalScope, context, d));
            if (checkFirst)
                loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant === true ? ad.instant : (await ad.p).result;
            while (loop) {
                let innerLoopVars = {};
                ad = asyncDone((d) => exec(ticks, beforeStep, new Scope(interalScope, innerLoopVars), context, d));
                ad.isInstant === true ? ad.instant : (await ad.p).result;
                let res = await executeTreeAsync(ticks, context, b, [new Scope(loopScope, innerLoopVars)], "loop");
                if (res instanceof ExecReturn && res.returned) {
                    done(undefined, res);
                    return;
                }
                if (res instanceof ExecReturn && res.breakLoop) {
                    break;
                }
                ad = asyncDone((d) => exec(ticks, step, interalScope, context, d));
                loop = (ad = asyncDone((d) => exec(ticks, condition, interalScope, context, d))).isInstant === true ? ad.instant : (await ad.p).result;
            }
            done();
        })().catch(done);
    }
    else {
        syncDone((d) => exec(ticks, startStep, loopScope, context, d));
        internalVars['$$obj'] = syncDone((d) => exec(ticks, getIterator, loopScope, context, d)).result;
        syncDone((d) => exec(ticks, startInternal, interalScope, context, d));
        if (checkFirst)
            loop = (syncDone((d) => exec(ticks, condition, interalScope, context, d))).result;
        while (loop) {
            let innerLoopVars = {};
            syncDone((d) => exec(ticks, beforeStep, new Scope(interalScope, innerLoopVars), context, d));
            let res = executeTree(ticks, context, b, [new Scope(loopScope, innerLoopVars)], "loop");
            if (res instanceof ExecReturn && res.returned) {
                done(undefined, res);
                return;
            }
            if (res instanceof ExecReturn && res.breakLoop) {
                break;
            }
            syncDone((d) => exec(ticks, step, interalScope, context, d));
            loop = (syncDone((d) => exec(ticks, condition, interalScope, context, d))).result;
        }
        done();
    }
});
addOps(86 /* LispType.LoopAction */, (exec, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch) => {
    if ((inLoopOrSwitch === "switch" && a === "continue") || !inLoopOrSwitch) {
        throw new SandboxError("Illegal " + a + " statement");
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false, a === "break", a === "continue"));
});
addOps(13 /* LispType.If */, (exec, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch) => {
    exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done);
});
addOps(15 /* LispType.InlineIf */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, valueOrProp(a, context) ? b.t : b.f, scope, context, done);
});
addOps(16 /* LispType.InlineIfCase */, (exec, done, ticks, a, b) => done(undefined, new If(a, b)));
addOps(14 /* LispType.IfCase */, (exec, done, ticks, a, b) => done(undefined, new If(a, b)));
addOps(40 /* LispType.Switch */, (exec, done, ticks, a, b, obj, context, scope) => {
    exec(ticks, a, scope, context, (err, toTest) => {
        if (err) {
            done(err);
            return;
        }
        toTest = valueOrProp(toTest, context);
        if (exec === execSync) {
            let res;
            let isTrue = false;
            for (let caseItem of b) {
                if (isTrue || (isTrue = !caseItem[1] || toTest === valueOrProp((syncDone((d) => exec(ticks, caseItem[1], scope, context, d))).result, context))) {
                    if (!caseItem[2])
                        continue;
                    res = executeTree(ticks, context, caseItem[2], [scope], "switch");
                    if (res.breakLoop)
                        break;
                    if (res.returned) {
                        done(undefined, res);
                        return;
                    }
                    if (!caseItem[1]) { // default case
                        break;
                    }
                }
            }
            done();
        }
        else {
            (async () => {
                let res;
                let isTrue = false;
                for (let caseItem of b) {
                    let ad;
                    if (isTrue || (isTrue = !caseItem[1] || toTest === valueOrProp((ad = asyncDone((d) => exec(ticks, caseItem[1], scope, context, d))).isInstant === true ? ad.instant : (await ad.p).result, context))) {
                        if (!caseItem[2])
                            continue;
                        res = await executeTreeAsync(ticks, context, caseItem[2], [scope], "switch");
                        if (res.breakLoop)
                            break;
                        if (res.returned) {
                            done(undefined, res);
                            return;
                        }
                        if (!caseItem[1]) { // default case
                            break;
                        }
                    }
                }
                done();
            })().catch(done);
        }
    });
});
addOps(39 /* LispType.Try */, (exec, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch) => {
    const [exception, catchBody, finallyBody] = b;
    executeTreeWithDone(exec, (err, res) => {
        executeTreeWithDone(exec, (e) => {
            if (e)
                done(e);
            else if (err) {
                executeTreeWithDone(exec, done, ticks, context, catchBody, [new Scope(scope)], inLoopOrSwitch);
            }
            else {
                done(undefined, res);
            }
        }, ticks, context, finallyBody, [new Scope(scope, {})]);
    }, ticks, context, a, [new Scope(scope)], inLoopOrSwitch);
});
addOps(87 /* LispType.Void */, (exec, done, ticks, a) => { done(); });
addOps(45 /* LispType.New */, (exec, done, ticks, a, b, obj, context) => {
    if (!context.ctx.globalsWhitelist.has(a) && !sandboxedFunctions.has(a)) {
        throw new SandboxError(`Object construction not allowed: ${a.constructor.name}`);
    }
    done(undefined, new a(...b));
});
addOps(46 /* LispType.Throw */, (exec, done, ticks, a, b) => { done(b); });
addOps(43 /* LispType.Expression */, (exec, done, ticks, a) => done(undefined, a.pop()));
addOps(0 /* LispType.None */, (exec, done, ticks, a) => done());
function valueOrProp(a, context) {
    if (a instanceof Prop)
        return a.get(context);
    if (a === optional)
        return undefined;
    return a;
}
function execMany(ticks, exec, tree, done, scope, context, inLoopOrSwitch) {
    if (exec === execSync) {
        _execManySync(ticks, tree, done, scope, context, inLoopOrSwitch);
    }
    else {
        _execManyAsync(ticks, tree, done, scope, context, inLoopOrSwitch).catch(done);
    }
}
function _execManySync(ticks, tree, done, scope, context, inLoopOrSwitch) {
    let ret = [];
    for (let i = 0; i < tree.length; i++) {
        let res;
        try {
            res = syncDone((d) => execSync(ticks, tree[i], scope, context, d, inLoopOrSwitch)).result;
        }
        catch (e) {
            done(e);
            return;
        }
        if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
            done(undefined, res);
            return;
        }
        if (isLisp(tree[i]) && tree[i][0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
        ret.push(res);
    }
    done(undefined, ret);
}
async function _execManyAsync(ticks, tree, done, scope, context, inLoopOrSwitch) {
    let ret = [];
    for (let i = 0; i < tree.length; i++) {
        let res;
        try {
            let ad;
            res = (ad = asyncDone((d) => execAsync(ticks, tree[i], scope, context, d, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
        }
        catch (e) {
            done(e);
            return;
        }
        if (res instanceof ExecReturn && (res.returned || res.breakLoop || res.continueLoop)) {
            done(undefined, res);
            return;
        }
        if (isLisp(tree[i]) && tree[i][0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
        ret.push(res);
    }
    done(undefined, ret);
}
function asyncDone(callback) {
    let isInstant = false;
    let instant;
    const p = new Promise((resolve, reject) => {
        callback((err, result) => {
            if (err)
                reject(err);
            else {
                isInstant = true;
                instant = result;
                resolve({ result });
            }
        });
    });
    return {
        isInstant,
        instant,
        p
    };
}
function syncDone(callback) {
    let result;
    let err;
    callback((e, r) => {
        err = e;
        result = r;
    });
    if (err)
        throw err;
    return { result };
}
async function execAsync(ticks, tree, scope, context, doneOriginal, inLoopOrSwitch) {
    let done = doneOriginal;
    const p = new Promise((resolve) => {
        done = (e, r) => {
            doneOriginal(e, r);
            resolve();
        };
    });
    if (_execNoneRecurse(ticks, tree, scope, context, done, true, inLoopOrSwitch)) ;
    else if (isLisp(tree)) {
        let op = tree[0];
        let obj;
        try {
            let ad;
            obj = (ad = asyncDone((d) => execAsync(ticks, tree[1], scope, context, d, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let a = obj;
        try {
            a = obj instanceof Prop ? obj.get(context) : obj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (op === 20 /* LispType.PropOptional */ || op === 21 /* LispType.CallOptional */) {
            if (a === undefined || a === null) {
                done(undefined, optional);
                return;
            }
            op = op === 20 /* LispType.PropOptional */ ? 1 /* LispType.Prop */ : 5 /* LispType.Call */;
        }
        if (a === optional) {
            if (op === 1 /* LispType.Prop */ || op === 5 /* LispType.Call */) {
                done(undefined, a);
                return;
            }
            else {
                a = undefined;
            }
        }
        let bobj;
        try {
            let ad;
            bobj = (ad = asyncDone((d) => execAsync(ticks, tree[2], scope, context, d, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let b = bobj;
        try {
            b = bobj instanceof Prop ? bobj.get(context) : bobj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (b === optional) {
            b = undefined;
        }
        if (ops.has(op)) {
            try {
                ops.get(op)(execAsync, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch);
            }
            catch (err) {
                done(err);
            }
        }
        else {
            done(new SyntaxError('Unknown operator: ' + op));
        }
    }
    await p;
}
function execSync(ticks, tree, scope, context, done, inLoopOrSwitch) {
    if (_execNoneRecurse(ticks, tree, scope, context, done, false, inLoopOrSwitch)) ;
    else if (isLisp(tree)) {
        let op = tree[0];
        let obj;
        try {
            obj = syncDone((d) => execSync(ticks, tree[1], scope, context, d, inLoopOrSwitch)).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let a = obj;
        try {
            a = obj instanceof Prop ? obj.get(context) : obj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (op === 20 /* LispType.PropOptional */ || op === 21 /* LispType.CallOptional */) {
            if (a === undefined || a === null) {
                done(undefined, optional);
                return;
            }
            op = op === 20 /* LispType.PropOptional */ ? 1 /* LispType.Prop */ : 5 /* LispType.Call */;
        }
        if (a === optional) {
            if (op === 1 /* LispType.Prop */ || op === 5 /* LispType.Call */) {
                done(undefined, a);
                return;
            }
            else {
                a = undefined;
            }
        }
        let bobj;
        try {
            bobj = syncDone((d) => execSync(ticks, tree[2], scope, context, d, inLoopOrSwitch)).result;
        }
        catch (e) {
            done(e);
            return;
        }
        let b = bobj;
        try {
            b = bobj instanceof Prop ? bobj.get(context) : bobj;
        }
        catch (e) {
            done(e);
            return;
        }
        if (b === optional) {
            b = undefined;
        }
        if (ops.has(op)) {
            try {
                ops.get(op)(execSync, done, ticks, a, b, obj, context, scope, bobj, inLoopOrSwitch);
            }
            catch (err) {
                done(err);
            }
        }
        else {
            done(new SyntaxError('Unknown operator: ' + op));
        }
    }
}
const unexecTypes = new Set([
    11 /* LispType.ArrowFunction */,
    37 /* LispType.Function */,
    10 /* LispType.InlineFunction */,
    38 /* LispType.Loop */,
    39 /* LispType.Try */,
    40 /* LispType.Switch */,
    14 /* LispType.IfCase */,
    16 /* LispType.InlineIfCase */,
    60 /* LispType.Typeof */
]);
function _execNoneRecurse(ticks, tree, scope, context, done, isAsync, inLoopOrSwitch) {
    const exec = isAsync ? execAsync : execSync;
    if (context.ctx.options.executionQuota <= ticks.ticks) {
        if (typeof context.ctx.options.onExecutionQuotaReached === 'function' && context.ctx.options.onExecutionQuotaReached(ticks, scope, context, tree)) ;
        else {
            done(new SandboxError("Execution quota exceeded"));
            return;
        }
    }
    ticks.ticks++;
    currentTicks = ticks;
    if (tree instanceof Prop) {
        try {
            done(undefined, tree.get(context));
        }
        catch (err) {
            done(err);
        }
    }
    else if (tree === optional) {
        done();
    }
    else if (Array.isArray(tree) && !isLisp(tree)) {
        if (tree[0] === 0 /* LispType.None */) {
            done();
        }
        else {
            execMany(ticks, exec, tree, done, scope, context, inLoopOrSwitch);
        }
    }
    else if (!isLisp(tree)) {
        done(undefined, tree);
    }
    else if (tree[0] === 42 /* LispType.Block */) {
        execMany(ticks, exec, tree[1], done, scope, context, inLoopOrSwitch);
    }
    else if (tree[0] === 44 /* LispType.Await */) {
        if (!isAsync) {
            done(new SandboxError("Illegal use of 'await', must be inside async function"));
        }
        else if (context.ctx.prototypeWhitelist?.has(Promise.prototype)) {
            execAsync(ticks, tree[1], scope, context, async (e, r) => {
                if (e)
                    done(e);
                else
                    try {
                        done(undefined, await valueOrProp(r, context));
                    }
                    catch (err) {
                        done(err);
                    }
            }, inLoopOrSwitch).catch(done);
        }
        else {
            done(new SandboxError('Async/await is not permitted'));
        }
    }
    else if (unexecTypes.has(tree[0])) {
        try {
            ops.get(tree[0])(exec, done, ticks, tree[1], tree[2], tree, context, scope, undefined, inLoopOrSwitch);
        }
        catch (err) {
            done(err);
        }
    }
    else {
        return false;
    }
    return true;
}
function executeTree(ticks, context, executionTree, scopes = [], inLoopOrSwitch) {
    return syncDone((done) => executeTreeWithDone(execSync, done, ticks, context, executionTree, scopes, inLoopOrSwitch)).result;
}
async function executeTreeAsync(ticks, context, executionTree, scopes = [], inLoopOrSwitch) {
    let ad;
    return (ad = asyncDone((done) => executeTreeWithDone(execAsync, done, ticks, context, executionTree, scopes, inLoopOrSwitch))).isInstant === true ? ad.instant : (await ad.p).result;
}
function executeTreeWithDone(exec, done, ticks, context, executionTree, scopes = [], inLoopOrSwitch) {
    if (!executionTree) {
        done();
        return;
    }
    if (!(executionTree instanceof Array)) {
        throw new SyntaxError('Bad execution tree');
    }
    let scope = context.ctx.globalScope;
    let s;
    while (s = scopes.shift()) {
        if (typeof s !== "object")
            continue;
        if (s instanceof Scope) {
            scope = s;
        }
        else {
            scope = new Scope(scope, s, s instanceof LocalScope ? undefined : null);
        }
    }
    if (context.ctx.options.audit && !context.ctx.auditReport) {
        context.ctx.auditReport = {
            globalsAccess: new Set(),
            prototypeAccess: {},
        };
    }
    if (exec === execSync) {
        _executeWithDoneSync(done, ticks, context, executionTree, scope, inLoopOrSwitch);
    }
    else {
        _executeWithDoneAsync(done, ticks, context, executionTree, scope, inLoopOrSwitch).catch(done);
    }
}
function _executeWithDoneSync(done, ticks, context, executionTree, scope, inLoopOrSwitch) {
    if (!(executionTree instanceof Array))
        throw new SyntaxError('Bad execution tree');
    let i = 0;
    for (i = 0; i < executionTree.length; i++) {
        let res;
        let err;
        const current = executionTree[i];
        try {
            execSync(ticks, current, scope, context, (e, r) => {
                err = e;
                res = r;
            }, inLoopOrSwitch);
        }
        catch (e) {
            err = e;
        }
        if (err) {
            done(err);
            return;
        }
        if (res instanceof ExecReturn) {
            done(undefined, res);
            return;
        }
        if (isLisp(current) && current[0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}
async function _executeWithDoneAsync(done, ticks, context, executionTree, scope, inLoopOrSwitch) {
    if (!(executionTree instanceof Array))
        throw new SyntaxError('Bad execution tree');
    let i = 0;
    for (i = 0; i < executionTree.length; i++) {
        let res;
        let err;
        const current = executionTree[i];
        try {
            await execAsync(ticks, current, scope, context, (e, r) => {
                err = e;
                res = r;
            }, inLoopOrSwitch);
        }
        catch (e) {
            err = e;
        }
        if (err) {
            done(err);
            return;
        }
        if (res instanceof ExecReturn) {
            done(undefined, res);
            return;
        }
        if (isLisp(current) && current[0] === 8 /* LispType.Return */) {
            done(undefined, new ExecReturn(context.ctx.auditReport, res, true));
            return;
        }
    }
    done(undefined, new ExecReturn(context.ctx.auditReport, undefined, false));
}

class SandboxGlobal {
    constructor(globals) {
        if (globals === globalThis)
            return globalThis;
        for (let i in globals) {
            this[i] = globals[i];
        }
    }
}
class ExecContext {
    constructor(ctx, constants, tree, getSubscriptions, setSubscriptions, changeSubscriptions, setSubscriptionsGlobal, changeSubscriptionsGlobal, evals, registerSandboxFunction) {
        this.ctx = ctx;
        this.constants = constants;
        this.tree = tree;
        this.getSubscriptions = getSubscriptions;
        this.setSubscriptions = setSubscriptions;
        this.changeSubscriptions = changeSubscriptions;
        this.setSubscriptionsGlobal = setSubscriptionsGlobal;
        this.changeSubscriptionsGlobal = changeSubscriptionsGlobal;
        this.evals = evals;
        this.registerSandboxFunction = registerSandboxFunction;
    }
}
function subscribeSet(obj, name, callback, context) {
    const names = context.setSubscriptions.get(obj) || new Map();
    context.setSubscriptions.set(obj, names);
    const callbacks = names.get(name) || new Set();
    names.set(name, callbacks);
    callbacks.add(callback);
    let changeCbs;
    if (obj && obj[name] && typeof obj[name] === "object") {
        changeCbs = context.changeSubscriptions.get(obj[name]) || new Set();
        changeCbs.add(callback);
        context.changeSubscriptions.set(obj[name], changeCbs);
    }
    return {
        unsubscribe: () => {
            callbacks.delete(callback);
            changeCbs?.delete(callback);
        }
    };
}
class Sandbox {
    constructor(options) {
        this.setSubscriptions = new WeakMap();
        this.changeSubscriptions = new WeakMap();
        this.sandboxFunctions = new WeakMap();
        options = Object.assign({
            audit: false,
            forbidFunctionCalls: false,
            forbidFunctionCreation: false,
            globals: Sandbox.SAFE_GLOBALS,
            prototypeWhitelist: Sandbox.SAFE_PROTOTYPES,
            prototypeReplacements: new Map(),
        }, options || {});
        const sandboxGlobal = new SandboxGlobal(options.globals);
        this.context = {
            sandbox: this,
            globalsWhitelist: new Set(Object.values(options.globals)),
            prototypeWhitelist: new Map([...options.prototypeWhitelist].map((a) => [a[0].prototype, a[1]])),
            options,
            globalScope: new Scope(null, options.globals, sandboxGlobal),
            sandboxGlobal
        };
        this.context.prototypeWhitelist.set(Object.getPrototypeOf([][Symbol.iterator]()), new Set());
    }
    static get SAFE_GLOBALS() {
        return {
            Function,
            console: {
                debug: console.debug,
                error: console.error,
                info: console.info,
                log: console.log,
                table: console.table,
                warn: console.warn
            },
            isFinite,
            isNaN,
            parseFloat,
            parseInt,
            decodeURI,
            decodeURIComponent,
            encodeURI,
            encodeURIComponent,
            escape,
            unescape,
            Boolean,
            Number,
            BigInt,
            String,
            Object,
            Array,
            Symbol,
            Error,
            EvalError,
            RangeError,
            ReferenceError,
            SyntaxError,
            TypeError,
            URIError,
            Int8Array,
            Uint8Array,
            Uint8ClampedArray,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
            Map,
            Set,
            WeakMap,
            WeakSet,
            Promise,
            Intl,
            JSON,
            Math,
            Date,
            RegExp
        };
    }
    static get SAFE_PROTOTYPES() {
        let protos = [
            SandboxGlobal,
            Function,
            Boolean,
            Number,
            BigInt,
            String,
            Date,
            Error,
            Array,
            Int8Array,
            Uint8Array,
            Uint8ClampedArray,
            Int16Array,
            Uint16Array,
            Int32Array,
            Uint32Array,
            Float32Array,
            Float64Array,
            Map,
            Set,
            WeakMap,
            WeakSet,
            Promise,
            Symbol,
            Date,
            RegExp
        ];
        let map = new Map();
        protos.forEach((proto) => {
            map.set(proto, new Set());
        });
        map.set(Object, new Set([
            'entries',
            'fromEntries',
            'getOwnPropertyNames',
            'is',
            'keys',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toLocaleString',
            'toString',
            'valueOf',
            'values'
        ]));
        return map;
    }
    subscribeGet(callback, context) {
        context.getSubscriptions.add(callback);
        return { unsubscribe: () => context.getSubscriptions.delete(callback) };
    }
    subscribeSet(obj, name, callback, context) {
        return subscribeSet(obj, name, callback, context);
    }
    subscribeSetGlobal(obj, name, callback) {
        return subscribeSet(obj, name, callback, this);
    }
    static audit(code, scopes = []) {
        const globals = {};
        for (let i of Object.getOwnPropertyNames(globalThis)) {
            globals[i] = globalThis[i];
        }
        const sandbox = new Sandbox({
            globals,
            audit: true,
        });
        return sandbox.executeTree(sandbox.createContext(sandbox.context, parse(code)), scopes);
    }
    static parse(code) {
        return parse(code);
    }
    createContext(context, executionTree) {
        const evals = new Map();
        const execContext = new ExecContext(context, executionTree.constants, executionTree.tree, new Set(), new WeakMap(), new WeakMap(), this.setSubscriptions, this.changeSubscriptions, evals, (fn) => this.sandboxFunctions.set(fn, execContext));
        const func = sandboxFunction(execContext);
        evals.set(Function, func);
        evals.set(eval, sandboxedEval(func));
        evals.set(setTimeout, sandboxedSetTimeout(func));
        evals.set(setInterval, sandboxedSetInterval(func));
        return execContext;
    }
    getContext(fn) {
        return this.sandboxFunctions.get(fn);
    }
    executeTree(context, scopes = []) {
        return executeTree({
            ticks: BigInt(0),
        }, context, context.tree, scopes);
    }
    executeTreeAsync(context, scopes = []) {
        return executeTreeAsync({
            ticks: BigInt(0),
        }, context, context.tree, scopes);
    }
    compile(code, optimize = false) {
        const parsed = parse(code, optimize);
        const exec = (...scopes) => {
            const context = this.createContext(this.context, parsed);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    ;
    compileAsync(code, optimize = false) {
        const parsed = parse(code, optimize);
        const exec = (...scopes) => {
            const context = this.createContext(this.context, parsed);
            return { context, run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result) };
        };
        return exec;
    }
    ;
    compileExpression(code, optimize = false) {
        const parsed = parse(code, optimize, true);
        const exec = (...scopes) => {
            const context = this.createContext(this.context, parsed);
            return { context, run: () => this.executeTree(context, [...scopes]).result };
        };
        return exec;
    }
    compileExpressionAsync(code, optimize = false) {
        const parsed = parse(code, optimize, true);
        const exec = (...scopes) => {
            const context = this.createContext(this.context, parsed);
            return { context, run: () => this.executeTreeAsync(context, [...scopes]).then((ret) => ret.result) };
        };
        return exec;
    }
}

exports.ExecContext = ExecContext;
exports.FunctionScope = FunctionScope;
exports.LocalScope = LocalScope;
exports.SandboxGlobal = SandboxGlobal;
exports.assignCheck = assignCheck;
exports.asyncDone = asyncDone;
exports.default = Sandbox;
exports.execAsync = execAsync;
exports.execMany = execMany;
exports.execSync = execSync;
exports.executeTree = executeTree;
exports.executeTreeAsync = executeTreeAsync;
exports.executionOps = ops;
exports.expectTypes = expectTypes;
exports.setLispType = setLispType;
exports.syncDone = syncDone;
