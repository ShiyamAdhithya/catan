import { registerHandler, type CommandHandler } from '../engine.js';
import { err, ok } from '../result.js';
import type { EndTurnCommand } from '../commands.js';
import type { Event } from '../events.js';

export const endTurnHandler: CommandHandler<EndTurnCommand> = {
  validate(state, command) {
    if (state.phase !== 'MAIN') {
      return err({ type: 'WrongPhase', expected: ['MAIN'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    return ok(true);
  },

  apply(state): Event[] {
    const index = state.playerOrder.indexOf(state.currentPlayerId);
    const nextPlayerId = state.playerOrder[(index + 1) % state.playerOrder.length];
    return [{ type: 'TurnEnded', nextPlayerId }];
  },
};

registerHandler('EndTurn', endTurnHandler);
