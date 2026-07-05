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

  it('accepts a Road Building pair that chains outward from the network through a shared vertex', () => {
    const base = withDevCards(baseState(), 'p1', [{ id: 'r1', type: 'ROAD_BUILDING' }]);
    // Find a settlement vertex V, an edge A touching V (connected), and an edge C that
    // shares A's *other* vertex W but does not itself touch V — a legitimate outward
    // chain where only edge A is directly connected to the network.
    let found: { vertexId: string; edgeA: (typeof base.board.edges)[number]; edgeC: (typeof base.board.edges)[number] } | undefined;
    for (const vertex of base.board.vertices) {
      const edgeA = base.board.edges.find((e) => e.vertexIds.includes(vertex.id));
      if (!edgeA) continue;
      const otherVertexId = edgeA.vertexIds.find((v) => v !== vertex.id)!;
      const edgeC = base.board.edges.find(
        (e) => e.id !== edgeA.id && e.vertexIds.includes(otherVertexId) && !e.vertexIds.includes(vertex.id),
      );
      if (edgeC) {
        found = { vertexId: vertex.id, edgeA, edgeC };
        break;
      }
    }
    expect(found).toBeDefined();
    const { vertexId, edgeA, edgeC } = found!;
    const withSettlement = {
      ...base,
      board: {
        ...base.board,
        vertices: base.board.vertices.map((v) =>
          v.id === vertexId ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const command = {
      type: 'PlayDevelopmentCard' as const,
      playerId: 'p1',
      cardId: 'r1',
      roadBuilding: { edgeIds: [edgeA.id, edgeC.id] as [string, string] },
    };
    expect(playDevelopmentCardHandler.validate(withSettlement, command).ok).toBe(true);
  });

  it('rejects a Road Building pair of two disjoint edges neither of which touches the network', () => {
    const base = withDevCards(baseState(), 'p1', [{ id: 'r1', type: 'ROAD_BUILDING' }]);
    let found: { edgeX: (typeof base.board.edges)[number]; edgeY: (typeof base.board.edges)[number] } | undefined;
    for (const edgeX of base.board.edges) {
      const edgeY = base.board.edges.find(
        (e) => e.id !== edgeX.id && !e.vertexIds.some((v) => edgeX.vertexIds.includes(v)),
      );
      if (edgeY) {
        found = { edgeX, edgeY };
        break;
      }
    }
    expect(found).toBeDefined();
    const { edgeX, edgeY } = found!;
    const command = {
      type: 'PlayDevelopmentCard' as const,
      playerId: 'p1',
      cardId: 'r1',
      roadBuilding: { edgeIds: [edgeX.id, edgeY.id] as [string, string] },
    };
    expect(playDevelopmentCardHandler.validate(base, command).ok).toBe(false);
  });

  it('rejects a Road Building pair with one edge anchored to the network and the other floating disjoint', () => {
    const base = withDevCards(baseState(), 'p1', [{ id: 'r1', type: 'ROAD_BUILDING' }]);
    // Reproduces the reviewer's counter-example: settlement at V with connected edge A,
    // plus an unrelated edge F sharing no vertex with A and not itself touching V.
    let found: { vertexId: string; edgeA: (typeof base.board.edges)[number]; edgeF: (typeof base.board.edges)[number] } | undefined;
    for (const vertex of base.board.vertices) {
      const edgeA = base.board.edges.find((e) => e.vertexIds.includes(vertex.id));
      if (!edgeA) continue;
      const edgeF = base.board.edges.find(
        (e) => e.id !== edgeA.id && !e.vertexIds.includes(vertex.id) && !e.vertexIds.some((v) => edgeA.vertexIds.includes(v)),
      );
      if (edgeF) {
        found = { vertexId: vertex.id, edgeA, edgeF };
        break;
      }
    }
    expect(found).toBeDefined();
    const { vertexId, edgeA, edgeF } = found!;
    const withSettlement = {
      ...base,
      board: {
        ...base.board,
        vertices: base.board.vertices.map((v) =>
          v.id === vertexId ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const command = {
      type: 'PlayDevelopmentCard' as const,
      playerId: 'p1',
      cardId: 'r1',
      roadBuilding: { edgeIds: [edgeA.id, edgeF.id] as [string, string] },
    };
    expect(playDevelopmentCardHandler.validate(withSettlement, command).ok).toBe(false);
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
