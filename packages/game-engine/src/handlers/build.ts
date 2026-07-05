import { BUILD_COSTS } from '../constants.js';
import { registerHandler, type CommandHandler } from '../engine.js';
import {
  hasResources,
  isConnectedToPlayerRoad,
  isEdgeConnectedToPlayerNetwork,
  violatesDistanceRule,
} from '../helpers.js';
import { err, ok } from '../result.js';
import type { BuildCityCommand, BuildRoadCommand, BuildSettlementCommand } from '../commands.js';
import type { Event } from '../events.js';

export const buildRoadHandler: CommandHandler<BuildRoadCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    const edge = state.board.edges.find((e) => e.id === command.edgeId);
    if (!edge) return err({ type: 'InvalidTarget', reason: 'Unknown edge' });
    if (edge.road !== null) return err({ type: 'IllegalPlacement', reason: 'Edge already has a road' });
    const player = state.players[command.playerId];
    if (player.piecesRemaining.roads <= 0) return err({ type: 'NoPiecesRemaining', piece: 'road' });
    if (!hasResources(player.resources, BUILD_COSTS.road)) {
      return err({ type: 'InsufficientResources', needed: BUILD_COSTS.road });
    }
    if (!isEdgeConnectedToPlayerNetwork(state.board, command.edgeId, command.playerId)) {
      return err({ type: 'IllegalPlacement', reason: 'Not connected to your road network' });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [
      { type: 'RoadBuilt', playerId: command.playerId, edgeId: command.edgeId },
      { type: 'ResourcesSpent', playerId: command.playerId, resources: BUILD_COSTS.road },
    ];
  },
};

export const buildSettlementHandler: CommandHandler<BuildSettlementCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    const vertex = state.board.vertices.find((v) => v.id === command.vertexId);
    if (!vertex) return err({ type: 'InvalidTarget', reason: 'Unknown vertex' });
    if (vertex.building !== null) {
      return err({ type: 'IllegalPlacement', reason: 'Vertex is already occupied' });
    }
    const player = state.players[command.playerId];
    if (player.piecesRemaining.settlements <= 0) {
      return err({ type: 'NoPiecesRemaining', piece: 'settlement' });
    }
    if (!hasResources(player.resources, BUILD_COSTS.settlement)) {
      return err({ type: 'InsufficientResources', needed: BUILD_COSTS.settlement });
    }
    if (violatesDistanceRule(state.board, command.vertexId)) {
      return err({ type: 'IllegalPlacement', reason: 'Too close to an existing settlement' });
    }
    if (!isConnectedToPlayerRoad(state.board, command.vertexId, command.playerId)) {
      return err({ type: 'IllegalPlacement', reason: 'Not connected to your road network' });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [
      { type: 'SettlementBuilt', playerId: command.playerId, vertexId: command.vertexId },
      { type: 'ResourcesSpent', playerId: command.playerId, resources: BUILD_COSTS.settlement },
    ];
  },
};

export const buildCityHandler: CommandHandler<BuildCityCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    const vertex = state.board.vertices.find((v) => v.id === command.vertexId);
    if (!vertex || vertex.building === null || vertex.building.type !== 'SETTLEMENT' || vertex.building.playerId !== command.playerId) {
      return err({ type: 'IllegalPlacement', reason: 'Must upgrade your own settlement' });
    }
    const player = state.players[command.playerId];
    if (player.piecesRemaining.cities <= 0) {
      return err({ type: 'NoPiecesRemaining', piece: 'city' });
    }
    if (!hasResources(player.resources, BUILD_COSTS.city)) {
      return err({ type: 'InsufficientResources', needed: BUILD_COSTS.city });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [
      { type: 'CityUpgraded', playerId: command.playerId, vertexId: command.vertexId },
      { type: 'ResourcesSpent', playerId: command.playerId, resources: BUILD_COSTS.city },
    ];
  },
};

registerHandler('BuildRoad', buildRoadHandler);
registerHandler('BuildSettlement', buildSettlementHandler);
registerHandler('BuildCity', buildCityHandler);
