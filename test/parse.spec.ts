import { ParseError } from '../src/parser';
import Sandbox from '../src/Sandbox';

describe('Sandbox.parse() tests', () => {
  it('Sandbox.parse()', () => {
    const code = 'return 1 + 2;';
    const ast = Sandbox.parse(code);
    expect(ast).toBeDefined();
  });

  it('Sandbox.parse() with syntax error', () => {
    const code = 'return 1 + ;';
    expect(() => {
      Sandbox.parse(code);
    }).toThrow(ParseError);
  });
});
