import { BUILD_COSTS } from '../constants.js';
import { registerHandler, type CommandHandler } from '../engine.js';
import { hasResources, isEdgeConnectedToPlayerNetwork } from '../helpers.js';
import { err, ok } from '../result.js';
import type { BuyDevelopmentCardCommand, PlayDevelopmentCardCommand } from '../commands.js';
import type { Event } from '../events.js';
import type { Board, GameState, ResourceType } from '../types.js';

export const buyDevelopmentCardHandler: CommandHandler<BuyDevelopmentCardCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    if (state.bank.devCards.length === 0) {
      return err({ type: 'NoCardsToDraw' });
    }
    if (state.bank.devCards[0].id !== command.card.id) {
      return err({ type: 'InvalidTarget', reason: 'Declared card does not match the top of the deck' });
    }
    const player = state.players[command.playerId];
    if (!hasResources(player.resources, BUILD_COSTS.developmentCard)) {
      return err({ type: 'InsufficientResources', needed: BUILD_COSTS.developmentCard });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [
      { type: 'DevelopmentCardBought', playerId: command.playerId, card: command.card },
      { type: 'ResourcesSpent', playerId: command.playerId, resources: BUILD_COSTS.developmentCard },
    ];
  },
};

function isConnectedForRoadBuilding(
  board: Board,
  edgeId: string,
  playerId: string,
  otherEdgeId: string,
): boolean {
  if (isEdgeConnectedToPlayerNetwork(board, edgeId, playerId)) return true;
  const edge = board.edges.find((e) => e.id === edgeId)!;
  const other = board.edges.find((e) => e.id === otherEdgeId)!;
  return edge.vertexIds.some((v) => other.vertexIds.includes(v));
}

export const playDevelopmentCardHandler: CommandHandler<PlayDevelopmentCardCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    if (state.devCardPlayedThisTurn) {
      return err({ type: 'DevCardAlreadyPlayedThisTurn' });
    }
    const player = state.players[command.playerId];
    const card = player.devCards.find((c) => c.id === command.cardId);
    if (!card) {
      return err({ type: 'DevCardNotOwned' });
    }
    if (state.devCardsBoughtThisTurn.includes(command.cardId)) {
      return err({ type: 'DevCardBoughtThisTurn' });
    }
    if (card.type === 'VICTORY_POINT') {
      return err({ type: 'InvalidTarget', reason: 'Victory Point cards cannot be played' });
    }

    if (card.type === 'ROAD_BUILDING') {
      const payload = command.roadBuilding;
      if (!payload) return err({ type: 'InvalidTarget', reason: 'Missing roadBuilding payload' });
      const [edgeAId, edgeBId] = payload.edgeIds;
      if (edgeAId === edgeBId) {
        return err({ type: 'IllegalPlacement', reason: 'Must choose two distinct edges' });
      }
      for (const edgeId of payload.edgeIds) {
        const edge = state.board.edges.find((e) => e.id === edgeId);
        if (!edge) return err({ type: 'InvalidTarget', reason: 'Unknown edge' });
        if (edge.road !== null) return err({ type: 'IllegalPlacement', reason: 'Edge already has a road' });
      }
      if (player.piecesRemaining.roads < 2) {
        return err({ type: 'NoPiecesRemaining', piece: 'road' });
      }
      if (
        !isConnectedForRoadBuilding(state.board, edgeAId, command.playerId, edgeBId) &&
        !isConnectedForRoadBuilding(state.board, edgeBId, command.playerId, edgeAId)
      ) {
        return err({ type: 'IllegalPlacement', reason: 'Neither edge connects to your road network' });
      }
    }

    if (card.type === 'YEAR_OF_PLENTY') {
      const payload = command.yearOfPlenty;
      if (!payload) return err({ type: 'InvalidTarget', reason: 'Missing yearOfPlenty payload' });
      const demand: Partial<Record<ResourceType, number>> = {};
      for (const resource of payload.resources) {
        demand[resource] = (demand[resource] ?? 0) + 1;
      }
      if (!hasResources(state.bank.resources, demand)) {
        return err({ type: 'InsufficientResources', needed: demand });
      }
    }

    if (card.type === 'MONOPOLY' && !command.monopoly) {
      return err({ type: 'InvalidTarget', reason: 'Missing monopoly payload' });
    }

    return ok(true);
  },

  apply(state, command): Event[] {
    const player = state.players[command.playerId];
    const card = player.devCards.find((c) => c.id === command.cardId)!;

    if (card.type === 'KNIGHT') {
      return [{ type: 'KnightPlayed', playerId: command.playerId, cardId: command.cardId }];
    }

    if (card.type === 'ROAD_BUILDING') {
      const [edgeAId, edgeBId] = command.roadBuilding!.edgeIds;
      return [
        { type: 'RoadBuildingPlayed', playerId: command.playerId, cardId: command.cardId },
        { type: 'RoadBuilt', playerId: command.playerId, edgeId: edgeAId },
        { type: 'RoadBuilt', playerId: command.playerId, edgeId: edgeBId },
      ];
    }

    if (card.type === 'YEAR_OF_PLENTY') {
      return [
        {
          type: 'YearOfPlentyPlayed',
          playerId: command.playerId,
          cardId: command.cardId,
          resources: command.yearOfPlenty!.resources,
        },
      ];
    }

    // MONOPOLY
    const resource = command.monopoly!.resource;
    const totalStolen = Object.entries(state.players)
      .filter(([id]) => id !== command.playerId)
      .reduce((sum, [, p]: [string, GameState['players'][string]]) => sum + p.resources[resource], 0);
    return [
      {
        type: 'MonopolyPlayed',
        playerId: command.playerId,
        cardId: command.cardId,
        resource,
        totalStolen,
      },
    ];
  },
};

registerHandler('BuyDevelopmentCard', buyDevelopmentCardHandler);
registerHandler('PlayDevelopmentCard', playDevelopmentCardHandler);
