import { registerHandler, type CommandHandler } from '../engine.js';
import { hasResources } from '../helpers.js';
import { err, ok } from '../result.js';
import type { TradeWithBankCommand } from '../commands.js';
import type { Board, PlayerId, ResourceType } from '../types.js';
import type { Event } from '../events.js';

function hasGenericPort(board: Board, playerId: PlayerId): boolean {
  return board.ports.some(
    (port) =>
      port.kind.type === 'GENERIC' &&
      port.vertexIds.some((vertexId) => {
        const vertex = board.vertices.find((v) => v.id === vertexId)!;
        return vertex.building?.playerId === playerId;
      }),
  );
}

function hasResourcePort(board: Board, playerId: PlayerId, resource: ResourceType): boolean {
  return board.ports.some(
    (port) =>
      port.kind.type === 'RESOURCE' &&
      port.kind.resource === resource &&
      port.vertexIds.some((vertexId) => {
        const vertex = board.vertices.find((v) => v.id === vertexId)!;
        return vertex.building?.playerId === playerId;
      }),
  );
}

export const tradeWithBankHandler: CommandHandler<TradeWithBankCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    if (command.give === command.receive) {
      return err({ type: 'InvalidTarget', reason: 'Cannot trade a resource for itself' });
    }
    const hasAccess =
      command.giveAmount === 4 ||
      (command.giveAmount === 3 && hasGenericPort(state.board, command.playerId)) ||
      (command.giveAmount === 2 && hasResourcePort(state.board, command.playerId, command.give));
    if (!hasAccess) {
      return err({ type: 'InvalidTarget', reason: 'No port access for that trade ratio' });
    }
    const player = state.players[command.playerId];
    if (!hasResources(player.resources, { [command.give]: command.giveAmount })) {
      return err({ type: 'InsufficientResources', needed: { [command.give]: command.giveAmount } });
    }
    if (state.bank.resources[command.receive] < 1) {
      return err({ type: 'InsufficientResources', needed: { [command.receive]: 1 } });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [
      {
        type: 'ResourcesTraded',
        playerId: command.playerId,
        give: command.give,
        giveAmount: command.giveAmount,
        receive: command.receive,
      },
    ];
  },
};

registerHandler('TradeWithBank', tradeWithBankHandler);
