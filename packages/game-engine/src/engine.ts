import type { Board, Edge, GameState, PlayerId, PlayerState, ResourceType, Vertex } from './types.js';
import type {
  BuildCityCommand,
  BuildRoadCommand,
  BuildSettlementCommand,
  BuyDevelopmentCardCommand,
  Command,
  DiscardResourcesCommand,
  EndTurnCommand,
  MoveRobberCommand,
  PlaceInitialRoadCommand,
  PlaceInitialSettlementCommand,
  PlayDevelopmentCardCommand,
  RollDiceCommand,
  StealResourceCommand,
  TradeWithBankCommand,
} from './commands.js';
import type { Event } from './events.js';
import { ok, type Result } from './result.js';
import { addResources, advanceAfterSetupRoad, subtractResources } from './helpers.js';
import { recalculateLongestRoad } from './rules/longestRoad.js';

export interface CommandHandler<C extends Command> {
  validate(state: GameState, command: C): Result<true>;
  apply(state: GameState, command: C): Event[];
}

type HandlerRegistry = {
  [K in Command['type']]?: CommandHandler<Extract<Command, { type: K }>>;
};

const registry: HandlerRegistry = {};

// Overloaded (not a single generic signature): a generic registerHandler<K>(type: K, handler: ...)
// lets TypeScript infer K independently from each argument and widen it to a union across two
// unrelated call sites, which — combined with bivariant method-parameter checking on
// CommandHandler's validate/apply — silently accepts a handler registered under the wrong
// command type with zero compile errors. One literal overload per command type closes that hole:
// callers are checked against the exact matching signature, not a generic inference.
export function registerHandler(
  type: 'PlaceInitialSettlement',
  handler: CommandHandler<PlaceInitialSettlementCommand>,
): void;
export function registerHandler(
  type: 'PlaceInitialRoad',
  handler: CommandHandler<PlaceInitialRoadCommand>,
): void;
export function registerHandler(type: 'RollDice', handler: CommandHandler<RollDiceCommand>): void;
export function registerHandler(
  type: 'DiscardResources',
  handler: CommandHandler<DiscardResourcesCommand>,
): void;
export function registerHandler(type: 'MoveRobber', handler: CommandHandler<MoveRobberCommand>): void;
export function registerHandler(
  type: 'StealResource',
  handler: CommandHandler<StealResourceCommand>,
): void;
export function registerHandler(type: 'BuildRoad', handler: CommandHandler<BuildRoadCommand>): void;
export function registerHandler(
  type: 'BuildSettlement',
  handler: CommandHandler<BuildSettlementCommand>,
): void;
export function registerHandler(type: 'BuildCity', handler: CommandHandler<BuildCityCommand>): void;
export function registerHandler(
  type: 'BuyDevelopmentCard',
  handler: CommandHandler<BuyDevelopmentCardCommand>,
): void;
export function registerHandler(
  type: 'PlayDevelopmentCard',
  handler: CommandHandler<PlayDevelopmentCardCommand>,
): void;
export function registerHandler(
  type: 'TradeWithBank',
  handler: CommandHandler<TradeWithBankCommand>,
): void;
export function registerHandler(type: 'EndTurn', handler: CommandHandler<EndTurnCommand>): void;
export function registerHandler<K extends Command['type']>(
  type: K,
  handler: CommandHandler<Extract<Command, { type: K }>>,
): void {
  // TypeScript can't verify soundness of assigning through a generic key into
  // a mapped type (a known limitation, not a real type hole here: K's usage in
  // the handler param and the registry key are tied together by the caller's
  // own type signature), so a narrow cast is required at this single site.
  registry[type] = handler as HandlerRegistry[K];
}

function updateVertex(board: Board, vertexId: string, update: Partial<Vertex>): Board {
  return {
    ...board,
    vertices: board.vertices.map((v) => (v.id === vertexId ? { ...v, ...update } : v)),
  };
}

function updateEdge(board: Board, edgeId: string, update: Partial<Edge>): Board {
  return {
    ...board,
    edges: board.edges.map((e) => (e.id === edgeId ? { ...e, ...update } : e)),
  };
}

function updatePlayer(
  state: GameState,
  playerId: PlayerId,
  update: (player: PlayerState) => PlayerState,
): GameState {
  return {
    ...state,
    players: { ...state.players, [playerId]: update(state.players[playerId]) },
  };
}

