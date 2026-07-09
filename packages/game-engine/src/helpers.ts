import type { Board, EdgeId, GameState, PlayerId, ResourceType, VertexId } from './types.js';

export function hasResources(
  resources: Record<ResourceType, number>,
  cost: Partial<Record<ResourceType, number>>,
): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(
    ([resource, amount]) => resources[resource] >= amount,
  );
}

export function subtractResources(
  resources: Record<ResourceType, number>,
  cost: Partial<Record<ResourceType, number>>,
): Record<ResourceType, number> {
  const next = { ...resources };
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    next[resource] -= amount;
  }
  return next;
}

export function addResources(
  resources: Record<ResourceType, number>,
  gained: Partial<Record<ResourceType, number>>,
): Record<ResourceType, number> {
  const next = { ...resources };
  for (const [resource, amount] of Object.entries(gained) as [ResourceType, number][]) {
    next[resource] += amount;
  }
  return next;
}

export function violatesDistanceRule(board: Board, vertexId: VertexId): boolean {
  const vertex = board.vertices.find((v) => v.id === vertexId)!;
  return vertex.adjacentVertexIds.some((neighborId) => {
    const neighbor = board.vertices.find((v) => v.id === neighborId)!;
    return neighbor.building !== null;
  });
}

export function isConnectedToPlayerRoad(
  board: Board,
  vertexId: VertexId,
  playerId: PlayerId,
): boolean {
  const vertex = board.vertices.find((v) => v.id === vertexId)!;
  return vertex.adjacentEdgeIds.some((edgeId) => {
    const edge = board.edges.find((e) => e.id === edgeId)!;
    return edge.road?.playerId === playerId;
  });
}

export function isEdgeConnectedToPlayerNetwork(
  board: Board,
  edgeId: EdgeId,
  playerId: PlayerId,
): boolean {
  const edge = board.edges.find((e) => e.id === edgeId)!;
  return edge.vertexIds.some((vertexId) => {
    const vertex = board.vertices.find((v) => v.id === vertexId)!;
    if (vertex.building?.playerId === playerId) return true;
    return vertex.adjacentEdgeIds.some((neighborEdgeId) => {
      if (neighborEdgeId === edgeId) return false;
      const neighborEdge = board.edges.find((e) => e.id === neighborEdgeId)!;
      return neighborEdge.road?.playerId === playerId;
    });
  });
}

export function setupTurnOrder(playerOrder: PlayerId[], round: 1 | 2): PlayerId[] {
  return round === 1 ? [...playerOrder] : [...playerOrder].reverse();
}

export function advanceAfterSetupRoad(
  state: Pick<GameState, 'playerOrder' | 'currentPlayerId' | 'setupRound'>,
): { phase: 'SETUP_SETTLEMENT' | 'ROLL'; currentPlayerId: PlayerId; setupRound: 1 | 2 | null } {
  const round = state.setupRound as 1 | 2;
  const order = setupTurnOrder(state.playerOrder, round);
  const index = order.indexOf(state.currentPlayerId);

  if (index < order.length - 1) {
    return { phase: 'SETUP_SETTLEMENT', currentPlayerId: order[index + 1], setupRound: round };
  }
  if (round === 1) {
    return { phase: 'SETUP_SETTLEMENT', currentPlayerId: state.currentPlayerId, setupRound: 2 };
  }
  return { phase: 'ROLL', currentPlayerId: state.playerOrder[0], setupRound: null };
}
