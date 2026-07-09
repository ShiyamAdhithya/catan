import { describe, expect, it } from 'vitest';
import type { GameState } from './types.js';

describe('GameState shape', () => {
  it('accepts a minimal valid literal (compile-time check)', () => {
    const state: GameState = {
      phase: 'SETUP_SETTLEMENT',
      turnNumber: 1,
      currentPlayerId: 'p1',
      playerOrder: ['p1'],
      setupRound: 1,
      board: { hexes: [], vertices: [], edges: [], ports: [], robberHexId: 'h1' },
      players: {
        p1: {
          id: 'p1',
          resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
          devCards: [],
          playedDevCards: [],
          victoryPoints: 0,
          piecesRemaining: { roads: 15, settlements: 5, cities: 4 },
        },
      },
      bank: {
        resources: { WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 },
        devCards: [],
      },
      longestRoad: { holder: null, length: 0 },
      largestArmy: { holder: null, count: 0 },
      pendingDiscards: [],
      pendingRobberSteal: null,
      devCardPlayedThisTurn: false,
      devCardsBoughtThisTurn: [],
      winner: null,
    };
    expect(state.phase).toBe('SETUP_SETTLEMENT');
  });
});