function movePlayedCard(player: PlayerState, cardId: string): PlayerState {
  const card = player.devCards.find((c) => c.id === cardId)!;
  return {
    ...player,
    devCards: player.devCards.filter((c) => c.id !== cardId),
    playedDevCards: [...player.playedDevCards, card],
  };
}

export function reduceEvent(state: GameState, event: Event): GameState {
  switch (event.type) {
    case 'SettlementBuilt': {
      let next: GameState = {
        ...state,
        board: updateVertex(state.board, event.vertexId, {
          building: { type: 'SETTLEMENT', playerId: event.playerId },
        }),
      };
      next = updatePlayer(next, event.playerId, (p) => ({
        ...p,
        piecesRemaining: { ...p.piecesRemaining, settlements: p.piecesRemaining.settlements - 1 },
      }));
      if (state.phase === 'SETUP_SETTLEMENT') {
        next = { ...next, phase: 'SETUP_ROAD' };
      }
      return next;
    }

    case 'RoadBuilt': {
      let next: GameState = {
        ...state,
        board: updateEdge(state.board, event.edgeId, { road: { playerId: event.playerId } }),
      };
      next = updatePlayer(next, event.playerId, (p) => ({
        ...p,
        piecesRemaining: { ...p.piecesRemaining, roads: p.piecesRemaining.roads - 1 },
      }));
      if (state.phase === 'SETUP_ROAD') {
        next = { ...next, ...advanceAfterSetupRoad(state) };
      }
      return next;
    }

    case 'ResourcesGained': {
      let next = updatePlayer(state, event.playerId, (p) => ({
        ...p,
        resources: addResources(p.resources, event.resources),
      }));
      next = {
        ...next,
        bank: { ...next.bank, resources: subtractResources(next.bank.resources, event.resources) },
      };
      return next;
    }

    case 'ResourcesSpent': {
      let next = updatePlayer(state, event.playerId, (p) => ({
        ...p,
        resources: subtractResources(p.resources, event.resources),
      }));
      next = {
        ...next,
        bank: { ...next.bank, resources: addResources(next.bank.resources, event.resources) },
      };
      return next;
    }

    case 'DiceRolled': {
      if (event.total === 7) {
        return {
          ...state,
          pendingDiscards: event.playersToDiscard,
          phase: event.playersToDiscard.length > 0 ? 'DISCARD' : 'MOVE_ROBBER',
        };
      }
      return { ...state, phase: 'MAIN' };
    }

    case 'ResourcesDiscarded': {
      let next = updatePlayer(state, event.playerId, (p) => ({
        ...p,
        resources: subtractResources(p.resources, event.resources),
      }));
      next = {
        ...next,
        bank: { ...next.bank, resources: addResources(next.bank.resources, event.resources) },
      };
      const remaining = next.pendingDiscards.filter((id) => id !== event.playerId);
      return { ...next, pendingDiscards: remaining, phase: remaining.length === 0 ? 'MOVE_ROBBER' : 'DISCARD' };
    }

    case 'RobberMoved': {
      return {
        ...state,
        board: { ...state.board, robberHexId: event.hexId },
        pendingRobberSteal: event.stealTargets.length > 0 ? { targets: event.stealTargets } : null,
        phase: event.stealTargets.length > 0 ? 'STEAL' : 'MAIN',
      };
    }

    case 'ResourceStolen': {
      const resource = event.resource;
      if (resource === null) {
        return { ...state, pendingRobberSteal: null, phase: 'MAIN' };
      }
      let next = updatePlayer(state, event.victimId, (p) => ({
        ...p,
        resources: subtractResources(p.resources, { [resource]: 1 }),
      }));
      next = updatePlayer(next, event.thiefId, (p) => ({
        ...p,
        resources: addResources(p.resources, { [resource]: 1 }),
      }));
      return { ...next, pendingRobberSteal: null, phase: 'MAIN' };
    }

    case 'CityUpgraded': {
      let next: GameState = {
        ...state,
        board: updateVertex(state.board, event.vertexId, {
          building: { type: 'CITY', playerId: event.playerId },
        }),
      };
      next = updatePlayer(next, event.playerId, (p) => ({
        ...p,
        piecesRemaining: {
          ...p.piecesRemaining,
          cities: p.piecesRemaining.cities - 1,
          settlements: p.piecesRemaining.settlements + 1,
        },
      }));
      return next;
    }

    case 'DevelopmentCardBought': {
      let next = updatePlayer(state, event.playerId, (p) => ({
        ...p,
        devCards: [...p.devCards, event.card],
      }));
      next = {
        ...next,
        bank: { ...next.bank, devCards: next.bank.devCards.filter((c) => c.id !== event.card.id) },
        devCardsBoughtThisTurn: [...next.devCardsBoughtThisTurn, event.card.id],
      };
      return next;
    }

    case 'KnightPlayed': {
      return updatePlayer(
        { ...state, devCardPlayedThisTurn: true, phase: 'MOVE_ROBBER' },
        event.playerId,
        (p) => movePlayedCard(p, event.cardId),
      );
    }

    case 'RoadBuildingPlayed': {
      return updatePlayer({ ...state, devCardPlayedThisTurn: true }, event.playerId, (p) =>
        movePlayedCard(p, event.cardId),
      );
    }

    case 'YearOfPlentyPlayed': {
      let next = updatePlayer({ ...state, devCardPlayedThisTurn: true }, event.playerId, (p) =>
        movePlayedCard(p, event.cardId),
      );
      const gained: Partial<Record<ResourceType, number>> = {};
      for (const resource of event.resources) {
        gained[resource] = (gained[resource] ?? 0) + 1;
      }
      next = updatePlayer(next, event.playerId, (p) => ({ ...p, resources: addResources(p.resources, gained) }));
      next = { ...next, bank: { ...next.bank, resources: subtractResources(next.bank.resources, gained) } };
      return next;
    }

    case 'MonopolyPlayed': {
      let next = updatePlayer({ ...state, devCardPlayedThisTurn: true }, event.playerId, (p) =>
        movePlayedCard(p, event.cardId),
      );
      for (const otherId of Object.keys(next.players)) {
        if (otherId === event.playerId) continue;
        next = updatePlayer(next, otherId, (p) => ({
          ...p,
          resources: { ...p.resources, [event.resource]: 0 },
        }));
      }
      next = updatePlayer(next, event.playerId, (p) => ({
        ...p,
        resources: addResources(p.resources, { [event.resource]: event.totalStolen }),
      }));
      return next;
    }

    case 'ResourcesTraded': {
      let next = updatePlayer(state, event.playerId, (p) => ({
        ...p,
        resources: addResources(subtractResources(p.resources, { [event.give]: event.giveAmount }), {
          [event.receive]: 1,
        }),
      }));
      next = {
        ...next,
        bank: {
          ...next.bank,
          resources: subtractResources(addResources(next.bank.resources, { [event.give]: event.giveAmount }), {
            [event.receive]: 1,
          }),
        },
      };
      return next;
    }

    case 'TurnEnded': {
      return {
        ...state,
        currentPlayerId: event.nextPlayerId,
        turnNumber: state.turnNumber + 1,
        phase: 'ROLL',
        devCardPlayedThisTurn: false,
        devCardsBoughtThisTurn: [],
      };
    }

    case 'LongestRoadChanged': {
      return { ...state, longestRoad: { holder: event.holder, length: event.length } };
    }

    case 'LargestArmyChanged': {
      return { ...state, largestArmy: { holder: event.holder, count: event.count } };
    }

    case 'GameWon': {
      return { ...state, winner: event.playerId, phase: 'GAME_OVER' };
    }
  }
}

export function applyCommand(
  state: GameState,
  command: Command,
): Result<{ state: GameState; events: Event[] }> {
  const handler = registry[command.type] as CommandHandler<Command> | undefined;
  if (!handler) {
    throw new Error(`No handler registered for command type: ${command.type}`);
  }
  const validation = handler.validate(state, command);
  if (!validation.ok) return validation;

  const commandEvents = handler.apply(state, command);
  let nextState = commandEvents.reduce(reduceEvent, state);

  const longestRoadResult = recalculateLongestRoad(nextState);
  nextState = longestRoadResult.state;

  const allEvents = [...commandEvents, ...(longestRoadResult.event ? [longestRoadResult.event] : [])];

  return ok({ state: nextState, events: allEvents });
}
