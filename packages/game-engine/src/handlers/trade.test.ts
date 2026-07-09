import { describe, expect, it } from 'vitest';
import { tradeWithBankHandler } from './trade.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return { ...createInitialGameState(['p1', 'p2'], identityShuffle), phase: 'MAIN' as const };
}

function withResources(state: GameState, playerId: string, resources: GameState['players'][string]['resources']) {
  return { ...state, players: { ...state.players, [playerId]: { ...state.players[playerId], resources } } };
}

describe('tradeWithBankHandler', () => {
  it('rejects trading a resource for itself', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 4, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const result = tradeWithBankHandler.validate(state, {
      type: 'TradeWithBank',
      playerId: 'p1',
      give: 'WOOD',
      giveAmount: 4,
      receive: 'WOOD',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a 2:1 trade without owning the matching port', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 2, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const result = tradeWithBankHandler.validate(state, {
      type: 'TradeWithBank',
      playerId: 'p1',
      give: 'WOOD',
      giveAmount: 2,
      receive: 'ORE',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a 3:1 trade without owning any generic port', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 3, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const result = tradeWithBankHandler.validate(state, {
      type: 'TradeWithBank',
      playerId: 'p1',
      give: 'WOOD',
      giveAmount: 3,
      receive: 'ORE',
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a 4:1 trade with sufficient resources and bank stock, emitting ResourcesTraded', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 4, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const command = {
      type: 'TradeWithBank' as const,
      playerId: 'p1',
      give: 'WOOD' as const,
      giveAmount: 4,
      receive: 'ORE' as const,
    };
    expect(tradeWithBankHandler.validate(state, command).ok).toBe(true);
    expect(tradeWithBankHandler.apply(state, command)).toEqual([
      { type: 'ResourcesTraded', playerId: 'p1', give: 'WOOD', giveAmount: 4, receive: 'ORE' },
    ]);
  });

  it('accepts a 2:1 trade when the player owns the matching resource port', () => {
    const base = withResources(baseState(), 'p1', { WOOD: 2, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const woodPort = base.board.ports.find((p) => p.kind.type === 'RESOURCE' && p.kind.resource === 'WOOD')!;
    const state = {
      ...base,
      board: {
        ...base.board,
        vertices: base.board.vertices.map((v) =>
          v.id === woodPort.vertexIds[0] ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const command = {
      type: 'TradeWithBank' as const,
      playerId: 'p1',
      give: 'WOOD' as const,
      giveAmount: 2,
      receive: 'ORE' as const,
    };
    expect(tradeWithBankHandler.validate(state, command).ok).toBe(true);
  });
});
