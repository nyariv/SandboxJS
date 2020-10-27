
/**
 * @file **unraw - errors.ts** | Error messages used by `unraw`.
 * @author Ian Sanders
 * @copyright 2019 Ian Sanders
 * @license MIT
 */

// NOTE: don't construct errors here or they'll have the wrong stack trace.
// NOTE: don't make custom error class; the JS engines use `SyntaxError`

/**
 * Keys for possible error messages used by `unraw`.
 * Note: These do _not_ map to actual error object types. All errors thrown
 * are `SyntaxError`.
 */
// Don't use const enum or JS users won't be able to access the enum values
export enum ErrorType {
  /**
   * Thrown when a badly formed Unicode escape sequence is found. Possible
   * reasons include the code being too short (`"\u25"`) or having invalid
   * characters (`"\u2$A5"`).
   */
  MalformedUnicode = "MALFORMED_UNICODE",
  /**
   * Thrown when a badly formed hexadecimal escape sequence is found. Possible
   * reasons include the code being too short (`"\x2"`) or having invalid
   * characters (`"\x2$"`).
   */
  MalformedHexadecimal = "MALFORMED_HEXADECIMAL",
  /**
   * Thrown when a Unicode code point escape sequence has too high of a code
   * point. The maximum code point allowed is `\u{10FFFF}`, so `\u{110000}` and
   * higher will throw this error.
   */
  CodePointLimit = "CODE_POINT_LIMIT",
  /**
   * Thrown when an octal escape sequences is encountered and `allowOctals` is
   * `false`. For example, `unraw("\234", false)`.
   */
  OctalDeprecation = "OCTAL_DEPRECATION",
  /**
   * Thrown only when a single backslash is found at the end of a string. For
   * example, `"\\"` or `"test\\x24\\"`.
   */
  EndOfString = "END_OF_STRING"
}

/** Map of error message names to the full text of the message. */
export const errorMessages: Readonly<Map<ErrorType, string>> = new Map([
  [ErrorType.MalformedUnicode, "malformed Unicode character escape sequence"],
  [
    ErrorType.MalformedHexadecimal,
    "malformed hexadecimal character escape sequence"
  ],
  [
    ErrorType.CodePointLimit,
    "Unicode codepoint must not be greater than 0x10FFFF in escape sequence"
  ],
  [
    ErrorType.OctalDeprecation,
    '"0"-prefixed octal literals and octal escape sequences are deprecated; ' +
      'for octal literals use the "0o" prefix instead'
  ],
  [ErrorType.EndOfString, "malformed escape sequence at end of string"]
]);