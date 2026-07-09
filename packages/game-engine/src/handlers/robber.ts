import { registerHandler, type CommandHandler } from '../engine.js';
import { hasResources } from '../helpers.js';
import { err, ok } from '../result.js';
import type { DiscardResourcesCommand, MoveRobberCommand, StealResourceCommand } from '../commands.js';
import type { Event } from '../events.js';
import type { PlayerId, ResourceType } from '../types.js';

export const discardResourcesHandler: CommandHandler<DiscardResourcesCommand> = {
  validate(state, command) {
    if (state.phase !== 'DISCARD') {
      return err({ type: 'WrongPhase', expected: ['DISCARD'], actual: state.phase });
    }
    if (!state.pendingDiscards.includes(command.playerId)) {
      return err({ type: 'InvalidTarget', reason: 'Player does not owe a discard' });
    }
    const player = state.players[command.playerId];
    const totalCards = Object.values(player.resources).reduce((a, b) => a + b, 0);
    const required = Math.floor(totalCards / 2);
    const provided = Object.values(command.discarded).reduce((a, b) => a + (b ?? 0), 0);
    if (provided !== required) {
      return err({ type: 'InvalidDiscardAmount', required, provided });
    }
    if (!hasResources(player.resources, command.discarded)) {
      return err({ type: 'InsufficientResources', needed: command.discarded });
    }
    return ok(true);
  },

  apply(_state, command): Event[] {
    return [{ type: 'ResourcesDiscarded', playerId: command.playerId, resources: command.discarded }];
  },
};

export const moveRobberHandler: CommandHandler<MoveRobberCommand> = {
  validate(state, command) {
    if (state.phase !== 'MOVE_ROBBER') {
      return err({ type: 'WrongPhase', expected: ['MOVE_ROBBER'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    const hex = state.board.hexes.find((h) => h.id === command.hexId);
    if (!hex) {
      return err({ type: 'InvalidTarget', reason: 'Unknown hex' });
    }
    if (command.hexId === state.board.robberHexId) {
      return err({ type: 'IllegalPlacement', reason: 'Robber must move to a different hex' });
    }
    return ok(true);
  },

  apply(state, command): Event[] {
    const targets = new Set<PlayerId>();
    for (const vertex of state.board.vertices) {
      if (!vertex.building || vertex.building.playerId === command.playerId) continue;
      if (!vertex.adjacentHexIds.includes(command.hexId)) continue;
      const victim = state.players[vertex.building.playerId];
      const totalCards = Object.values(victim.resources).reduce((a, b) => a + b, 0);
      if (totalCards > 0) targets.add(vertex.building.playerId);
    }
    return [{ type: 'RobberMoved', hexId: command.hexId, stealTargets: [...targets] }];
  },
};

export const stealResourceHandler: CommandHandler<StealResourceCommand> = {
  validate(state, command) {
    if (state.phase !== 'STEAL') {
      return err({ type: 'WrongPhase', expected: ['STEAL'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    if (!state.pendingRobberSteal?.targets.includes(command.targetPlayerId)) {
      return err({ type: 'InvalidTarget', reason: 'Not a valid steal target' });
    }
    return ok(true);
  },

  apply(state, command): Event[] {
    const victim = state.players[command.targetPlayerId];
    const hand: ResourceType[] = [];
    for (const [resource, count] of Object.entries(victim.resources) as [ResourceType, number][]) {
      for (let i = 0; i < count; i++) hand.push(resource);
    }
    const resource =
      hand.length > 0 ? hand[((command.randomIndex % hand.length) + hand.length) % hand.length] : null;
    return [
      { type: 'ResourceStolen', thiefId: command.playerId, victimId: command.targetPlayerId, resource },
    ];
  },
};

registerHandler('DiscardResources', discardResourcesHandler);
registerHandler('MoveRobber', moveRobberHandler);
registerHandler('StealResource', stealResourceHandler);
