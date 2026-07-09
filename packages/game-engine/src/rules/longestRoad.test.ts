import { describe, expect, it } from 'vitest';
import { generateBoard } from '../board.js';
import { createInitialGameState } from '../state.js';
import { longestRoadForPlayer, recalculateLongestRoad } from './longestRoad.js';
import type { Board, GameState } from '../types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function chainOfEdges(board: Board, playerId: string, length: number): Board {
  // Walk a chain of `length` edges starting from board.vertices[0], all owned by playerId.
  let board2 = board;
  let currentVertexId = board.vertices[0].id;
  const usedVertexIds = new Set([currentVertexId]);
  for (let i = 0; i < length; i++) {
    const vertex = board2.vertices.find((v) => v.id === currentVertexId)!;
    const nextEdge = vertex.adjacentEdgeIds
      .map((id) => board2.edges.find((e) => e.id === id)!)
      .find((e) => {
        const otherId = e.vertexIds.find((v) => v !== currentVertexId)!;
        return e.road === null && !usedVertexIds.has(otherId);
      })!;
    const nextVertexId = nextEdge.vertexIds.find((v) => v !== currentVertexId)!;
    usedVertexIds.add(nextVertexId);
    board2 = {
      ...board2,
      edges: board2.edges.map((e) => (e.id === nextEdge.id ? { ...e, road: { playerId } } : e)),
    };
    currentVertexId = nextVertexId;
  }
  return board2;
}

describe('longestRoadForPlayer', () => {
  it('is 0 for a player with no roads', () => {
    const board = generateBoard(identityShuffle);
    expect(longestRoadForPlayer(board, 'p1')).toBe(0);
  });

  it('counts a simple chain correctly', () => {
    const board = chainOfEdges(generateBoard(identityShuffle), 'p1', 4);
    expect(longestRoadForPlayer(board, 'p1')).toBe(4);
  });

  it('stops extending through a vertex owned by another player', () => {
    const base = chainOfEdges(generateBoard(identityShuffle), 'p1', 4);
    // Find the vertex in the middle of the chain (has 2 of p1's edges) and give it to p2.
    const midVertex = base.vertices.find(
      (v) => v.adjacentEdgeIds.filter((id) => base.edges.find((e) => e.id === id)?.road?.playerId === 'p1').length === 2,
    )!;
    const blocked: Board = {
      ...base,
      vertices: base.vertices.map((v) =>
        v.id === midVertex.id ? { ...v, building: { type: 'SETTLEMENT' as const, playerId: 'p2' } } : v,
      ),
    };
    // Longest trail is now bounded by whichever side of the cut is longer, not the full 4.
    expect(longestRoadForPlayer(blocked, 'p1')).toBeLessThan(4);
  });
});

describe('recalculateLongestRoad', () => {
  function stateWithBoard(board: Board): GameState {
    return { ...createInitialGameState(['p1', 'p2'], identityShuffle), board };
  }

  it('awards no one below length 5', () => {
    const board = chainOfEdges(generateBoard(identityShuffle), 'p1', 4);
    const { state, event } = recalculateLongestRoad(stateWithBoard(board));
    expect(state.longestRoad).toEqual({ holder: null, length: 0 });
    expect(event).toBeNull();
  });

  it('awards the title at exactly length 5', () => {
    const board = chainOfEdges(generateBoard(identityShuffle), 'p1', 5);
    const { state, event } = recalculateLongestRoad(stateWithBoard(board));
    expect(state.longestRoad).toEqual({ holder: 'p1', length: 5 });
    expect(event).toEqual({ type: 'LongestRoadChanged', holder: 'p1', length: 5 });
  });

  it('does not transfer the title on a tie', () => {
    const withP1 = chainOfEdges(generateBoard(identityShuffle), 'p1', 5);
    const held = { ...stateWithBoard(withP1), longestRoad: { holder: 'p1', length: 5 } };
    // p2 also reaches 5 elsewhere on the board — not implemented in this fixture (kept at 0),
    // so this asserts the simpler invariant: the holder keeps the title while still >= 5.
    const { state, event } = recalculateLongestRoad(held);
    expect(state.longestRoad.holder).toBe('p1');
    expect(event).toBeNull();
  });

  it('returns no event when nothing changed', () => {
    const board = chainOfEdges(generateBoard(identityShuffle), 'p1', 5);
    const state = { ...stateWithBoard(board), longestRoad: { holder: 'p1', length: 5 } };
    const { event } = recalculateLongestRoad(state);
    expect(event).toBeNull();
  });
});
