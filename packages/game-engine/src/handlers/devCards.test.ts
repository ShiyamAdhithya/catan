import { describe, expect, it } from 'vitest';
import { buyDevelopmentCardHandler, playDevelopmentCardHandler } from './devCards.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return { ...createInitialGameState(['p1', 'p2'], identityShuffle), phase: 'MAIN' as const };
}

function withResources(state: GameState, playerId: string, resources: GameState['players'][string]['resources']) {
  return { ...state, players: { ...state.players, [playerId]: { ...state.players[playerId], resources } } };
}

function withDevCards(state: GameState, playerId: string, devCards: GameState['players'][string]['devCards']) {
  return { ...state, players: { ...state.players, [playerId]: { ...state.players[playerId], devCards } } };
}

describe('buyDevelopmentCardHandler', () => {
  it('rejects when the player cannot afford it', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const result = buyDevelopmentCardHandler.validate(state, {
      type: 'BuyDevelopmentCard',
      playerId: 'p1',
      card: state.bank.devCards[0],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a declared card that does not match the top of the deck', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 });
    const result = buyDevelopmentCardHandler.validate(state, {
      type: 'BuyDevelopmentCard',
      playerId: 'p1',
      card: state.bank.devCards[1],
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a correctly declared, affordable purchase', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 0, BRICK: 0, SHEEP: 1, WHEAT: 1, ORE: 1 });
    const card = state.bank.devCards[0];
    const command = { type: 'BuyDevelopmentCard' as const, playerId: 'p1', card };
    expect(buyDevelopmentCardHandler.validate(state, command).ok).toBe(true);
    expect(buyDevelopmentCardHandler.apply(state, command)).toEqual([
      { type: 'DevelopmentCardBought', playerId: 'p1', card },
      { type: 'ResourcesSpent', playerId: 'p1', resources: { SHEEP: 1, WHEAT: 1, ORE: 1 } },
    ]);
  });
});

describe('playDevelopmentCardHandler', () => {
  it('rejects playing a second card in the same turn', () => {
    const state = { ...withDevCards(baseState(), 'p1', [{ id: 'k1', type: 'KNIGHT' }]), devCardPlayedThisTurn: true };
    const result = playDevelopmentCardHandler.validate(state, {
      type: 'PlayDevelopmentCard',
      playerId: 'p1',
      cardId: 'k1',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects playing a card bought this same turn', () => {
    const state = {
      ...withDevCards(baseState(), 'p1', [{ id: 'k1', type: 'KNIGHT' }]),
      devCardsBoughtThisTurn: ['k1'],
    };
    const result = playDevelopmentCardHandler.validate(state, {
      type: 'PlayDevelopmentCard',
      playerId: 'p1',
      cardId: 'k1',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects playing a Victory Point card', () => {
    const state = withDevCards(baseState(), 'p1', [{ id: 'v1', type: 'VICTORY_POINT' }]);
    const result = playDevelopmentCardHandler.validate(state, {
      type: 'PlayDevelopmentCard',
      playerId: 'p1',
      cardId: 'v1',
    });
    expect(result.ok).toBe(false);
  });

  it('plays a Knight and emits KnightPlayed', () => {
    const state = withDevCards(baseState(), 'p1', [{ id: 'k1', type: 'KNIGHT' }]);
    const command = { type: 'PlayDevelopmentCard' as const, playerId: 'p1', cardId: 'k1' };
    expect(playDevelopmentCardHandler.validate(state, command).ok).toBe(true);
    expect(playDevelopmentCardHandler.apply(state, command)).toEqual([
      { type: 'KnightPlayed', playerId: 'p1', cardId: 'k1' },
    ]);
  });

  it('plays Road Building and emits two free RoadBuilt events (no ResourcesSpent)', () => {
    const base = withDevCards(baseState(), 'p1', [{ id: 'r1', type: 'ROAD_BUILDING' }]);
    const vertex = base.board.vertices[0];
    const edgeA = base.board.edges.find((e) => e.vertexIds.includes(vertex.id))!;
    const edgeB = base.board.edges.find((e) => e.id !== edgeA.id && e.vertexIds.includes(vertex.id))!;
    const withSettlement = {
      ...base,
      board: {
        ...base.board,
        vertices: base.board.vertices.map((v) =>
          v.id === vertex.id ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const command = {
      type: 'PlayDevelopmentCard' as const,
      playerId: 'p1',
      cardId: 'r1',
      roadBuilding: { edgeIds: [edgeA.id, edgeB.id] as [string, string] },
    };
    expect(playDevelopmentCardHandler.validate(withSettlement, command).ok).toBe(true);
    expect(playDevelopmentCardHandler.apply(withSettlement, command)).toEqual([
      { type: 'RoadBuildingPlayed', playerId: 'p1', cardId: 'r1' },
      { type: 'RoadBuilt', playerId: 'p1', edgeId: edgeA.id },
      { type: 'RoadBuilt', playerId: 'p1', edgeId: edgeB.id },
    ]);
  });

  it('plays Year of Plenty and grants the two chosen resources from the bank', () => {
    const state = withDevCards(baseState(), 'p1', [{ id: 'y1', type: 'YEAR_OF_PLENTY' }]);
    const command = {
      type: 'PlayDevelopmentCard' as const,
      playerId: 'p1',
      cardId: 'y1',
      yearOfPlenty: { resources: ['WOOD', 'ORE'] as ['WOOD' | 'ORE', 'WOOD' | 'ORE'] },
    };
    expect(playDevelopmentCardHandler.validate(state, command).ok).toBe(true);
    expect(playDevelopmentCardHandler.apply(state, command)).toEqual([
      { type: 'YearOfPlentyPlayed', playerId: 'p1', cardId: 'y1', resources: ['WOOD', 'ORE'] },
    ]);
  });

  it('plays Monopoly and computes totalStolen from every other player\'s current holdings', () => {
    const state = {
      ...withDevCards(baseState(), 'p1', [{ id: 'mo1', type: 'MONOPOLY' }]),
      players: {
        ...baseState().players,
        p1: { ...baseState().players.p1, devCards: [{ id: 'mo1', type: 'MONOPOLY' as const }] },
        p2: { ...baseState().players.p2, resources: { WOOD: 3, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const command = {
      type: 'PlayDevelopmentCard' as const,
      playerId: 'p1',
      cardId: 'mo1',
      monopoly: { resource: 'WOOD' as const },
    };
    expect(playDevelopmentCardHandler.validate(state, command).ok).toBe(true);
    expect(playDevelopmentCardHandler.apply(state, command)).toEqual([
      { type: 'MonopolyPlayed', playerId: 'p1', cardId: 'mo1', resource: 'WOOD', totalStolen: 3 },
    ]);
  });
});
