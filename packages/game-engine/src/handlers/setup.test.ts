import { describe, expect, it } from 'vitest';
import { placeInitialRoadHandler, placeInitialSettlementHandler } from './setup.js';
import { createInitialGameState } from '../state.js';
import type { GameState } from '../types.js';

const identityShuffle = <T>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return createInitialGameState(['p1', 'p2'], identityShuffle);
}

describe('placeInitialSettlementHandler', () => {
  it('rejects placement in the wrong phase', () => {
    const state = { ...baseState(), phase: 'MAIN' as const };
    const result = placeInitialSettlementHandler.validate(state, {
      type: 'PlaceInitialSettlement',
      playerId: 'p1',
      vertexId: state.board.vertices[0].id,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects placement by a player who is not current', () => {
    const state = baseState();
    const result = placeInitialSettlementHandler.validate(state, {
      type: 'PlaceInitialSettlement',
      playerId: 'p2',
      vertexId: state.board.vertices[0].id,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects placement that violates the distance rule', () => {
    const state = baseState();
    const vertex = state.board.vertices[0];
    const neighborId = vertex.adjacentVertexIds[0];
    const occupiedBoard = {
      ...state.board,
      vertices: state.board.vertices.map((v) =>
        v.id === neighborId
          ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p2' } }
          : v,
      ),
    };
    const result = placeInitialSettlementHandler.validate(
      { ...state, board: occupiedBoard },
      { type: 'PlaceInitialSettlement', playerId: 'p1', vertexId: vertex.id },
    );
    expect(result.ok).toBe(false);
  });

  it('accepts a legal placement and emits only SettlementBuilt in round 1', () => {
    const state = baseState();
    const vertexId = state.board.vertices[0].id;
    const command = { type: 'PlaceInitialSettlement' as const, playerId: 'p1', vertexId };
    expect(placeInitialSettlementHandler.validate(state, command).ok).toBe(true);
    expect(placeInitialSettlementHandler.apply(state, command)).toEqual([
      { type: 'SettlementBuilt', playerId: 'p1', vertexId },
    ]);
  });

  it('grants starting resources from adjacent non-desert hexes in round 2', () => {
    const state = { ...baseState(), setupRound: 2 as const };
    const vertex = state.board.vertices.find((v) => v.adjacentHexIds.length === 3)!;
    const resourceHexes = vertex.adjacentHexIds
      .map((id) => state.board.hexes.find((h) => h.id === id)!)
      .filter((h) => h.resource !== 'DESERT');
    const command = {
      type: 'PlaceInitialSettlement' as const,
      playerId: 'p1',
      vertexId: vertex.id,
    };
    const events = placeInitialSettlementHandler.apply(state, command);
    expect(events[0]).toEqual({ type: 'SettlementBuilt', playerId: 'p1', vertexId: vertex.id });
    const gainedEvent = events[1];
    expect(gainedEvent?.type).toBe('ResourcesGained');
    if (gainedEvent?.type === 'ResourcesGained') {
      const expectedTotal = resourceHexes.length;
      const actualTotal = Object.values(gainedEvent.resources).reduce((a, b) => a + (b ?? 0), 0);
      expect(actualTotal).toBe(expectedTotal);
    }
  });
});

describe('placeInitialRoadHandler', () => {
  it('rejects a road not connected to the just-placed settlement', () => {
    const state = { ...baseState(), phase: 'SETUP_ROAD' as const };
    const vertex = state.board.vertices[0];
    const boardWithSettlement = {
      ...state.board,
      vertices: state.board.vertices.map((v) =>
        v.id === vertex.id
          ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } }
          : v,
      ),
    };
    const unrelatedEdge = state.board.edges.find((e) => !e.vertexIds.includes(vertex.id))!;
    const result = placeInitialRoadHandler.validate(
      { ...state, board: boardWithSettlement },
      { type: 'PlaceInitialRoad', playerId: 'p1', edgeId: unrelatedEdge.id },
    );
    expect(result.ok).toBe(false);
  });

  it('accepts a road connected to the just-placed settlement', () => {
    const state = { ...baseState(), phase: 'SETUP_ROAD' as const };
    const vertex = state.board.vertices[0];
    const boardWithSettlement = {
      ...state.board,
      vertices: state.board.vertices.map((v) =>
        v.id === vertex.id
          ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } }
          : v,
      ),
    };
    const connectedEdge = state.board.edges.find((e) => e.vertexIds.includes(vertex.id))!;
    const stateWithSettlement = { ...state, board: boardWithSettlement };
    const command = { type: 'PlaceInitialRoad' as const, playerId: 'p1', edgeId: connectedEdge.id };
    expect(placeInitialRoadHandler.validate(stateWithSettlement, command).ok).toBe(true);
    expect(placeInitialRoadHandler.apply(stateWithSettlement, command)).toEqual([
      { type: 'RoadBuilt', playerId: 'p1', edgeId: connectedEdge.id },
    ]);
  });
});
