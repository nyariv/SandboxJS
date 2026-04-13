import Sandbox from '../../src/Sandbox.js';

describe('string method ticks', () => {
  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({ executionQuota: quota, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  describe('O(1) — charAt, charCodeAt, codePointAt, at', () => {
    it('charAt does not halt on a long string (always 1 tick)', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.charAt(0)', 50n, { s })).toBe(false);
    });

    it('charCodeAt does not halt on a long string (always 1 tick)', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.charCodeAt(0)', 50n, { s })).toBe(false);
    });

    it('at does not halt on a long string (always 1 tick)', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.at(0)', 50n, { s })).toBe(false);
    });

    it('O(1) does not halt at quota that halts O(n) on same string', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.indexOf("z")', 50n, { s })).toBe(true);
      expect(haltsWithQuota('return s.charAt(0)', 50n, { s })).toBe(false);
    });
  });

  describe('O(n) — indexOf, includes, slice, split, replace, trim, etc.', () => {
    it('does not halt on a short string within quota', () => {
      expect(haltsWithQuota('return s.indexOf("z")', 100n, { s: 'hello' })).toBe(false);
    });

    it('indexOf halts on a long string exceeding quota', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.indexOf("z")', 10n, { s })).toBe(true);
    });

    it('includes halts on a long string', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.includes("z")', 10n, { s })).toBe(true);
    });

    it('slice halts on a long string', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.slice(0)', 10n, { s })).toBe(true);
    });

    it('split halts on a long string', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.split("")', 10n, { s })).toBe(true);
    });

    it('replace halts on a long string', () => {
      const s = 'a'.repeat(200);
      expect(haltsWithQuota('return s.replace("b", "c")', 10n, { s })).toBe(true);
    });

    it('toLowerCase halts on a long string', () => {
      const s = 'A'.repeat(200);
      expect(haltsWithQuota('return s.toLowerCase()', 10n, { s })).toBe(true);
    });

    it('trim halts on a long string', () => {
      const s = ' '.repeat(200);
      expect(haltsWithQuota('return s.trim()', 10n, { s })).toBe(true);
    });
  });
});

