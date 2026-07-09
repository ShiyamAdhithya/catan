import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialGameState, type GameState } from './index.js';

const identityShuffle = <T>(items: T[]): T[] => [...items];

function placeSettlement(state: GameState, playerId: string): GameState {
  for (const vertex of state.board.vertices) {
    const result = applyCommand(state, {
      type: 'PlaceInitialSettlement',
      playerId,
      vertexId: vertex.id,
    });
    if (result.ok) return result.value.state;
  }
  throw new Error(`No legal settlement vertex found for ${playerId}`);
}

function placeRoad(state: GameState, playerId: string): GameState {
  for (const edge of state.board.edges) {
    const result = applyCommand(state, { type: 'PlaceInitialRoad', playerId, edgeId: edge.id });
    if (result.ok) return result.value.state;
  }
  throw new Error(`No legal road edge found for ${playerId}`);
}

describe('full game: setup sequence', () => {
  it('completes 2-player snake-draft setup and transitions into normal play', () => {
    let state = createInitialGameState(['p1', 'p2'], identityShuffle);
    expect(state.phase).toBe('SETUP_SETTLEMENT');
    expect(state.currentPlayerId).toBe('p1');

    // Round 1: p1 then p2.
    state = placeSettlement(state, 'p1');
    expect(state.phase).toBe('SETUP_ROAD');
    state = placeRoad(state, 'p1');
    expect(state.currentPlayerId).toBe('p2');
    expect(state.phase).toBe('SETUP_SETTLEMENT');
    expect(state.setupRound).toBe(1);

    state = placeSettlement(state, 'p2');
    state = placeRoad(state, 'p2');
    // Snake draft: the last player in round 1 immediately goes again for round 2.
    expect(state.currentPlayerId).toBe('p2');
    expect(state.setupRound).toBe(2);

    // Round 2: p2 then p1 (reversed).
    state = placeSettlement(state, 'p2');
    state = placeRoad(state, 'p2');
    expect(state.currentPlayerId).toBe('p1');
    expect(state.setupRound).toBe(2);

    state = placeSettlement(state, 'p1');
    state = placeRoad(state, 'p1');

    expect(state.phase).toBe('ROLL');
    expect(state.currentPlayerId).toBe('p1');
    expect(state.turnNumber).toBe(1);

    // Resource conservation: every card is either in a player's hand or the bank.
    const totalInPlayerHands = Object.values(state.players).reduce(
      (sum, p) => sum + Object.values(p.resources).reduce((a, b) => a + b, 0),
      0,
    );
    const totalInBank = Object.values(state.bank.resources).reduce((a, b) => a + b, 0);
    expect(totalInPlayerHands + totalInBank).toBe(19 * 5);
  });
});

describe('full game: winning', () => {
  it('declares a winner once a command pushes the current player past 10 victory points', () => {
    const base = createInitialGameState(['p1', 'p2'], identityShuffle);

    // Build a 5-edge connected road chain for p1 (reusing the discovery pattern from
    // Task 15's longestRoad tests), tracking the vertex path so we can place real,
    // connected settlements at both ends of it.
    let board = base.board;
    let currentVertexId = board.vertices[0].id;
    const path = [currentVertexId];
    for (let i = 0; i < 5; i++) {
      const vertex = board.vertices.find((v) => v.id === currentVertexId)!;
      const nextEdge = vertex.adjacentEdgeIds
        .map((id) => board.edges.find((e) => e.id === id)!)
        .find((e) => {
          const otherId = e.vertexIds.find((v) => v !== currentVertexId)!;
          return e.road === null && !path.includes(otherId);
        })!;
      const nextVertexId = nextEdge.vertexIds.find((v) => v !== currentVertexId)!;
      board = {
        ...board,
        edges: board.edges.map((e) =>
          e.id === nextEdge.id ? { ...e, road: { playerId: 'p1' } } : e,
        ),
      };
      path.push(nextVertexId);
      currentVertexId = nextVertexId;
    }
    const [firstVertexId, , , , , lastVertexId] = path;
    board = {
      ...board,
      vertices: board.vertices.map((v) => {
        if (v.id === firstVertexId)
          return { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } };
        if (v.id === lastVertexId)
          return { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p1' } };
        return v;
      }),
    };

    // Pre-9-VP fixture for p1: 2 settlements (2) + Longest Road, auto-derived (2) +
    // Largest Army, auto-derived from 3 played Knights (2) + 3 unplayed VICTORY_POINT
    // cards (3) = 9. None of these are asserted directly — applyCommand recomputes
    // every derived field from scratch, which is exactly what this test is proving.
    const state: GameState = {
      ...base,
      phase: 'MAIN',
      currentPlayerId: 'p1',
      board,
      players: {
        ...base.players,
        p1: {
          ...base.players.p1,
          resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 2, ORE: 3 },
          devCards: [
            { id: 'vp1', type: 'VICTORY_POINT' },
            { id: 'vp2', type: 'VICTORY_POINT' },
            { id: 'vp3', type: 'VICTORY_POINT' },
          ],
          playedDevCards: [
            { id: 'k1', type: 'KNIGHT' },
            { id: 'k2', type: 'KNIGHT' },
            { id: 'k3', type: 'KNIGHT' },
          ],
        },
      },
    };

    const result = applyCommand(state, {
      type: 'BuildCity',
      playerId: 'p1',
      vertexId: firstVertexId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.players.p1.victoryPoints).toBe(10);
      expect(result.value.state.winner).toBe('p1');
      expect(result.value.state.phase).toBe('GAME_OVER');
      expect(result.value.events.some((e) => e.type === 'GameWon' && e.playerId === 'p1')).toBe(
        true,
      );
      expect(result.value.state.longestRoad.holder).toBe('p1');
      expect(result.value.state.largestArmy.holder).toBe('p1');
    }
  });
});
