/**
 * Parse a string as a base-16 number. This is more strict than `parseInt` as it
 * will not allow any other characters, including (for example) "+", "-", and
 * ".".
 * @param hex A string containing a hexadecimal number.
 * @returns The parsed integer, or `NaN` if the string is not a valid hex
 * number.
 */
function parseHexToInt(hex: string): number {
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
function validateAndParseHex(hex: string, errorName: string, enforcedLength?: number): number {
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
function parseHexadecimalCode(code: string): string {
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
function parseUnicodeCode(code: string, surrogateCode?: string): string {
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
function isCurlyBraced(text: string): boolean {
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
function parseUnicodeCodePointCode(codePoint: string): string {
  if (!isCurlyBraced(codePoint)) {
    throw new SyntaxError('Malformed Unicode: +' + codePoint);
  }
  const withoutBraces = codePoint.slice(1, -1);
  const parsedCode = validateAndParseHex(withoutBraces, 'Malformed Unicode');

  try {
    return String.fromCodePoint(parsedCode);
  } catch (err) {
    throw err instanceof RangeError ? new SyntaxError('Code Point Limit:' + parsedCode) : err;
  }
}

/**
 * Map of unescaped letters to their corresponding special JS escape characters.
 * Intentionally does not include characters that map to themselves like "\'".
 */
const singleCharacterEscapes = new Map<string, string>([
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
function parseSingleCharacterCode(code: string): string {
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
const escapeMatch =
  /\\(?:(\\)|x([\s\S]{0,2})|u(\{[^}]*\}?)|u([\s\S]{4})\\u([^{][\s\S]{0,3})|u([\s\S]{0,4})|([0-3]?[0-7]{1,2})|([\s\S])|$)/g;

/**
 * Replace raw escape character strings with their escape characters.
 * @param raw A string where escape characters are represented as raw string
 * values like `\'` rather than `'`.
 * @param allowOctals If `true`, will process the now-deprecated octal escape
 * sequences (ie, `\111`).
 * @returns The processed string, with escape characters replaced by their
 * respective actual Unicode characters.
 */
export function unraw(raw: string): string {
  return raw.replace(
    escapeMatch,
    function (
      _,
      backslash?: string,
      hex?: string,
      codePoint?: string,
      unicodeWithSurrogate?: string,
      surrogate?: string,
      unicode?: string,
      octal?: string,
      singleCharacter?: string
    ): string {
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
    }
  );
}
export default unraw;
