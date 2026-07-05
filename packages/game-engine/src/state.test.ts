import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

describe('createInitialGameState', () => {
  it('starts in SETUP_SETTLEMENT with the first player in turn order', () => {
    const state = createInitialGameState(['p1', 'p2', 'p3'], identityShuffle);
    expect(state.phase).toBe('SETUP_SETTLEMENT');
    expect(state.turnNumber).toBe(1);
    expect(state.currentPlayerId).toBe('p1');
    expect(state.setupRound).toBe(1);
    expect(state.playerOrder).toEqual(['p1', 'p2', 'p3']);
  });

  it('gives every player zero resources, zero dev cards, and full piece limits', () => {
    const state = createInitialGameState(['p1', 'p2'], identityShuffle);
    for (const playerId of ['p1', 'p2']) {
      const player = state.players[playerId];
      expect(player.resources).toEqual({ WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
      expect(player.devCards).toEqual([]);
      expect(player.victoryPoints).toBe(0);
      expect(player.piecesRemaining).toEqual({ roads: 15, settlements: 5, cities: 4 });
    }
  });

  it('stocks the bank with 19 of each resource and a 25-card dev deck', () => {
    const state = createInitialGameState(['p1', 'p2'], identityShuffle);
    expect(state.bank.resources).toEqual({ WOOD: 19, BRICK: 19, SHEEP: 19, WHEAT: 19, ORE: 19 });
    expect(state.bank.devCards).toHaveLength(25);
    const counts = state.bank.devCards.reduce<Record<string, number>>((acc, card) => {
      acc[card.type] = (acc[card.type] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({
      KNIGHT: 14,
      VICTORY_POINT: 5,
      ROAD_BUILDING: 2,
      YEAR_OF_PLENTY: 2,
      MONOPOLY: 2,
    });
  });

  it('generates a board and starts with no winner and empty interrupt queues', () => {
    const state = createInitialGameState(['p1', 'p2'], identityShuffle);
    expect(state.board.hexes).toHaveLength(19);
    expect(state.winner).toBeNull();
    expect(state.pendingDiscards).toEqual([]);
    expect(state.pendingRobberSteal).toBeNull();
    expect(state.longestRoad).toEqual({ holder: null, length: 0 });
    expect(state.largestArmy).toEqual({ holder: null, count: 0 });
    expect(state.devCardPlayedThisTurn).toBe(false);
    expect(state.devCardsBoughtThisTurn).toEqual([]);
  });
});
