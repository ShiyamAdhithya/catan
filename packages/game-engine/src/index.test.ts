import { describe, expect, it } from 'vitest';
import { PIECE_LIMITS } from './index.js';

describe('PIECE_LIMITS', () => {
  it('matches official Catan piece counts per player', () => {
    expect(PIECE_LIMITS).toEqual({ roads: 15, settlements: 5, cities: 4 });
  });
});
