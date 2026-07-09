import type { Board, Edge, EdgeId, GameState, PlayerId, VertexId } from '../types.js';
import type { LongestRoadChangedEvent } from '../events.js';

export function longestRoadForPlayer(board: Board, playerId: PlayerId): number {
  const playerEdges = board.edges.filter((e) => e.road?.playerId === playerId);
  if (playerEdges.length === 0) return 0;

  const edgesByVertex = new Map<VertexId, Edge[]>();
  for (const edge of playerEdges) {
    for (const vertexId of edge.vertexIds) {
      if (!edgesByVertex.has(vertexId)) edgesByVertex.set(vertexId, []);
      edgesByVertex.get(vertexId)!.push(edge);
    }
  }

  let best = 0;

  function dfs(vertexId: VertexId, usedEdgeIds: Set<EdgeId>, length: number): void {
    best = Math.max(best, length);
    if (length > 0) {
      const vertex = board.vertices.find((v) => v.id === vertexId)!;
      if (vertex.building !== null && vertex.building.playerId !== playerId) {
        return; // arrived at an opponent's building; trail cannot extend further
      }
    }
    for (const edge of edgesByVertex.get(vertexId) ?? []) {
      if (usedEdgeIds.has(edge.id)) continue;
      const nextVertexId = edge.vertexIds.find((v) => v !== vertexId)!;
      usedEdgeIds.add(edge.id);
      dfs(nextVertexId, usedEdgeIds, length + 1);
      usedEdgeIds.delete(edge.id);
    }
  }

  for (const startVertexId of edgesByVertex.keys()) {
    dfs(startVertexId, new Set(), 0);
  }

  return best;
}

export function recalculateLongestRoad(
  state: GameState,
): { state: GameState; event: LongestRoadChangedEvent | null } {
  const lengths = state.playerOrder.map((playerId) => ({
    playerId,
    length: longestRoadForPlayer(state.board, playerId),
  }));

  const currentHolder = state.longestRoad.holder;
  const currentHolderLength = lengths.find((l) => l.playerId === currentHolder)?.length ?? 0;

  const eligible = lengths.filter((l) => l.length >= 5);
  const maxLength = eligible.reduce((max, l) => Math.max(max, l.length), 0);
  const leaders = eligible.filter((l) => l.length === maxLength);

  let holder = currentHolder;
  let length = currentHolderLength;

  if (currentHolder && currentHolderLength < 5) {
    holder = null;
    length = 0;
  }

  if (holder === null && leaders.length === 1) {
    holder = leaders[0].playerId;
    length = leaders[0].length;
  } else if (holder !== null && maxLength > currentHolderLength) {
    const soleLeader = leaders.length === 1 ? leaders[0] : null;
    if (soleLeader && soleLeader.playerId !== holder) {
      holder = soleLeader.playerId;
      length = soleLeader.length;
    }
  } else if (holder !== null) {
    length = lengths.find((l) => l.playerId === holder)!.length;
  }

  if (holder === state.longestRoad.holder && length === state.longestRoad.length) {
    return { state, event: null };
  }

  const event: LongestRoadChangedEvent = { type: 'LongestRoadChanged', holder, length };
  return { state: { ...state, longestRoad: { holder, length } }, event };
}
