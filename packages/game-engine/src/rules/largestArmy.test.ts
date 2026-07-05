import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../state.js';
import { recalculateLargestArmy } from './largestArmy.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function withKnights(playerId: string, count: number, state: GameState): GameState {
  const playedDevCards = Array.from({ length: count }, (_, i) => ({
    id: `${playerId}-k${i}`,
    type: 'KNIGHT' as const,
  }));
  return { ...state, players: { ...state.players, [playerId]: { ...state.players[playerId], playedDevCards } } };
}

describe('recalculateLargestArmy', () => {
  it('awards no one below 3 knights', () => {
    const state = withKnights('p1', 2, createInitialGameState(['p1', 'p2'], identityShuffle));
    const { state: next, event } = recalculateLargestArmy(state);
    expect(next.largestArmy).toEqual({ holder: null, count: 0 });
    expect(event).toBeNull();
  });

  it('awards the title at exactly 3 knights', () => {
    const state = withKnights('p1', 3, createInitialGameState(['p1', 'p2'], identityShuffle));
    const { state: next, event } = recalculateLargestArmy(state);
    expect(next.largestArmy).toEqual({ holder: 'p1', count: 3 });
    expect(event).toEqual({ type: 'LargestArmyChanged', holder: 'p1', count: 3 });
  });

  it('transfers the title when a player strictly exceeds the current holder', () => {
    const base = createInitialGameState(['p1', 'p2'], identityShuffle);
    const withP1 = withKnights('p1', 3, base);
    const withBoth = withKnights('p2', 4, withP1);
    const held = { ...withBoth, largestArmy: { holder: 'p1', count: 3 } };
    const { state: next, event } = recalculateLargestArmy(held);
    expect(next.largestArmy).toEqual({ holder: 'p2', count: 4 });
    expect(event).toEqual({ type: 'LargestArmyChanged', holder: 'p2', count: 4 });
  });

  it('does not transfer on a tie', () => {
    const base = createInitialGameState(['p1', 'p2'], identityShuffle);
    const withP1 = withKnights('p1', 3, base);
    const withBoth = withKnights('p2', 3, withP1);
    const held = { ...withBoth, largestArmy: { holder: 'p1', count: 3 } };
    const { state: next, event } = recalculateLargestArmy(held);
    expect(next.largestArmy.holder).toBe('p1');
    expect(event).toBeNull();
  });

  it('returns no event when nothing changed', () => {
    const state = { ...withKnights('p1', 3, createInitialGameState(['p1', 'p2'], identityShuffle)), largestArmy: { holder: 'p1', count: 3 } };
    const { event } = recalculateLargestArmy(state);
    expect(event).toBeNull();
  });
});
