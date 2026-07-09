import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../state.js';
import { checkWinCondition, recalculateVictoryPoints } from './victory.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

describe('recalculateVictoryPoints', () => {
  it('sums settlements, cities, Longest Road, Largest Army, and VP dev cards', () => {
    const base = createInitialGameState(['p1', 'p2'], identityShuffle);
    const settlementVertex = base.board.vertices[0];
    const cityVertex = base.board.vertices[1];
    const state: GameState = {
      ...base,
      board: {
        ...base.board,
        vertices: base.board.vertices.map((v) => {
          if (v.id === settlementVertex.id) return { ...v, building: { type: 'SETTLEMENT', playerId: 'p1' } };
          if (v.id === cityVertex.id) return { ...v, building: { type: 'CITY', playerId: 'p1' } };
          return v;
        }),
      },
      longestRoad: { holder: 'p1', length: 5 },
      largestArmy: { holder: 'p1', count: 3 },
      players: {
        ...base.players,
        p1: { ...base.players.p1, devCards: [{ id: 'v1', type: 'VICTORY_POINT' }] },
      },
    };
    const next = recalculateVictoryPoints(state);
    // 1 (settlement) + 2 (city) + 2 (longest road) + 2 (largest army) + 1 (VP card) = 8
    expect(next.players.p1.victoryPoints).toBe(8);
    expect(next.players.p2.victoryPoints).toBe(0);
  });
});

describe('checkWinCondition', () => {
  it('does not declare a winner below 10 points', () => {
    const state = { ...createInitialGameState(['p1', 'p2'], identityShuffle) };
    const withPoints = { ...state, players: { ...state.players, p1: { ...state.players.p1, victoryPoints: 9 } } };
    const { state: next, event } = checkWinCondition(withPoints);
    expect(next.winner).toBeNull();
    expect(event).toBeNull();
  });

  it('declares the current player winner at 10+ points', () => {
    const state = createInitialGameState(['p1', 'p2'], identityShuffle);
    const withPoints = { ...state, players: { ...state.players, p1: { ...state.players.p1, victoryPoints: 10 } } };
    const { state: next, event } = checkWinCondition(withPoints);
    expect(next.winner).toBe('p1');
    expect(next.phase).toBe('GAME_OVER');
    expect(event).toEqual({ type: 'GameWon', playerId: 'p1' });
  });

  it('does not evaluate an opponent\'s hidden 10+ points on the current player\'s turn', () => {
    const state = createInitialGameState(['p1', 'p2'], identityShuffle);
    // p2 secretly has 10 points, but it is p1's turn (currentPlayerId defaults to p1).
    const withHiddenWin = { ...state, players: { ...state.players, p2: { ...state.players.p2, victoryPoints: 10 } } };
    const { state: next, event } = checkWinCondition(withHiddenWin);
    expect(next.winner).toBeNull();
    expect(event).toBeNull();
  });

  it('is a no-op once a winner is already set', () => {
    const state = { ...createInitialGameState(['p1', 'p2'], identityShuffle), winner: 'p1' as const };
    const { event } = checkWinCondition(state);
    expect(event).toBeNull();
  });
});
