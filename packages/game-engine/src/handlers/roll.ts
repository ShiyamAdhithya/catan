import { registerHandler, type CommandHandler } from '../engine.js';
import { err, ok } from '../result.js';
import type { RollDiceCommand } from '../commands.js';
import type { Event } from '../events.js';
import type { GameState, PlayerId, ResourceType } from '../types.js';

function isValidDie(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

function computeRollProduction(
  state: GameState,
  total: number,
): Record<PlayerId, Partial<Record<ResourceType, number>>> {
  const demand: Record<PlayerId, Partial<Record<ResourceType, number>>> = {};
  for (const playerId of state.playerOrder) demand[playerId] = {};

  for (const vertex of state.board.vertices) {
    if (!vertex.building) continue;
    const amount = vertex.building.type === 'CITY' ? 2 : 1;
    for (const hexId of vertex.adjacentHexIds) {
      if (hexId === state.board.robberHexId) continue;
      const hex = state.board.hexes.find((h) => h.id === hexId)!;
      if (hex.number !== total || hex.resource === 'DESERT') continue;
      const playerDemand = demand[vertex.building.playerId];
      playerDemand[hex.resource] = (playerDemand[hex.resource] ?? 0) + amount;
    }
  }

  const totalsByResource: Partial<Record<ResourceType, number>> = {};
  const demandersByResource: Partial<Record<ResourceType, Set<PlayerId>>> = {};
  for (const [playerId, playerDemand] of Object.entries(demand)) {
    for (const [resource, amount] of Object.entries(playerDemand) as [ResourceType, number][]) {
      totalsByResource[resource] = (totalsByResource[resource] ?? 0) + amount;
      const demanders = demandersByResource[resource] ?? new Set<PlayerId>();
      demanders.add(playerId);
      demandersByResource[resource] = demanders;
    }
  }

  const shortResources = new Set(
    (Object.entries(totalsByResource) as [ResourceType, number][])
      .filter(([resource, amount]) => amount > state.bank.resources[resource])
      .map(([resource]) => resource),
  );

  // Sole-entitled-player exception: when only one distinct player demands a short
  // resource, the "no one gets it" rule doesn't apply — that player still receives
  // whatever the bank has left of it (not their full demand, since by definition the
  // bank can't cover that).
  const soleEntitledResources = new Set(
    [...shortResources].filter((resource) => (demandersByResource[resource]?.size ?? 0) === 1),
  );

  const result: Record<PlayerId, Partial<Record<ResourceType, number>>> = {};
  for (const [playerId, playerDemand] of Object.entries(demand)) {
    const filtered: Partial<Record<ResourceType, number>> = {};
    for (const [resource, amount] of Object.entries(playerDemand) as [ResourceType, number][]) {
      if (!shortResources.has(resource)) {
        filtered[resource] = amount;
      } else if (soleEntitledResources.has(resource)) {
        const remaining = state.bank.resources[resource];
        if (remaining > 0) filtered[resource] = remaining;
      }
    }
    result[playerId] = filtered;
  }
  return result;
}

export const rollDiceHandler: CommandHandler<RollDiceCommand> = {
  validate(state, command) {
    if (state.phase !== 'ROLL') {
      return err({ type: 'WrongPhase', expected: ['ROLL'], actual: state.phase });
    }
    if (command.playerId !== state.currentPlayerId) {
      return err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId });
    }
    if (!isValidDie(command.die1) || !isValidDie(command.die2)) {
      return err({ type: 'InvalidTarget', reason: 'Die values must be integers between 1 and 6' });
    }
    return ok(true);
  },

  apply(state, command): Event[] {
    const total = command.die1 + command.die2;

    if (total === 7) {
      const playersToDiscard = state.playerOrder.filter((playerId) => {
        const count = Object.values(state.players[playerId].resources).reduce((a, b) => a + b, 0);
        return count > 7;
      });
      return [
        { type: 'DiceRolled', die1: command.die1, die2: command.die2, total, playersToDiscard },
      ];
    }

    const events: Event[] = [
      { type: 'DiceRolled', die1: command.die1, die2: command.die2, total, playersToDiscard: [] },
    ];
    const production = computeRollProduction(state, total);
    for (const [playerId, resources] of Object.entries(production)) {
      if (Object.keys(resources).length > 0) {
        events.push({ type: 'ResourcesGained', playerId, resources });
      }
    }
    return events;
  },
};

registerHandler('RollDice', rollDiceHandler);
