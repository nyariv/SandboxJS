'use strict';
import Sandbox, { LocalScope } from '../src/Sandbox.js';

function createScope(vars: Record<string, unknown> = {}) {
  Object.setPrototypeOf(vars, LocalScope.prototype);
  return vars;
}

describe('SandboxSymbol', () => {
  it('keeps Symbol.for state local to the sandbox', () => {
    const sandbox = new Sandbox();
    const hostShared = Symbol.for('shared');

    const result = sandbox
      .compile(
        `
        const local = Symbol('secret');
        const shared = Symbol.for('shared');
        return {
          localType: typeof local,
          shared,
          sameWithinSandbox: shared === Symbol.for('shared'),
          sandboxKey: Symbol.keyFor(shared),
          hostKeyInsideSandbox: Symbol.keyFor(hostShared),
          equalsHostShared: shared === hostShared,
        };
      `,
        true,
      )(createScope({ hostShared }))
      .run() as {
      localType: string;
      shared: symbol;
      sameWithinSandbox: boolean;
      sandboxKey: string;
      hostKeyInsideSandbox: string | undefined;
      equalsHostShared: boolean;
    };

    expect(result.localType).toBe('symbol');
    expect(result.sameWithinSandbox).toBe(true);
    expect(result.sandboxKey).toBe('shared');
    expect(result.hostKeyInsideSandbox).toBeUndefined();
    expect(result.equalsHostShared).toBe(false);
    expect(Symbol.keyFor(result.shared)).toBeUndefined();
    expect(Symbol.keyFor(hostShared)).toBe('shared');
  });

  it('keeps well-known symbols native for iterator support', () => {
    const sandbox = new Sandbox();
    const result = sandbox
      .compile(
        `
        const iterable = {
          [Symbol.iterator]: function* () {
            yield 7;
          },
        };
        return [Symbol.iterator === hostIterator, [...iterable][0]];
      `,
        true,
      )(createScope({ hostIterator: Symbol.iterator }))
      .run();

    expect(result).toEqual([true, 7]);
  });

  it('exposes the default safe symbol allowlist', () => {
    const sandbox = new Sandbox();
    const result = sandbox
      .compile(
        `
        return [
          Symbol.iterator === hostIterator,
          Symbol.toStringTag === hostToStringTag,
          Symbol.custom,
        ];
      `,
        true,
      )(createScope({ hostIterator: Symbol.iterator, hostToStringTag: Symbol.toStringTag }))
      .run();

    expect(result).toEqual([true, true, undefined]);
  });

  it('allows custom whitelisted symbol statics', () => {
    const custom = Symbol.for('custom');
    const sandbox = new Sandbox({
      symbolWhitelist: {
        ...Sandbox.SAFE_SYMBOLS,
        custom,
      },
    });
    const result = sandbox
      .compile(
        `
        const sym = Symbol.for('custom');
        return [
          sym === hostCustom,
          sym === Symbol.for('custom'),
          typeof sym
        ];
      `,
        true,
      )(createScope({ hostCustom: custom }))
      .run();

    expect(result).toEqual([false, true, 'symbol']);
  });

  it('preserves sandbox symbol keys across spread and fromEntries', () => {
    const sandbox = new Sandbox();
    const result = sandbox
      .compile(
        `
        const local = Symbol('local');
        const viaSpread = { ...{ [local]: 3, a: 1 } };
        const shared = Symbol.for('shared');
        const viaEntries = Object.fromEntries([[shared, 5]]);
        return [
          viaSpread[local],
          viaSpread.hasOwnProperty(local),
          Object.keys(viaSpread),
          viaEntries[shared],
          viaEntries.hasOwnProperty(shared),
          Symbol.keyFor(shared),
        ];
      `,
        true,
      )()
      .run();

    expect(result).toEqual([3, true, ['a'], 5, true, 'shared']);
  });
});
