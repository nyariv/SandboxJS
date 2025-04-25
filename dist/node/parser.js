'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var utils = require('./utils.js');

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
    if (Number.isNaN(parsedHex) || (enforcedLength !== undefined && enforcedLength !== hex.length)) {
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
    return text.charAt(0) === '{' && text.charAt(text.length - 1) === '}';
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
        throw err instanceof RangeError ? new SyntaxError('Code Point Limit:' + parsedCode) : err;
    }
}
/**
 * Map of unescaped letters to their corresponding special JS escape characters.
 * Intentionally does not include characters that map to themselves like "\'".
 */
const singleCharacterEscapes = new Map([
    ['b', '\b'],
    ['f', '\f'],
    ['n', '\n'],
    ['r', '\r'],
    ['t', '\t'],
    ['v', '\v'],
    ['0', '\0'],
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
            return '\\';
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
        if (octal === '0') {
            return '\0';
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
const NullLisp = createLisp({ op: 0 /* LispType.None */, a: 0 /* LispType.None */, b: 0 /* LispType.None */ });
const lispTypes = new Map();
class ParseError extends Error {
    constructor(message, code) {
        super(message + ': ' + code.substring(0, 40));
        this.code = code;
    }
}
let lastType;
const inlineIfElse = /^:/;
const elseIf = /^else(?![\w$])/;
const ifElse = /^if(?![\w$])/;
const space = /^\s/;
const expectTypes = {
    splitter: {
        types: {
            opHigh: /^(\/|\*\*|\*(?!\*)|%)(?!=)/,
            op: /^(\+(?!(\+))|-(?!(-)))(?!=)/,
            comparitor: /^(<=|>=|<(?!<)|>(?!>)|!==|!=(?!=)|===|==)/,
            boolOp: /^(&&|\|\||instanceof(?![\w$])|in(?![\w$]))/,
            bitwise: /^(&(?!&)|\|(?!\|)|\^|<<|>>(?!>)|>>>)(?!=)/,
        },
        next: ['modifier', 'value', 'prop', 'incrementerBefore'],
    },
    inlineIf: {
        types: {
            inlineIf: /^\?(?!\.(?!\d))/,
        },
        next: ['expEnd'],
    },
    assignment: {
        types: {
            assignModify: /^(-=|\+=|\/=|\*\*=|\*=|%=|\^=|&=|\|=|>>>=|>>=|<<=)/,
            assign: /^(=)(?!=)/,
        },
        next: ['modifier', 'value', 'prop', 'incrementerBefore'],
    },
    incrementerBefore: {
        types: { incrementerBefore: /^(\+\+|--)/ },
        next: ['prop'],
    },
    expEdge: {
        types: {
            call: /^(\?\.)?[(]/,
            incrementerAfter: /^(\+\+|--)/,
        },
        next: ['splitter', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
    },
    modifier: {
        types: {
            not: /^!/,
            inverse: /^~/,
            negative: /^-(?!-)/,
            positive: /^\+(?!\+)/,
            typeof: /^typeof(?![\w$])/,
            delete: /^delete(?![\w$])/,
        },
        next: ['modifier', 'value', 'prop', 'incrementerBefore'],
    },
    dot: {
        types: {
            arrayProp: /^(\?\.)?\[/,
            dot: /^(\?)?\.(?=\s*[a-zA-Z$_])/,
        },
        next: ['splitter', 'assignment', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
    },
    prop: {
        types: {
            prop: /^[a-zA-Z$_][a-zA-Z\d$_]*/,
        },
        next: ['splitter', 'assignment', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
    },
    value: {
        types: {
            createObject: /^\{/,
            createArray: /^\[/,
            number: /^(0x[\da-f]+(_[\da-f]+)*|(\d+(_\d+)*(\.\d+(_\d+)*)?|\.\d+(_\d+)*))(e[+-]?\d+(_\d+)*)?(n)?(?!\d)/i,
            string: /^"(\d+)"/,
            literal: /^`(\d+)`/,
            regex: /^\/(\d+)\/r(?![\w$])/,
            boolean: /^(true|false)(?![\w$])/,
            null: /^null(?![\w$])/,
            und: /^undefined(?![\w$])/,
            arrowFunctionSingle: /^(async\s+)?([a-zA-Z$_][a-zA-Z\d$_]*)\s*=>\s*({)?/,
            arrowFunction: /^(async\s*)?\(\s*((\.\.\.)?\s*[a-zA-Z$_][a-zA-Z\d$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z$_][a-zA-Z\d$_]*)*)?\s*\)\s*=>\s*({)?/,
            inlineFunction: /^(async\s+)?function(\s*[a-zA-Z$_][a-zA-Z\d$_]*)?\s*\(\s*((\.\.\.)?\s*[a-zA-Z$_][a-zA-Z\d$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z$_][a-zA-Z\d$_]*)*)?\s*\)\s*{/,
            group: /^\(/,
            NaN: /^NaN(?![\w$])/,
            Infinity: /^Infinity(?![\w$])/,
            void: /^void(?![\w$])\s*/,
            await: /^await(?![\w$])\s*/,
            new: /^new(?![\w$])\s*/,
        },
        next: ['splitter', 'expEdge', 'dot', 'inlineIf', 'expEnd'],
    },
    initialize: {
        types: {
            initialize: /^(var|let|const)\s+([a-zA-Z$_][a-zA-Z\d$_]*)\s*(=)?/,
            return: /^return(?![\w$])/,
            throw: /^throw(?![\w$])\s*/,
        },
        next: ['modifier', 'value', 'prop', 'incrementerBefore', 'expEnd'],
    },
    spreadObject: {
        types: {
            spreadObject: /^\.\.\./,
        },
        next: ['value', 'prop'],
    },
    spreadArray: {
        types: {
            spreadArray: /^\.\.\./,
        },
        next: ['value', 'prop'],
    },
    expEnd: { types: {}, next: [] },
    expFunction: {
        types: {
            function: /^(async\s+)?function(\s*[a-zA-Z$_][a-zA-Z\d$_]*)\s*\(\s*((\.\.\.)?\s*[a-zA-Z$_][a-zA-Z\d$_]*(\s*,\s*(\.\.\.)?\s*[a-zA-Z$_][a-zA-Z\d$_]*)*)?\s*\)\s*{/,
        },
        next: ['expEdge', 'expEnd'],
    },
    expSingle: {
        types: {
            for: /^(([a-zA-Z$_][\w$]*)\s*:)?\s*for\s*\(/,
            do: /^(([a-zA-Z$_][\w$]*)\s*:)?\s*do(?![\w$])\s*(\{)?/,
            while: /^(([a-zA-Z$_][\w$]*)\s*:)?\s*while\s*\(/,
            loopAction: /^(break|continue)(?![\w$])\s*([a-zA-Z$_][\w$]*)?/,
            if: /^((([a-zA-Z$_][\w$]*)\s*:)?\s*)if\s*\(/,
            try: /^try\s*{/,
            block: /^{/,
            switch: /^(([a-zA-Z$_][\w$]*)\s*:)?\s*switch\s*\(/,
        },
        next: ['expEnd'],
    },
};
const closings = {
    '(': ')',
    '[': ']',
    '{': '}',
    "'": "'",
    '"': '"',
    '`': '`',
};
function testMultiple(str, tests) {
    let found = null;
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        found = test.exec(str);
        if (found)
            break;
    }
    return found;
}
const emptyString = new utils.CodeString('');
const okFirstChars = /^[+\-~ !]/;
const aNumber = expectTypes.value.types.number;
const wordReg = /^((if|for|else|while|do|function)(?![\w$])|[\w$]+)/;
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
    let lastChar = '';
    let isOneLiner = false;
    let i;
    let lastInertedSemi = false;
    for (i = 0; i < part.length && !done; i++) {
        let char = part.char(i);
        if (quote === '"' || quote === "'" || quote === '`') {
            if (quote === '`' && char === '$' && part.char(i + 1) === '{' && !escape) {
                const skip = restOfExp(constants, part.substring(i + 2), [], '{');
                i += skip.length + 2;
            }
            else if (char === quote && !escape) {
                return part.substring(0, i);
            }
            escape = !escape && char === '\\';
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
            if (isOneLiner && char === '{') {
                isOneLiner = false;
            }
            if (char === firstOpening) {
                done = true;
                break;
            }
            else {
                const skip = restOfExp(constants, part.substring(i + 1), [], char);
                cache.set(skip.start - 1, skip.end);
                i += skip.length + 1;
                isStart = false;
                if (closingsTests) {
                    const sub = part.substring(i);
                    let found;
                    if ((found = testMultiple(sub.toString(), closingsTests))) {
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
                if ((found = testMultiple(sub, closingsTests))) {
                    details.regRes = found;
                    i++;
                    done = true;
                    break;
                }
            }
            if ((foundNumber = aNumber.exec(sub))) {
                i += foundNumber[0].length - 1;
                sub = part.substring(i).toString();
            }
            else if (lastChar != char) {
                let found = null;
                if (char === ';' || (insertedSemis[i + part.start] && !isStart && !lastInertedSemi)) {
                    if (hasSemiTest) {
                        found = [';'];
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
restOfExp.next = ['splitter', 'expEnd', 'inlineIf'];
const startingExecpted = [
    'initialize',
    'expSingle',
    'expFunction',
    'value',
    'modifier',
    'prop',
    'incrementerBefore',
    'expEnd',
];
const setLispType = (types, fn) => {
    types.forEach((type) => {
        lispTypes.set(type, fn);
    });
};
const closingsCreate = {
    createArray: /^\]/,
    createObject: /^\}/,
    group: /^\)/,
    arrayProp: /^\]/,
    call: /^\)/,
};
const typesCreate = {
    createArray: 12 /* LispType.CreateArray */,
    createObject: 22 /* LispType.CreateObject */,
    group: 23 /* LispType.Group */,
    arrayProp: 19 /* LispType.ArrayProp */,
    call: 5 /* LispType.Call */,
    prop: 1 /* LispType.Prop */,
    '?prop': 20 /* LispType.PropOptional */,
    '?call': 21 /* LispType.CallOptional */,
};
setLispType(['createArray', 'createObject', 'group', 'arrayProp', 'call'], (constants, type, part, res, expect, ctx) => {
    let extract = emptyString;
    const arg = [];
    let end = false;
    let i = res[0].length;
    const start = i;
    while (i < part.length && !end) {
        extract = restOfExp(constants, part.substring(i), [closingsCreate[type], /^,/]);
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
                    value = lispify(constants, new utils.CodeString('function ' + str.toString().replace(key, '')));
                }
                else {
                    const extract = restOfExp(constants, str, [/^:/]);
                    key = lispify(constants, extract, [...next, 'spreadObject']);
                    if (key[0] === 1 /* LispType.Prop */) {
                        key = key[2];
                    }
                    value = lispify(constants, str.substring(extract.length + 1));
                }
                return createLisp({
                    op: 6 /* LispType.KeyVal */,
                    a: key,
                    b: value,
                });
            });
            break;
    }
    const lisptype = (type === 'arrayProp'
        ? res[1]
            ? 20 /* LispType.PropOptional */
            : 1 /* LispType.Prop */
        : type === 'call'
            ? res[1]
                ? 21 /* LispType.CallOptional */
                : 5 /* LispType.Call */
            : typesCreate[type]);
    ctx.lispTree = lispify(constants, part.substring(i + 1), expectTypes[expect].next, createLisp({
        op: lisptype,
        a: ctx.lispTree,
        b: l,
    }));
});
const modifierTypes = {
    inverse: 64 /* LispType.Inverse */,
    not: 24 /* LispType.Not */,
    positive: 59 /* LispType.Positive */,
    negative: 58 /* LispType.Negative */,
    typeof: 60 /* LispType.Typeof */,
    delete: 61 /* LispType.Delete */,
};
setLispType(['inverse', 'not', 'negative', 'positive', 'typeof', 'delete'], (constants, type, part, res, expect, ctx) => {
    const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
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
    '$--': 28 /* LispType.DecrementAfter */,
};
setLispType(['incrementerBefore'], (constants, type, part, res, expect, ctx) => {
    const extract = restOfExp(constants, part.substring(2), [/^[^\s.\w$]/]);
    ctx.lispTree = lispify(constants, part.substring(extract.length + 2), restOfExp.next, createLisp({
        op: incrementTypes[res[0] + '$'],
        a: lispify(constants, extract, expectTypes[expect].next),
        b: 0 /* LispType.None */,
    }));
});
setLispType(['incrementerAfter'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
        op: incrementTypes['$' + res[0]],
        a: ctx.lispTree,
        b: 0 /* LispType.None */,
    }));
});
const adderTypes = {
    '&&': 29 /* LispType.And */,
    '||': 30 /* LispType.Or */,
    instanceof: 62 /* LispType.Instanceof */,
    in: 63 /* LispType.In */,
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
        b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next),
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
    const next = [expectTypes.inlineIf.types.inlineIf, inlineIfElse];
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
    const extract = restOfExp(constants, part.substring(res[0].length), next);
    ctx.lispTree = lispify(constants, part.substring(extract.length + res[0].length), restOfExp.next, createLisp({
        op: opTypes[res[0]],
        a: ctx.lispTree,
        b: lispify(constants, extract, expectTypes[expect].next),
    }));
});
setLispType(['inlineIf'], (constants, type, part, res, expect, ctx) => {
    let found = false;
    const extract = part.substring(0, 0);
    let quoteCount = 1;
    while (!found && extract.length < part.length) {
        extract.end = restOfExp(constants, part.substring(extract.length + 1), [
            expectTypes.inlineIf.types.inlineIf,
            inlineIfElse,
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
            b: lispifyExpr(constants, part.substring(res[0].length + extract.length + 1)),
        }),
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
    while ((found = restOfExp(constants, part.substring(found.end - part.start), [elseIf, ifElse, semiColon], undefined, undefined, undefined, details)).length ||
        first) {
        first = false;
        const f = part.substring(found.end - part.start).toString();
        if (f.startsWith('if')) {
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
        else if ((elseReg = /^;?\s*else(?![\w$])/.exec(f))) {
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
            const ie = extractIfElse(constants, part.substring(found.end - part.start + (/^;?\s*else(?![\w$])/.exec(f)?.[0].length || 0)));
            foundElse = ie.all;
            break;
        }
        details = {};
    }
    foundTrue = foundTrue || part.substring(0, found.end - part.start);
    return {
        all: part.substring(0, Math.max(foundTrue.end, foundElse.end) - part.start),
        true: foundTrue,
        false: foundElse,
    };
}
setLispType(['if'], (constants, type, part, res, expect, ctx) => {
    let condition = restOfExp(constants, part.substring(res[0].length), [], '(');
    const ie = extractIfElse(constants, part.substring(res[1].length));
    const startTrue = res[0].length - res[1].length + condition.length + 1;
    let trueBlock = ie.true.substring(startTrue);
    let elseBlock = ie.false;
    condition = condition.trim();
    trueBlock = trueBlock.trim();
    elseBlock = elseBlock.trim();
    if (trueBlock.char(0) === '{')
        trueBlock = trueBlock.slice(1, -1);
    if (elseBlock.char(0) === '{')
        elseBlock = elseBlock.slice(1, -1);
    ctx.lispTree = createLisp({
        op: 13 /* LispType.If */,
        a: lispifyExpr(constants, condition),
        b: createLisp({
            op: 14 /* LispType.IfCase */,
            a: lispifyBlock(trueBlock, constants),
            b: lispifyBlock(elseBlock, constants),
        }),
    });
});
setLispType(['switch'], (constants, type, part, res, expect, ctx) => {
    const test = restOfExp(constants, part.substring(res[0].length), [], '(');
    let start = part.toString().indexOf('{', res[0].length + test.length + 1);
    if (start === -1)
        throw new SyntaxError('Invalid switch');
    let statement = insertSemicolons(constants, restOfExp(constants, part.substring(start + 1), [], '{'));
    let caseFound;
    const caseTest = /^\s*(case\s|default)\s*/;
    const cases = [];
    let defaultFound = false;
    while ((caseFound = caseTest.exec(statement.toString()))) {
        if (caseFound[1] === 'default') {
            if (defaultFound)
                throw new SyntaxError('Only one default switch case allowed');
            defaultFound = true;
        }
        const cond = restOfExp(constants, statement.substring(caseFound[0].length), [/^:/]);
        let found = emptyString;
        let i = (start = caseFound[0].length + cond.length + 1);
        const bracketFound = /^\s*\{/.exec(statement.substring(i).toString());
        let exprs = [];
        if (bracketFound) {
            i += bracketFound[0].length;
            found = restOfExp(constants, statement.substring(i), [], '{');
            i += found.length + 1;
            exprs = lispifyBlock(found, constants);
        }
        else {
            const notEmpty = restOfExp(constants, statement.substring(i), [caseTest]);
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
            a: caseFound[1] === 'default' ? 0 /* LispType.None */ : lispifyExpr(constants, cond),
            b: exprs,
        }));
    }
    ctx.lispTree = createLisp({
        op: 40 /* LispType.Switch */,
        a: lispifyExpr(constants, test),
        b: cases,
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
        const matches = part.substring(res[0].length).toString().match(expectTypes.prop.types.prop);
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
        b: prop,
    }));
});
setLispType(['spreadArray', 'spreadObject'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: type === 'spreadArray' ? 18 /* LispType.SpreadArray */ : 17 /* LispType.SpreadObject */,
        a: 0 /* LispType.None */,
        b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next),
    });
});
setLispType(['return', 'throw'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: type === 'return' ? 8 /* LispType.Return */ : 46 /* LispType.Throw */,
        a: 0 /* LispType.None */,
        b: lispifyExpr(constants, part.substring(res[0].length)),
    });
});
setLispType(['number', 'boolean', 'null', 'und', 'NaN', 'Infinity'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
        op: type === 'number' ? (res[10] ? 83 /* LispType.BigInt */ : 7 /* LispType.Number */) : 35 /* LispType.GlobalSymbol */,
        a: 0 /* LispType.None */,
        b: res[10] ? res[1] : res[0],
    }));
});
setLispType(['string', 'literal', 'regex'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = lispify(constants, part.substring(res[0].length), expectTypes[expect].next, createLisp({
        op: type === 'string'
            ? 2 /* LispType.StringIndex */
            : type === 'literal'
                ? 84 /* LispType.LiteralIndex */
                : 85 /* LispType.RegexIndex */,
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
            b: 0 /* LispType.None */,
        }));
    }
    else {
        ctx.lispTree = createLisp({
            op: lt,
            a: res[2],
            b: lispify(constants, part.substring(res[0].length), expectTypes[expect].next),
        });
    }
});
setLispType(['function', 'inlineFunction', 'arrowFunction', 'arrowFunctionSingle'], (constants, type, part, res, expect, ctx) => {
    const isArrow = type !== 'function' && type !== 'inlineFunction';
    const isReturn = isArrow && !res[res.length - 1];
    const argPos = isArrow ? 2 : 3;
    const isAsync = res[1] ? 88 /* LispType.True */ : 0 /* LispType.None */;
    const args = res[argPos] ? res[argPos].replace(/\s+/g, '').split(/,/g) : [];
    if (!isArrow) {
        args.unshift((res[2] || '').trimStart());
    }
    let ended = false;
    args.forEach((arg) => {
        if (ended)
            throw new SyntaxError('Rest parameter must be last formal parameter');
        if (arg.startsWith('...'))
            ended = true;
    });
    const f = restOfExp(constants, part.substring(res[0].length), !isReturn ? [/^}/] : [/^[,)}\]]/, semiColon]);
    const func = isReturn ? 'return ' + f : f.toString();
    ctx.lispTree = lispify(constants, part.substring(res[0].length + func.length + 1), expectTypes[expect].next, createLisp({
        op: isArrow
            ? 11 /* LispType.ArrowFunction */
            : type === 'function'
                ? 37 /* LispType.Function */
                : 10 /* LispType.InlineFunction */,
        a: [isAsync, ...args],
        b: constants.eager ? lispifyFunction(new utils.CodeString(func), constants) : func,
    }));
});
const iteratorRegex = /^((let|var|const)\s+)?\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s+(in|of)(?![\w$])/;
setLispType(['for', 'do', 'while'], (constants, type, part, res, expect, ctx) => {
    let i = 0;
    let startStep = 88 /* LispType.True */;
    let startInternal = [];
    let getIterator = 0 /* LispType.None */;
    let beforeStep = 0 /* LispType.None */;
    let checkFirst = 88 /* LispType.True */;
    let condition;
    let step = 88 /* LispType.True */;
    let body;
    switch (type) {
        case 'while': {
            i = part.toString().indexOf('(') + 1;
            const extract = restOfExp(constants, part.substring(i), [], '(');
            condition = lispifyReturnExpr(constants, extract);
            body = restOfExp(constants, part.substring(i + extract.length + 1)).trim();
            if (body.char(0) === '{')
                body = body.slice(1, -1);
            break;
        }
        case 'for': {
            i = part.toString().indexOf('(') + 1;
            const args = [];
            let extract2 = emptyString;
            for (let k = 0; k < 3; k++) {
                extract2 = restOfExp(constants, part.substring(i), [/^[;)]/]);
                args.push(extract2.trim());
                i += extract2.length + 1;
                if (part.char(i - 1) === ')')
                    break;
            }
            let iterator;
            if (args.length === 1 && (iterator = iteratorRegex.exec(args[0].toString()))) {
                if (iterator[4] === 'of') {
                    (getIterator = lispifyReturnExpr(constants, args[0].substring(iterator[0].length))),
                        (startInternal = [ofStart2, ofStart3]);
                    condition = ofCondition;
                    step = ofStep;
                    beforeStep = lispify(constants, new utils.CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$next.value'), ['initialize']);
                }
                else {
                    (getIterator = lispifyReturnExpr(constants, args[0].substring(iterator[0].length))),
                        (startInternal = [inStart2, inStart3]);
                    step = inStep;
                    condition = inCondition;
                    beforeStep = lispify(constants, new utils.CodeString((iterator[1] || 'let ') + iterator[3] + ' = $$keys[$$keyIndex]'), ['initialize']);
                }
            }
            else if (args.length === 3) {
                startStep = lispifyExpr(constants, args.shift(), startingExecpted);
                condition = lispifyReturnExpr(constants, args.shift());
                step = lispifyExpr(constants, args.shift());
            }
            else {
                throw new SyntaxError('Invalid for loop definition');
            }
            body = restOfExp(constants, part.substring(i)).trim();
            if (body.char(0) === '{')
                body = body.slice(1, -1);
            break;
        }
        case 'do': {
            checkFirst = 0 /* LispType.None */;
            const isBlock = !!res[3];
            body = restOfExp(constants, part.substring(res[0].length), isBlock ? [/^\}/] : [semiColon]);
            condition = lispifyReturnExpr(constants, restOfExp(constants, part.substring(part.toString().indexOf('(', res[0].length + body.length) + 1), [], '('));
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
    ];
    ctx.lispTree = createLisp({
        op: 38 /* LispType.Loop */,
        a,
        b: lispifyBlock(body, constants),
    });
});
setLispType(['block'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: 42 /* LispType.Block */,
        a: lispifyBlock(restOfExp(constants, part.substring(1), [], '{'), constants),
        b: 0 /* LispType.None */,
    });
});
setLispType(['loopAction'], (constants, type, part, res, expect, ctx) => {
    ctx.lispTree = createLisp({
        op: 86 /* LispType.LoopAction */,
        a: res[1],
        b: 0 /* LispType.None */,
    });
});
const catchReg = /^\s*(catch\s*(\(\s*([a-zA-Z$_][a-zA-Z\d$_]*)\s*\))?|finally)\s*\{/;
setLispType(['try'], (constants, type, part, res, expect, ctx) => {
    const body = restOfExp(constants, part.substring(res[0].length), [], '{');
    let catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
    let finallyBody;
    let exception = '';
    let catchBody;
    let offset = 0;
    if (catchRes[1].startsWith('catch')) {
        catchRes = catchReg.exec(part.substring(res[0].length + body.length + 1).toString());
        exception = catchRes[2];
        catchBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], '{');
        offset = res[0].length + body.length + 1 + catchRes[0].length + catchBody.length + 1;
        if ((catchRes = catchReg.exec(part.substring(offset).toString())) &&
            catchRes[1].startsWith('finally')) {
            finallyBody = restOfExp(constants, part.substring(offset + catchRes[0].length), [], '{');
        }
    }
    else {
        finallyBody = restOfExp(constants, part.substring(res[0].length + body.length + 1 + catchRes[0].length), [], '{');
    }
    const b = [
        exception,
        lispifyBlock(insertSemicolons(constants, catchBody || emptyString), constants),
        lispifyBlock(insertSemicolons(constants, finallyBody || emptyString), constants),
    ];
    ctx.lispTree = createLisp({
        op: 39 /* LispType.Try */,
        a: lispifyBlock(insertSemicolons(constants, body), constants),
        b,
    });
});
setLispType(['void', 'await'], (constants, type, part, res, expect, ctx) => {
    const extract = restOfExp(constants, part.substring(res[0].length), [/^([^\s.?\w$]|\?[^.])/]);
    ctx.lispTree = lispify(constants, part.substring(res[0].length + extract.length), expectTypes[expect].next, createLisp({
        op: type === 'void' ? 87 /* LispType.Void */ : 44 /* LispType.Await */,
        a: lispify(constants, extract),
        b: 0 /* LispType.None */,
    }));
});
setLispType(['new'], (constants, type, part, res, expect, ctx) => {
    let i = res[0].length;
    const obj = restOfExp(constants, part.substring(i), [], undefined, '(');
    i += obj.length + 1;
    const args = [];
    if (part.char(i - 1) === '(') {
        const argsString = restOfExp(constants, part.substring(i), [], '(');
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
const ofStart2 = lispify(undefined, new utils.CodeString('let $$iterator = $$obj[Symbol.iterator]()'), ['initialize']);
const ofStart3 = lispify(undefined, new utils.CodeString('let $$next = $$iterator.next()'), [
    'initialize',
]);
const ofCondition = lispify(undefined, new utils.CodeString('return !$$next.done'), [
    'initialize',
]);
const ofStep = lispify(undefined, new utils.CodeString('$$next = $$iterator.next()'));
const inStart2 = lispify(undefined, new utils.CodeString('let $$keys = Object.keys($$obj)'), [
    'initialize',
]);
const inStart3 = lispify(undefined, new utils.CodeString('let $$keyIndex = 0'), ['initialize']);
const inStep = lispify(undefined, new utils.CodeString('$$keyIndex++'));
const inCondition = lispify(undefined, new utils.CodeString('return $$keyIndex < $$keys.length'), [
    'initialize',
]);
function lispify(constants, part, expected, lispTree, topLevel = false) {
    lispTree = lispTree || NullLisp;
    expected = expected || expectTypes.initialize.next;
    if (part === undefined)
        return lispTree;
    part = part.trimStart();
    const str = part.toString();
    if (!part.length && !expected.includes('expEnd')) {
        throw new SyntaxError('Unexpected end of expression');
    }
    if (!part.length)
        return lispTree;
    const ctx = { lispTree: lispTree };
    let res;
    for (const expect of expected) {
        if (expect === 'expEnd') {
            continue;
        }
        for (const type in expectTypes[expect].types) {
            if (type === 'expEnd') {
                continue;
            }
            if ((res = expectTypes[expect].types[type].exec(str))) {
                lastType = type;
                try {
                    lispTypes.get(type)?.(constants, type, part, res, expect, ctx);
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
        return NullLisp;
    const subExpressions = [];
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
        const defined = expectTypes.initialize.types.initialize.exec(subExpressions[0].toString());
        if (defined) {
            return createLisp({
                op: 42 /* LispType.Block */,
                a: subExpressions.map((str, i) => lispify(constants, i ? new utils.CodeString(defined[1] + ' ' + str) : str, ['initialize'], undefined, true)),
                b: 0 /* LispType.None */,
            });
        }
        else if (expectTypes.initialize.types.return.exec(subExpressions[0].toString())) {
            return lispify(constants, str, expected, undefined, true);
        }
    }
    const exprs = subExpressions.map((str) => lispify(constants, str, expected, undefined, true));
    return createLisp({ op: 43 /* LispType.Expression */, a: exprs, b: 0 /* LispType.None */ });
}
function lispifyReturnExpr(constants, str) {
    return createLisp({
        op: 8 /* LispType.Return */,
        a: 0 /* LispType.None */,
        b: lispifyExpr(constants, str),
    });
}
function lispifyBlock(str, constants, expression = false) {
    str = insertSemicolons(constants, str);
    if (!str.trim().length)
        return [];
    const parts = [];
    let part;
    let pos = 0;
    let start = 0;
    let details = {};
    let skipped = false;
    let isInserted = false;
    while ((part = restOfExp(constants, str.substring(pos), [semiColon], undefined, undefined, undefined, details)).length) {
        isInserted = !!(str.char(pos + part.length) && str.char(pos + part.length) !== ';');
        pos += part.length + (isInserted ? 0 : 1);
        if (/^\s*else(?![\w$])/.test(str.substring(pos).toString())) {
            skipped = true;
        }
        else if (details['words']?.includes('do') &&
            /^\s*while(?![\w$])/.test(str.substring(pos).toString())) {
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
    return parts
        .map((str) => str.trimStart())
        .filter((str) => str.length)
        .map((str) => {
        return lispifyExpr(constants, str.trimStart(), startingExecpted);
    });
}
function lispifyFunction(str, constants, expression = false) {
    if (!str.trim().length)
        return [];
    const tree = lispifyBlock(str, constants, expression);
    const hoisted = [];
    hoist(tree, hoisted);
    return hoisted.concat(tree);
}
function hoist(item, res) {
    if (utils.isLisp(item)) {
        if (!utils.isLisp(item))
            return false;
        const [op, a, b] = item;
        if (op === 39 /* LispType.Try */ ||
            op === 13 /* LispType.If */ ||
            op === 38 /* LispType.Loop */ ||
            op === 40 /* LispType.Switch */) {
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
        for (const it of item) {
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
const closingsNoInsertion = /^(\})\s*(catch|finally|else|while|instanceof)(?![\w$])/;
//  \w|)|] \n \w = 2                                  // \} \w|\{ = 5
const colonsRegex = /^((([\w$\])"'`]|\+\+|--)\s*\r?\n\s*([\w$+\-!~]))|(\}\s*[\w$!~+\-{("'`]))/;
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
            edge = details.regRes[3] === '++' || details.regRes[3] === '--' ? sub.length + 1 : sub.length;
            part = rest.substring(0, edge);
            if (b) {
                const res = closingsNoInsertion.exec(rest.substring(sub.length - 1).toString());
                if (res) {
                    if (res[2] === 'while') {
                        valid = details.lastWord !== 'do';
                    }
                    else {
                        valid = false;
                    }
                }
                else if (details.lastWord === 'function' &&
                    details.regRes[5][0] === '}' &&
                    details.regRes[5].slice(-1) === '(') {
                    valid = false;
                }
            }
            else if (a) {
                if (details.lastWord === 'if' ||
                    details.lastWord === 'while' ||
                    details.lastWord === 'for' ||
                    details.lastWord === 'else') {
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
        done = str[i] === '/' && !escape;
        escape = str[i] === '\\' && !escape;
        cancel = str[i] === '\n';
        i++;
    }
    const after = str.substring(i);
    cancel = cancel || !done || /^\s*\d/.test(after);
    if (cancel)
        return null;
    const flags = /^[a-z]*/.exec(after);
    if (/^\s+[\w$]/.test(str.substring(i + flags[0].length))) {
        return null;
    }
    return {
        regex: str.substring(1, i - 1),
        flags: (flags && flags[0]) || '',
        length: i + ((flags && flags[0].length) || 0),
    };
}
const notDivide = /(typeof|delete|instanceof|return|in|of|throw|new|void|do|if)$/;
const possibleDivide = /^([\w$\])]|\+\+|--)[\s/]/;
function extractConstants(constants, str, currentEnclosure = '') {
    let quote;
    let extract = [];
    let escape = false;
    let regexFound;
    let comment = '';
    let commentStart = -1;
    let currJs = [];
    let char = '';
    const strRes = [];
    const enclosures = [];
    let isPossibleDivide = null;
    let i = 0;
    for (i = 0; i < str.length; i++) {
        char = str[i];
        if (comment) {
            if (char === comment) {
                if (comment === '*' && str[i + 1] === '/') {
                    comment = '';
                    i++;
                }
                else if (comment === '\n') {
                    comment = '';
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
                if (quote === '`' && char === '$' && str[i + 1] === '{') {
                    const skip = extractConstants(constants, str.substring(i + 2), '{');
                    currJs.push(skip.str);
                    extract.push('${', currJs.length - 1, `}`);
                    i += skip.length + 2;
                }
                else if (quote === char) {
                    if (quote === '`') {
                        const li = createLisp({
                            op: 36 /* LispType.Literal */,
                            a: unraw(extract.join('')),
                            b: [],
                        });
                        li.tempJsStrings = currJs;
                        constants.literals.push(li);
                        strRes.push(`\``, constants.literals.length - 1, `\``);
                    }
                    else {
                        constants.strings.push(unraw(extract.join('')));
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
                if (char === "'" || char === '"' || char === '`') {
                    currJs = [];
                    quote = char;
                }
                else if (closings[currentEnclosure] === char && !enclosures.length) {
                    return { str: strRes.join(''), length: i };
                }
                else if (closings[char]) {
                    enclosures.push(char);
                    strRes.push(char);
                }
                else if (closings[enclosures[enclosures.length - 1]] === char) {
                    enclosures.pop();
                    strRes.push(char);
                }
                else if (char === '/' && (str[i + 1] === '*' || str[i + 1] === '/')) {
                    comment = str[i + 1] === '*' ? '*' : '\n';
                    commentStart = i;
                }
                else if (char === '/' &&
                    !isPossibleDivide &&
                    (regexFound = checkRegex(str.substring(i)))) {
                    constants.regexes.push(regexFound);
                    strRes.push(`/`, constants.regexes.length - 1, `/r`);
                    i += regexFound.length - 1;
                }
                else {
                    strRes.push(char);
                }
                if (!isPossibleDivide || !space.test(char)) {
                    if ((isPossibleDivide = possibleDivide.exec(str.substring(i)))) {
                        if (notDivide.test(str.substring(0, i + isPossibleDivide[1].length))) {
                            isPossibleDivide = null;
                        }
                    }
                }
            }
            escape = !!(quote && char === '\\');
        }
    }
    if (comment) {
        if (comment === '*') {
            throw new SyntaxError(`Unclosed comment '/*': ${str.substring(commentStart)}`);
        }
    }
    return { str: strRes.join(''), length: i };
}
function parse(code, eager = false, expression = false) {
    if (typeof code !== 'string')
        throw new ParseError(`Cannot parse ${code}`, code);
    let str = ' ' + code;
    const constants = { strings: [], literals: [], regexes: [], eager };
    str = extractConstants(constants, str).str;
    for (const l of constants.literals) {
        l[2] = l.tempJsStrings.map((js) => lispifyExpr(constants, new utils.CodeString(js)));
        delete l.tempJsStrings;
    }
    return { tree: lispifyFunction(new utils.CodeString(str), constants, expression), constants };
}

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
