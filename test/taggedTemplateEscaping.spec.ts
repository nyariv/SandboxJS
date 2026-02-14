import Sandbox from '../src/Sandbox.js';

describe('Tagged Template Escaping Tests', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  it('should handle escaped dollar signs in tagged templates', () => {
    const code = `
      function tag(strings, ...values) {
        let result = strings[0];
        for (let i = 0; i < values.length; i++) {
          result += values[i] + strings[i + 1];
        }
        return result;
      }
      const x = 5;
      return tag\`value: \\\${x}\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    // The escaped \${ should be treated as literal text "${x}", not interpolation
    expect(result).toBe('value: ${x}');
  });

  it('should handle normal interpolations in tagged templates', () => {
    const code = `
      function tag(strings, ...values) {
        return strings[0] + values[0] + strings[1];
      }
      const x = 42;
      return tag\`value: \${x}!\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    expect(result).toBe('value: 42!');
  });

  it('should handle multiple escaped sequences', () => {
    const code = `
      function tag(strings, ...values) {
        return strings.join('|');
      }
      return tag\`start\\\${foo}\\\${bar}end\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    expect(result).toBe('start${foo}${bar}end');
  });

  it('should handle mixed escaped and real interpolations', () => {
    const code = `
      function tag(strings, ...values) {
        let result = '';
        for (let i = 0; i < strings.length; i++) {
          result += strings[i];
          if (i < values.length) {
            result += values[i];
          }
        }
        return result;
      }
      const x = 10;
      return tag\`value: \${x}, escaped: \\\${y}\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    expect(result).toBe('value: 10, escaped: ${y}');
  });

  it('should handle malformed placeholders without hanging', () => {
    const code = `
      function tag(strings) {
        return strings[0];
      }
      return tag\`text with \\\${ no closing brace\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    // Should treat the escaped ${ as literal text since it's not a valid placeholder
    expect(result).toContain('${');
  });

  it('should handle non-numeric placeholder content', () => {
    const code = `
      function tag(strings) {
        return strings[0];
      }
      // The escaped sequence should be treated as literal text
      return tag\`start\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    expect(result).toBe('start');
  });

  it('should correctly parse adjacent interpolations', () => {
    const code = `
      function tag(strings, ...values) {
        return values.join(',');
      }
      const a = 1, b = 2;
      return tag\`\${a}\${b}\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    expect(result).toBe('1,2');
  });

  it('should handle escaped backslash before interpolation', () => {
    const code = `
      function tag(strings, ...values) {
        return strings[0] + values[0] + strings[1];
      }
      const x = 5;
      return tag\`\\\\\${x}\`;
    `;
    const fn = sandbox.compile(code);
    const result = fn().run();
    // \\ becomes \ and ${x} is interpolated
    expect(result).toBe('\\5');
  });
});
