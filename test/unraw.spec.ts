import { unraw } from '../src/unraw.js';

describe('unraw Tests', () => {
  describe('Basic escape sequences', () => {
    it('should handle single character escapes', () => {
      expect(unraw('\\n')).toBe('\n');
      expect(unraw('\\r')).toBe('\r');
      expect(unraw('\\t')).toBe('\t');
      expect(unraw('\\b')).toBe('\b');
      expect(unraw('\\f')).toBe('\f');
      expect(unraw('\\v')).toBe('\v');
    });

    it('should handle backslash escape', () => {
      expect(unraw('\\\\')).toBe('\\');
    });

    it('should handle quote escapes', () => {
      expect(unraw("\\\'")).toBe("'");
      expect(unraw('\\"')).toBe('"');
    });
  });

  describe('Hexadecimal escape sequences', () => {
    it('should handle valid hexadecimal escapes', () => {
      expect(unraw('\\x41')).toBe('A');
      expect(unraw('\\x42')).toBe('B');
      expect(unraw('\\x30')).toBe('0');
    });

    it('should throw error for invalid hexadecimal escapes', () => {
      expect(() => unraw('\\xGG')).toThrow(SyntaxError);
      expect(() => unraw('\\xGG')).toThrow('Malformed Hexadecimal');
    });

    it('should throw error for wrong length hexadecimal escapes', () => {
      expect(() => unraw('\\x1')).toThrow(SyntaxError);
      expect(() => unraw('\\x1')).toThrow('Malformed Hexadecimal');
    });
  });

  describe('Unicode escape sequences', () => {
    it('should handle valid 4-digit unicode escapes', () => {
      expect(unraw('\\u0041')).toBe('A');
      expect(unraw('\\u4E2D')).toBe('中');
    });

    it('should throw error for invalid unicode escapes', () => {
      expect(() => unraw('\\uGGGG')).toThrow(SyntaxError);
      expect(() => unraw('\\uGGGG')).toThrow('Malformed Unicode');
    });

    it('should throw error for wrong length unicode escapes', () => {
      expect(() => unraw('\\u041')).toThrow(SyntaxError);
      expect(() => unraw('\\u041')).toThrow('Malformed Unicode');
    });

    it('should handle unicode with surrogate pairs', () => {
      // Test surrogate pair for emoji
      expect(unraw('\\uD83D\\uDE00')).toBe('😀');
      expect(unraw('\\uD834\\uDD1E')).toBe('𝄞'); // Musical symbol
    });
  });

  describe('Unicode code point escape sequences', () => {
    it('should handle valid unicode code point escapes', () => {
      expect(unraw('\\u{41}')).toBe('A');
      expect(unraw('\\u{1F600}')).toBe('😀');
      expect(unraw('\\u{4E2D}')).toBe('中');
    });

    it('should throw error for malformed unicode code points (missing braces)', () => {
      expect(() => unraw('\\u{41')).toThrow(SyntaxError);
      expect(() => unraw('\\u{41')).toThrow('Malformed Unicode');
      expect(() => unraw('\\u41}')).toThrow(SyntaxError);
    });

    it('should throw error for invalid hex in unicode code points', () => {
      expect(() => unraw('\\u{GGGG}')).toThrow(SyntaxError);
      expect(() => unraw('\\u{GGGG}')).toThrow('Malformed Unicode');
    });

    it('should throw error for code points beyond limit', () => {
      // Test a code point beyond the valid range (> 0x10FFFF)
      expect(() => unraw('\\u{110000}')).toThrow(SyntaxError);
      expect(() => unraw('\\u{110000}')).toThrow('Code Point Limit');
    });
  });

  describe('Octal escape sequences', () => {
    it('should handle null character \\0', () => {
      expect(unraw('\\0')).toBe('\0');
    });

    it('should throw error for deprecated octal escapes', () => {
      expect(() => unraw('\\1')).toThrow(SyntaxError);
      expect(() => unraw('\\1')).toThrow('Octal Deprecation');
      expect(() => unraw('\\77')).toThrow(SyntaxError);
      expect(() => unraw('\\77')).toThrow('Octal Deprecation');
      expect(() => unraw('\\123')).toThrow(SyntaxError);
      expect(() => unraw('\\123')).toThrow('Octal Deprecation');
    });
  });

  describe('End of string handling', () => {
    it('should throw error for incomplete escape at end of string', () => {
      expect(() => unraw('\\')).toThrow(SyntaxError);
      expect(() => unraw('\\')).toThrow('End of string');
    });
  });

  describe('Complex strings', () => {
    it('should handle mixed escape sequences', () => {
      expect(unraw('Hello\\nWorld\\t!')).toBe('Hello\nWorld\t!');
      expect(unraw('\\x41\\u0042')).toBe('AB');
    });

    it('should handle strings with no escapes', () => {
      expect(unraw('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(unraw('')).toBe('');
    });
  });
});
