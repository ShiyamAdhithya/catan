import { describe, expect, it } from 'vitest';
import { generateBoard } from './board.js';
import {
  addResources,
  advanceAfterSetupRoad,
  hasResources,
  isConnectedToPlayerRoad,
  isEdgeConnectedToPlayerNetwork,
  setupTurnOrder,
  subtractResources,
  violatesDistanceRule,
} from './helpers.js';
import type { Board, GameState } from './types.js';

const identityShuffle = <T>(items: T[]): T[] => [...items];

describe('resource arithmetic', () => {
  const resources = { WOOD: 3, BRICK: 1, SHEEP: 0, WHEAT: 2, ORE: 0 };

  it('hasResources is true when every required amount is met', () => {
    expect(hasResources(resources, { WOOD: 2, BRICK: 1 })).toBe(true);
  });

  it('hasResources is false when any required amount is short', () => {
    expect(hasResources(resources, { SHEEP: 1 })).toBe(false);
  });

  it('subtractResources reduces only the given resources', () => {
    expect(subtractResources(resources, { WOOD: 2 })).toEqual({
      WOOD: 1,
      BRICK: 1,
      SHEEP: 0,
      WHEAT: 2,
      ORE: 0,
    });
  });

  it('addResources increases only the given resources', () => {
    expect(addResources(resources, { SHEEP: 3 })).toEqual({
      WOOD: 3,
      BRICK: 1,
      SHEEP: 3,
      WHEAT: 2,
      ORE: 0,
    });
  });
});

describe('board placement legality', () => {
  const board: Board = generateBoard(identityShuffle);

  it('violatesDistanceRule is false for an empty board', () => {
    expect(violatesDistanceRule(board, board.vertices[0].id)).toBe(false);
  });

  it('violatesDistanceRule is true for a vertex adjacent to an occupied one', () => {
    const [first, ...rest] = board.vertices;
    const neighborId = first.adjacentVertexIds[0];
    const neighbor = rest.find((v) => v.id === neighborId)!;
    neighbor.building = { type: 'SETTLEMENT', playerId: 'p1' };
    expect(violatesDistanceRule(board, first.id)).toBe(true);
  });

  it("isConnectedToPlayerRoad is true when an adjacent edge has the player's road", () => {
    const vertex = board.vertices[0];
    const edge = board.edges.find((e) => vertex.adjacentEdgeIds.includes(e.id))!;
    edge.road = { playerId: 'p1' };
    expect(isConnectedToPlayerRoad(board, vertex.id, 'p1')).toBe(true);
    expect(isConnectedToPlayerRoad(board, vertex.id, 'p2')).toBe(false);
  });

  it('isEdgeConnectedToPlayerNetwork is true via an owned building at an endpoint', () => {
    const edge = board.edges[0];
    const vertex = board.vertices.find((v) => v.id === edge.vertexIds[0])!;
    vertex.building = { type: 'SETTLEMENT', playerId: 'p3' };
    expect(isEdgeConnectedToPlayerNetwork(board, edge.id, 'p3')).toBe(true);
    expect(isEdgeConnectedToPlayerNetwork(board, edge.id, 'p4')).toBe(false);
  });
});

describe('setup turn order', () => {
  const playerOrder = ['p1', 'p2', 'p3', 'p4'];

  it('round 1 is forward order, round 2 is reversed', () => {
    expect(setupTurnOrder(playerOrder, 1)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(setupTurnOrder(playerOrder, 2)).toEqual(['p4', 'p3', 'p2', 'p1']);
  });

  it('advanceAfterSetupRoad moves to the next player within round 1', () => {
    const state = { playerOrder, currentPlayerId: 'p2', setupRound: 1 } as GameState;
    expect(advanceAfterSetupRoad(state)).toEqual({
      phase: 'SETUP_SETTLEMENT',
      currentPlayerId: 'p3',
      setupRound: 1,
    });
  });

  it('advanceAfterSetupRoad keeps the same player when round 1 ends (snake draft)', () => {
    const state = { playerOrder, currentPlayerId: 'p4', setupRound: 1 } as GameState;
    expect(advanceAfterSetupRoad(state)).toEqual({
      phase: 'SETUP_SETTLEMENT',
      currentPlayerId: 'p4',
      setupRound: 2,
    });
  });

  it('advanceAfterSetupRoad moves to the previous player within round 2', () => {
    const state = { playerOrder, currentPlayerId: 'p4', setupRound: 2 } as GameState;
    expect(advanceAfterSetupRoad(state)).toEqual({
      phase: 'SETUP_SETTLEMENT',
      currentPlayerId: 'p3',
      setupRound: 2,
    });
  });

  it('advanceAfterSetupRoad ends setup and starts play with the first player', () => {
    const state = { playerOrder, currentPlayerId: 'p1', setupRound: 2 } as GameState;
    expect(advanceAfterSetupRoad(state)).toEqual({
      phase: 'ROLL',
      currentPlayerId: 'p1',
      setupRound: null,
    });
  });
});
