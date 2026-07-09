import { registerHandler, type CommandHandler } from '../engine.js';
import { violatesDistanceRule } from '../helpers.js';
import { err, ok } from '../result.js';
import type { PlaceInitialRoadCommand, PlaceInitialSettlementCommand } from '../commands.js';
import type { Event } from '../events.js';
import type { Board, PlayerId, ResourceType, VertexId } from '../types.js';

function findUnroadedSettlement(board: Board, playerId: PlayerId): VertexId | null {
  const vertex = board.vertices.find(
    (v) =>
      v.building?.playerId === playerId &&
      v.building.type === 'SETTLEMENT' &&
      !v.adjacentEdgeIds.some((edgeId) => {
        const edge = board.edges.find((e) => e.id === edgeId)!;
        return edge.road?.playerId === playerId;
      }),
  );
  return vertex?.id ?? null;
}

export const placeInitialSettlementHandler: CommandHandler<PlaceInitialSettlementCommand> = {
  validate(state, command) {
    if (state.phase !== 'SETUP_SETTLEMENT') {
      return err({ type: 'WrongPhase', expected: ['SETUP_SETTLEMENT'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    const vertex = state.board.vertices.find((v) => v.id === command.vertexId);
    if (!vertex) {
      return err({ type: 'InvalidTarget', reason: 'Unknown vertex' });
    }
    if (vertex.building !== null) {
      return err({ type: 'IllegalPlacement', reason: 'Vertex is already occupied' });
    }
    if (violatesDistanceRule(state.board, command.vertexId)) {
      return err({ type: 'IllegalPlacement', reason: 'Too close to an existing settlement' });
    }
    return ok(true);
  },

  apply(state, command): Event[] {
    const events: Event[] = [
      { type: 'SettlementBuilt', playerId: command.playerId, vertexId: command.vertexId },
    ];
    if (state.setupRound === 2) {
      const vertex = state.board.vertices.find((v) => v.id === command.vertexId)!;
      const resources: Partial<Record<ResourceType, number>> = {};
      for (const hexId of vertex.adjacentHexIds) {
        const hex = state.board.hexes.find((h) => h.id === hexId)!;
        if (hex.resource !== 'DESERT') {
          resources[hex.resource] = (resources[hex.resource] ?? 0) + 1;
        }
      }
      if (Object.keys(resources).length > 0) {
        events.push({ type: 'ResourcesGained', playerId: command.playerId, resources });
      }
    }
    return events;
  },
};

export const placeInitialRoadHandler: CommandHandler<PlaceInitialRoadCommand> = {
  validate(state, command) {
    if (state.phase !== 'SETUP_ROAD') {
      return err({ type: 'WrongPhase', expected: ['SETUP_ROAD'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    const edge = state.board.edges.find((e) => e.id === command.edgeId);
    if (!edge) {
      return err({ type: 'InvalidTarget', reason: 'Unknown edge' });
    }
    if (edge.road !== null) {
      return err({ type: 'IllegalPlacement', reason: 'Edge already has a road' });
    }
    const settlementId = findUnroadedSettlement(state.board, command.playerId);
    if (!settlementId || !edge.vertexIds.includes(settlementId)) {
      return err({
        type: 'IllegalPlacement',
        reason: 'Road must connect to the settlement just placed',
      });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [{ type: 'RoadBuilt', playerId: command.playerId, edgeId: command.edgeId }];
  },
};

registerHandler('PlaceInitialSettlement', placeInitialSettlementHandler);
registerHandler('PlaceInitialRoad', placeInitialRoadHandler);
