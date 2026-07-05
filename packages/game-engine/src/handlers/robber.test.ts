import { describe, expect, it } from 'vitest';
import { discardResourcesHandler, moveRobberHandler, stealResourceHandler } from './robber.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return createInitialGameState(['p1', 'p2'], identityShuffle);
}

describe('discardResourcesHandler', () => {
  it('rejects a player not owed a discard', () => {
    const state = { ...baseState(), phase: 'DISCARD' as const, pendingDiscards: ['p2'] };
    const result = discardResourcesHandler.validate(state, {
      type: 'DiscardResources',
      playerId: 'p1',
      discarded: {},
    });
    expect(result.ok).toBe(false);
  });

  it('rejects discarding the wrong amount', () => {
    const state = {
      ...baseState(),
      phase: 'DISCARD' as const,
      pendingDiscards: ['p1'],
      players: {
        ...baseState().players,
        p1: { ...baseState().players.p1, resources: { WOOD: 4, BRICK: 4, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const result = discardResourcesHandler.validate(state, {
      type: 'DiscardResources',
      playerId: 'p1',
      discarded: { WOOD: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it('accepts discarding exactly half (rounded down), and rejects discarding cards not held', () => {
    const state = {
      ...baseState(),
      phase: 'DISCARD' as const,
      pendingDiscards: ['p1'],
      players: {
        ...baseState().players,
        p1: { ...baseState().players.p1, resources: { WOOD: 4, BRICK: 4, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const command = { type: 'DiscardResources' as const, playerId: 'p1', discarded: { WOOD: 4 } };
    expect(discardResourcesHandler.validate(state, command).ok).toBe(true);
    expect(discardResourcesHandler.apply(state, command)).toEqual([
      { type: 'ResourcesDiscarded', playerId: 'p1', resources: { WOOD: 4 } },
    ]);

    const impossible = { type: 'DiscardResources' as const, playerId: 'p1', discarded: { ORE: 4 } };
    expect(discardResourcesHandler.validate(state, impossible).ok).toBe(false);
  });
});

describe('moveRobberHandler', () => {
  it('rejects moving the robber to the hex it is already on', () => {
    const state = { ...baseState(), phase: 'MOVE_ROBBER' as const };
    const result = moveRobberHandler.validate(state, {
      type: 'MoveRobber',
      playerId: 'p1',
      hexId: state.board.robberHexId,
    });
    expect(result.ok).toBe(false);
  });

  it('finds steal targets among opponents adjacent to the new hex with cards, excluding the mover', () => {
    const state = { ...baseState(), phase: 'MOVE_ROBBER' as const };
    const targetHex = state.board.hexes.find((h) => h.id !== state.board.robberHexId)!;
    const vertex = state.board.vertices.find((v) => v.adjacentHexIds.includes(targetHex.id))!;
    const withBuildingsAndCards = {
      ...state,
      board: {
        ...state.board,
        vertices: state.board.vertices.map((v) =>
          v.id === vertex.id ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p2' } } : v,
        ),
      },
      players: {
        ...state.players,
        p2: { ...state.players.p2, resources: { WOOD: 1, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const command = { type: 'MoveRobber' as const, playerId: 'p1', hexId: targetHex.id };
    expect(moveRobberHandler.validate(withBuildingsAndCards, command).ok).toBe(true);
    expect(moveRobberHandler.apply(withBuildingsAndCards, command)).toEqual([
      { type: 'RobberMoved', hexId: targetHex.id, stealTargets: ['p2'] },
    ]);
  });
});

describe('stealResourceHandler', () => {
  it('rejects stealing from a player who is not a valid target', () => {
    const state = {
      ...baseState(),
      phase: 'STEAL' as const,
      pendingRobberSteal: { targets: ['p2'] },
    };
    const result = stealResourceHandler.validate(state, {
      type: 'StealResource',
      playerId: 'p1',
      targetPlayerId: 'p3',
      randomIndex: 0,
    });
    expect(result.ok).toBe(false);
  });

  it('deterministically resolves the stolen resource from randomIndex modulo the hand size', () => {
    const state = {
      ...baseState(),
      phase: 'STEAL' as const,
      pendingRobberSteal: { targets: ['p2'] },
      players: {
        ...baseState().players,
        p2: { ...baseState().players.p2, resources: { WOOD: 1, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const command = {
      type: 'StealResource' as const,
      playerId: 'p1',
      targetPlayerId: 'p2',
      randomIndex: 0,
    };
    expect(stealResourceHandler.validate(state, command).ok).toBe(true);
    expect(stealResourceHandler.apply(state, command)).toEqual([
      { type: 'ResourceStolen', thiefId: 'p1', victimId: 'p2', resource: 'WOOD' },
    ]);
  });

  it('resolves to a null resource when the victim has no cards', () => {
    const state = {
      ...baseState(),
      phase: 'STEAL' as const,
      pendingRobberSteal: { targets: ['p2'] },
    };
    const command = {
      type: 'StealResource' as const,
      playerId: 'p1',
      targetPlayerId: 'p2',
      randomIndex: 0,
    };
    expect(stealResourceHandler.apply(state, command)).toEqual([
      { type: 'ResourceStolen', thiefId: 'p1', victimId: 'p2', resource: null },
    ]);
  });
});
