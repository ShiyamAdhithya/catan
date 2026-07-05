import { describe, expect, it } from 'vitest';
import { endTurnHandler } from './turn.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return { ...createInitialGameState(['p1', 'p2', 'p3'], identityShuffle), phase: 'MAIN' as const };
}

describe('endTurnHandler', () => {
  it('rejects ending the turn in the wrong phase', () => {
    const state = { ...baseState(), phase: 'ROLL' as const };
    const result = endTurnHandler.validate(state, { type: 'EndTurn', playerId: 'p1' });
    expect(result.ok).toBe(false);
  });

  it('rejects ending the turn for a player who is not current', () => {
    const state = baseState();
    const result = endTurnHandler.validate(state, { type: 'EndTurn', playerId: 'p2' });
    expect(result.ok).toBe(false);
  });

  it('advances to the next player in playerOrder', () => {
    const state = baseState();
    const command = { type: 'EndTurn' as const, playerId: 'p1' };
    expect(endTurnHandler.validate(state, command).ok).toBe(true);
    expect(endTurnHandler.apply(state, command)).toEqual([{ type: 'TurnEnded', nextPlayerId: 'p2' }]);
  });

  it('wraps around from the last player to the first', () => {
    const state = { ...baseState(), currentPlayerId: 'p3' };
    const command = { type: 'EndTurn' as const, playerId: 'p3' };
    expect(endTurnHandler.apply(state, command)).toEqual([{ type: 'TurnEnded', nextPlayerId: 'p1' }]);
  });
});