describe('string concatenation ticks (+ operator)', () => {
  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({ executionQuota: quota, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  it('string + string halts when result is long', () => {
    const a = 'x'.repeat(100);
    const b = 'y'.repeat(100);
    expect(haltsWithQuota('return a + b', 10n, { a, b })).toBe(true);
  });

  it('string + string does not halt when result is short', () => {
    expect(haltsWithQuota('return a + b', 100n, { a: 'hi', b: ' there' })).toBe(false);
  });

  it('string + number halts when result is long', () => {
    const a = 'x'.repeat(200);
    expect(haltsWithQuota('return a + 42', 10n, { a })).toBe(true);
  });

  it('number + string halts when result is long', () => {
    const b = 'x'.repeat(200);
    expect(haltsWithQuota('return 42 + b', 10n, { b })).toBe(true);
  });

  it('number + number does not charge string ticks', () => {
    expect(haltsWithQuota('return 1 + 2', 5n)).toBe(false);
  });

  it('chained concatenation accumulates ticks', () => {
    const s = 'x'.repeat(50);
    expect(haltsWithQuota('return s + s + s + s', 10n, { s })).toBe(true);
  });

  it('empty string + empty string does not halt', () => {
    expect(haltsWithQuota('return "" + ""', 50n)).toBe(false);
  });

  it('string literal + string literal halts when combined result is long', () => {
    const a = 'a'.repeat(100);
    const b = 'b'.repeat(100);
    expect(haltsWithQuota('return a + b', 10n, { a, b })).toBe(true);
  });
});

describe('string += ticks (AddEquals operator)', () => {
  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({ executionQuota: quota, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  it('+= on string halts when result is long', () => {
    const s = 'x'.repeat(100);
    expect(haltsWithQuota('let r = s; r += s; return r', 10n, { s })).toBe(true);
  });

  it('+= on string does not halt when result is short', () => {
    expect(haltsWithQuota('let r = "hi"; r += " there"; return r', 100n)).toBe(false);
  });

  it('+= on number does not charge string ticks', () => {
    expect(haltsWithQuota('let n = 1; n += 2; return n', 50n)).toBe(false);
  });

  it('+= string appended multiple times accumulates ticks', () => {
    const s = 'x'.repeat(40);
    // first += produces 80-char string, second produces 120-char — should halt early
    expect(haltsWithQuota('let r = s; r += s; r += s; return r', 10n, { s })).toBe(true);
  });

  it('+= number to string halts when result is long', () => {
    const s = 'x'.repeat(200);
    expect(haltsWithQuota('let r = s; r += 1; return r', 10n, { s })).toBe(true);
  });

  it('+= string to number coerces and halts when result is long', () => {
    const s = 'x'.repeat(200);
    expect(haltsWithQuota('let r = 1; r += s; return r', 10n, { s })).toBe(true);
  });
});

describe('template literal ticks', () => {
  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({ executionQuota: quota, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  it('template literal halts when result is long', () => {
    const s = 'x'.repeat(200);
    expect(haltsWithQuota('return `prefix_${s}`', 10n, { s })).toBe(true);
  });

  it('template literal does not halt when result is short', () => {
    expect(haltsWithQuota('return `hello ${"world"}`', 100n)).toBe(false);
  });

  it('template literal with large interpolated value halts', () => {
    const val = 'a'.repeat(200);
    expect(haltsWithQuota('return `${val}`', 10n, { val })).toBe(true);
  });

  it('template literal with no interpolation does not halt for short string', () => {
    expect(haltsWithQuota('return `hello world`', 100n)).toBe(false);
  });

  it('template literal with multiple interpolations halts when total is long', () => {
    const a = 'x'.repeat(100);
    const b = 'y'.repeat(100);
    expect(haltsWithQuota('return `${a}${b}`', 10n, { a, b })).toBe(true);
  });

  it('template literal with multiple interpolations does not halt when total is short', () => {
    expect(haltsWithQuota('return `${"hi"} ${"there"}`', 100n)).toBe(false);
  });

  it('template literal with number interpolation does not halt when short', () => {
    expect(haltsWithQuota('return `value: ${42}`', 100n)).toBe(false);
  });
});

describe('String() cast ticks', () => {
  function haltsWithQuota(
    code: string,
    quota: bigint,
    scope: Record<string, unknown> = {},
  ): boolean {
    const sandbox = new Sandbox({ executionQuota: quota, haltOnSandboxError: true });
    let halted = false;
    sandbox.subscribeHalt(() => {
      halted = true;
    });
    sandbox.compile(code)(scope).run();
    return halted;
  }

  it('String(s) halts when s is a long string', () => {
    const s = 'x'.repeat(200);
    expect(haltsWithQuota('return String(s)', 10n, { s })).toBe(true);
  });

  it('String(s) does not halt when s is a short string', () => {
    expect(haltsWithQuota('return String(s)', 100n, { s: 'hello' })).toBe(false);
  });

  it('String(n) does not halt for small number', () => {
    expect(haltsWithQuota('return String(42)', 50n)).toBe(false);
  });

  it('String(true) does not halt (result is 4 chars)', () => {
    expect(haltsWithQuota('return String(true)', 50n)).toBe(false);
  });

  it('String(null) does not halt (result is 4 chars)', () => {
    expect(haltsWithQuota('return String(null)', 50n)).toBe(false);
  });

  it('String(undefined) does not halt (result is 9 chars)', () => {
    expect(haltsWithQuota('return String(undefined)', 50n)).toBe(false);
  });

  it('String(obj) with object whose toString returns long string halts', () => {
    const obj = { toString: () => 'x'.repeat(200) };
    expect(haltsWithQuota('return String(obj)', 10n, { obj })).toBe(true);
  });
});
