import { describe, expect, it } from 'vitest';
import { rollDiceHandler } from './roll.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return { ...createInitialGameState(['p1', 'p2'], identityShuffle), phase: 'ROLL' as const };
}

describe('rollDiceHandler', () => {
  it('rejects rolling in the wrong phase', () => {
    const state = { ...baseState(), phase: 'MAIN' as const };
    const result = rollDiceHandler.validate(state, {
      type: 'RollDice',
      playerId: 'p1',
      die1: 3,
      die2: 4,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects rolling by a player who is not current', () => {
    const state = baseState();
    const result = rollDiceHandler.validate(state, {
      type: 'RollDice',
      playerId: 'p2',
      die1: 3,
      die2: 4,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects out-of-range die values', () => {
    const state = baseState();
    const result = rollDiceHandler.validate(state, {
      type: 'RollDice',
      playerId: 'p1',
      die1: 7,
      die2: 4,
    });
    expect(result.ok).toBe(false);
  });

  it('produces resources for a settlement adjacent to a matching, non-robber, non-desert hex', () => {
    const state = baseState();
    const vertex = state.board.vertices.find((v) =>
      v.adjacentHexIds.some((hexId) => {
        const hex = state.board.hexes.find((h) => h.id === hexId)!;
        return (
          hex.resource !== 'DESERT' && hex.number !== null && hex.id !== state.board.robberHexId
        );
      }),
    )!;
    const targetHex = vertex.adjacentHexIds
      .map((id) => state.board.hexes.find((h) => h.id === id)!)
      .find(
        (h) => h.resource !== 'DESERT' && h.number !== null && h.id !== state.board.robberHexId,
      )!;
    const withSettlement = {
      ...state,
      board: {
        ...state.board,
        vertices: state.board.vertices.map((v) =>
          v.id === vertex.id
            ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } }
            : v,
        ),
      },
    };
    const command = {
      type: 'RollDice' as const,
      playerId: 'p1',
      die1: Math.min(6, targetHex.number! - 1) || 1,
      die2: targetHex.number! - (Math.min(6, targetHex.number! - 1) || 1),
    };
    const events = rollDiceHandler.apply(withSettlement, command);
    const gained = events.find((e) => e.type === 'ResourcesGained' && e.playerId === 'p1');
    expect(gained).toBeDefined();
    if (gained?.type === 'ResourcesGained') {
      expect(gained.resources[targetHex.resource as never]).toBeGreaterThanOrEqual(1);
    }
  });

  it('produces no resources and flags overloaded players to discard on a 7', () => {
    const state = baseState();
    const overloaded = {
      ...state,
      players: {
        ...state.players,
        p1: { ...state.players.p1, resources: { WOOD: 4, BRICK: 4, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const command = { type: 'RollDice' as const, playerId: 'p1', die1: 3, die2: 4 };
    const events = rollDiceHandler.apply(overloaded, command);
    expect(events).toEqual([
      { type: 'DiceRolled', die1: 3, die2: 4, total: 7, playersToDiscard: ['p1'] },
    ]);
  });

  it('applies the bank-shortage rule: no one gets a resource the bank cannot fully cover', () => {
    const state = baseState();
    const vertex = state.board.vertices.find((v) => v.adjacentHexIds.length >= 1)!;
    const hex = state.board.hexes.find(
      (h) => h.id === vertex.adjacentHexIds[0] && h.resource !== 'DESERT',
    )!;
    const nearlyEmptyBank = {
      ...state,
      bank: { ...state.bank, resources: { ...state.bank.resources, [hex.resource]: 0 } },
      board: {
        ...state.board,
        vertices: state.board.vertices.map((v) =>
          v.id === vertex.id
            ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } }
            : v,
        ),
      },
    };
    const events = rollDiceHandler.apply(nearlyEmptyBank, {
      type: 'RollDice',
      playerId: 'p1',
      die1: 1,
      die2: (hex.number ?? 2) - 1,
    });
    const gained = events.find((e) => e.type === 'ResourcesGained' && e.playerId === 'p1');
    if (gained?.type === 'ResourcesGained') {
      expect(gained.resources[hex.resource as never]).toBeUndefined();
    }
  });
});
