import { describe, expect, it } from 'vitest';
import { err, ok } from './result.js';

describe('Result helpers', () => {
  it('ok() produces a success result carrying its value', () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('err() produces a failure result carrying the violation', () => {
    const result = err({ type: 'NotYourTurn', currentPlayerId: 'p1' });
    expect(result).toEqual({ ok: false, error: { type: 'NotYourTurn', currentPlayerId: 'p1' } });
  });
});
