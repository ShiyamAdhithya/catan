import { describe, expect, it } from 'vitest';
import { buildCityHandler, buildRoadHandler, buildSettlementHandler } from './build.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return { ...createInitialGameState(['p1', 'p2'], identityShuffle), phase: 'MAIN' as const };
}

function withResources(state: GameState, playerId: string, resources: GameState['players'][string]['resources']) {
  return { ...state, players: { ...state.players, [playerId]: { ...state.players[playerId], resources } } };
}

describe('buildRoadHandler', () => {
  it('rejects when not connected to the player\'s network', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const result = buildRoadHandler.validate(state, {
      type: 'BuildRoad',
      playerId: 'p1',
      edgeId: state.board.edges[0].id,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects when the player cannot afford it', () => {
    const vertex = baseState().board.vertices[0];
    const edge = baseState().board.edges.find((e) => e.vertexIds.includes(vertex.id))!;
    const state = {
      ...withResources(baseState(), 'p1', { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 }),
    };
    const withSettlement = {
      ...state,
      board: {
        ...state.board,
        vertices: state.board.vertices.map((v) =>
          v.id === vertex.id ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const result = buildRoadHandler.validate(withSettlement, {
      type: 'BuildRoad',
      playerId: 'p1',
      edgeId: edge.id,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a connected, affordable road and emits RoadBuilt + ResourcesSpent', () => {
    const vertex = baseState().board.vertices[0];
    const edge = baseState().board.edges.find((e) => e.vertexIds.includes(vertex.id))!;
    const state = withResources(baseState(), 'p1', { WOOD: 1, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 });
    const withSettlement = {
      ...state,
      board: {
        ...state.board,
        vertices: state.board.vertices.map((v) =>
          v.id === vertex.id ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const command = { type: 'BuildRoad' as const, playerId: 'p1', edgeId: edge.id };
    expect(buildRoadHandler.validate(withSettlement, command).ok).toBe(true);
    expect(buildRoadHandler.apply(withSettlement, command)).toEqual([
      { type: 'RoadBuilt', playerId: 'p1', edgeId: edge.id },
      { type: 'ResourcesSpent', playerId: 'p1', resources: { BRICK: 1, WOOD: 1 } },
    ]);
  });
});

describe('buildSettlementHandler', () => {
  it('rejects when not connected to an owned road', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 });
    const result = buildSettlementHandler.validate(state, {
      type: 'BuildSettlement',
      playerId: 'p1',
      vertexId: state.board.vertices[0].id,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a settlement connected to an owned road, affordable and legal', () => {
    const base = baseState();
    const vertex = base.board.vertices[0];
    const edge = base.board.edges.find((e) => e.vertexIds.includes(vertex.id))!;
    const otherVertexId = edge.vertexIds.find((id) => id !== vertex.id)!;
    const state = withResources(base, 'p1', { WOOD: 1, BRICK: 1, SHEEP: 1, WHEAT: 1, ORE: 0 });
    const withRoad = {
      ...state,
      board: { ...state.board, edges: state.board.edges.map((e) => (e.id === edge.id ? { ...e, road: { playerId: 'p1' } } : e)) },
    };
    const command = { type: 'BuildSettlement' as const, playerId: 'p1', vertexId: otherVertexId };
    expect(buildSettlementHandler.validate(withRoad, command).ok).toBe(true);
    expect(buildSettlementHandler.apply(withRoad, command)).toEqual([
      { type: 'SettlementBuilt', playerId: 'p1', vertexId: otherVertexId },
      { type: 'ResourcesSpent', playerId: 'p1', resources: { BRICK: 1, WOOD: 1, SHEEP: 1, WHEAT: 1 } },
    ]);
  });
});

describe('buildCityHandler', () => {
  it('rejects upgrading a vertex that is not the player\'s own settlement', () => {
    const state = withResources(baseState(), 'p1', { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 });
    const result = buildCityHandler.validate(state, {
      type: 'BuildCity',
      playerId: 'p1',
      vertexId: state.board.vertices[0].id,
    });
    expect(result.ok).toBe(false);
  });

  it('accepts upgrading the player\'s own settlement when affordable', () => {
    const base = baseState();
    const vertex = base.board.vertices[0];
    const state = withResources(base, 'p1', { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 });
    const withSettlement = {
      ...state,
      board: {
        ...state.board,
        vertices: state.board.vertices.map((v) =>
          v.id === vertex.id ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } } : v,
        ),
      },
    };
    const command = { type: 'BuildCity' as const, playerId: 'p1', vertexId: vertex.id };
    expect(buildCityHandler.validate(withSettlement, command).ok).toBe(true);
    expect(buildCityHandler.apply(withSettlement, command)).toEqual([
      { type: 'CityUpgraded', playerId: 'p1', vertexId: vertex.id },
      { type: 'ResourcesSpent', playerId: 'p1', resources: { WHEAT: 2, ORE: 3 } },
    ]);
  });
});
