import { beforeEach, describe, expect, it } from 'vitest';
import { applyCommand, reduceEvent, registerHandler } from './engine.js';
import { createInitialGameState } from './state.js';
import { err, ok } from './result.js';
import type { GameState } from './types.js';
import type { Command } from './commands.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function baseState(): GameState {
  return createInitialGameState(['p1', 'p2'], identityShuffle);
}

describe('applyCommand dispatch', () => {
  interface PingCommand {
    type: 'Ping';
    playerId: string;
  }

  beforeEach(() => {
    registerHandler('Ping' as Command['type'], {
      validate: (state: GameState, command: PingCommand) =>
        command.playerId === state.currentPlayerId
          ? ok(true)
          : err({ type: 'NotYourTurn', currentPlayerId: state.currentPlayerId }),
      apply: () => [],
    } as never);
  });

  it('short-circuits on validation failure without folding any events', () => {
    const state = baseState();
    const result = applyCommand(state, { type: 'Ping', playerId: 'p2' } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ type: 'NotYourTurn', currentPlayerId: 'p1' });
    }
  });

  it('returns the folded state and events on success', () => {
    const state = baseState();
    const result = applyCommand(state, { type: 'Ping', playerId: 'p1' } as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.events).toEqual([]);
      expect(result.value.state).toBe(state); // no events, no change
    }
  });
});

describe('reduceEvent', () => {
  it('SettlementBuilt places the building, decrements pieces, and advances SETUP_SETTLEMENT to SETUP_ROAD', () => {
    const state = baseState();
    const vertexId = state.board.vertices[0].id;
    const next = reduceEvent(state, { type: 'SettlementBuilt', playerId: 'p1', vertexId });
    expect(next.board.vertices.find((v) => v.id === vertexId)?.building).toEqual({
      type: 'SETTLEMENT',
      playerId: 'p1',
    });
    expect(next.players.p1.piecesRemaining.settlements).toBe(4);
    expect(next.phase).toBe('SETUP_ROAD');
  });

  it('RoadBuilt places the road, decrements pieces, and does not change phase outside setup', () => {
    const state = { ...baseState(), phase: 'MAIN' as const };
    const edgeId = state.board.edges[0].id;
    const next = reduceEvent(state, { type: 'RoadBuilt', playerId: 'p1', edgeId });
    expect(next.board.edges.find((e) => e.id === edgeId)?.road).toEqual({ playerId: 'p1' });
    expect(next.players.p1.piecesRemaining.roads).toBe(14);
    expect(next.phase).toBe('MAIN');
  });

  it('DiceRolled with total 7 and no one over the limit goes straight to MOVE_ROBBER', () => {
    const state = baseState();
    const next = reduceEvent(state, {
      type: 'DiceRolled',
      die1: 3,
      die2: 4,
      total: 7,
      playersToDiscard: [],
    });
    expect(next.phase).toBe('MOVE_ROBBER');
    expect(next.pendingDiscards).toEqual([]);
  });

  it('DiceRolled with total 7 and players over the limit goes to DISCARD', () => {
    const state = baseState();
    const next = reduceEvent(state, {
      type: 'DiceRolled',
      die1: 3,
      die2: 4,
      total: 7,
      playersToDiscard: ['p1'],
    });
    expect(next.phase).toBe('DISCARD');
    expect(next.pendingDiscards).toEqual(['p1']);
  });

  it('DiceRolled with a non-7 total goes to MAIN', () => {
    const state = baseState();
    const next = reduceEvent(state, {
      type: 'DiceRolled',
      die1: 2,
      die2: 2,
      total: 4,
      playersToDiscard: [],
    });
    expect(next.phase).toBe('MAIN');
  });

  it('ResourcesDiscarded removes the last pending player and moves to MOVE_ROBBER', () => {
    const state = {
      ...baseState(),
      phase: 'DISCARD' as const,
      pendingDiscards: ['p1'],
      players: {
        ...baseState().players,
        p1: { ...baseState().players.p1, resources: { WOOD: 4, BRICK: 4, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const next = reduceEvent(state, {
      type: 'ResourcesDiscarded',
      playerId: 'p1',
      resources: { WOOD: 4 },
    });
    expect(next.players.p1.resources.WOOD).toBe(0);
    expect(next.bank.resources.WOOD).toBe(23);
    expect(next.pendingDiscards).toEqual([]);
    expect(next.phase).toBe('MOVE_ROBBER');
  });

  it('RobberMoved with steal targets goes to STEAL, with none goes to MAIN', () => {
    const state = baseState();
    const withTargets = reduceEvent(state, {
      type: 'RobberMoved',
      hexId: 'hex-0-0',
      stealTargets: ['p2'],
    });
    expect(withTargets.phase).toBe('STEAL');
    expect(withTargets.pendingRobberSteal).toEqual({ targets: ['p2'] });
    expect(withTargets.board.robberHexId).toBe('hex-0-0');

    const withoutTargets = reduceEvent(state, {
      type: 'RobberMoved',
      hexId: 'hex-0-0',
      stealTargets: [],
    });
    expect(withoutTargets.phase).toBe('MAIN');
    expect(withoutTargets.pendingRobberSteal).toBeNull();
  });

  it('ResourceStolen transfers one card, and does nothing if the victim had none', () => {
    const state: GameState = {
      ...baseState(),
      players: {
        ...baseState().players,
        p2: { ...baseState().players.p2, resources: { WOOD: 1, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const next = reduceEvent(state, {
      type: 'ResourceStolen',
      thiefId: 'p1',
      victimId: 'p2',
      resource: 'WOOD',
    });
    expect(next.players.p1.resources.WOOD).toBe(1);
    expect(next.players.p2.resources.WOOD).toBe(0);
    expect(next.phase).toBe('MAIN');

    const nothingToSteal = reduceEvent(state, {
      type: 'ResourceStolen',
      thiefId: 'p1',
      victimId: 'p2',
      resource: null,
    });
    expect(nothingToSteal.players.p1.resources).toEqual(state.players.p1.resources);
  });

  it('CityUpgraded upgrades the vertex and returns the settlement piece to supply', () => {
    const state = baseState();
    const vertexId = state.board.vertices[0].id;
    const next = reduceEvent(state, { type: 'CityUpgraded', playerId: 'p1', vertexId });
    expect(next.board.vertices.find((v) => v.id === vertexId)?.building).toEqual({
      type: 'CITY',
      playerId: 'p1',
    });
    expect(next.players.p1.piecesRemaining.cities).toBe(3);
    expect(next.players.p1.piecesRemaining.settlements).toBe(6);
  });

  it('DevelopmentCardBought moves the card from bank to player', () => {
    const state = baseState();
    const card = state.bank.devCards[0];
    const next = reduceEvent(state, { type: 'DevelopmentCardBought', playerId: 'p1', card });
    expect(next.players.p1.devCards).toEqual([card]);
    expect(next.bank.devCards).toHaveLength(24);
    expect(next.bank.devCards.find((c) => c.id === card.id)).toBeUndefined();
  });

  it('KnightPlayed moves the card to playedDevCards and transitions to MOVE_ROBBER', () => {
    const state = baseState();
    const card = { id: 'k1', type: 'KNIGHT' as const };
    const withCard = {
      ...state,
      players: { ...state.players, p1: { ...state.players.p1, devCards: [card] } },
    };
    const next = reduceEvent(withCard, { type: 'KnightPlayed', playerId: 'p1', cardId: 'k1' });
    expect(next.players.p1.devCards).toEqual([]);
    expect(next.players.p1.playedDevCards).toEqual([card]);
    expect(next.devCardPlayedThisTurn).toBe(true);
    expect(next.phase).toBe('MOVE_ROBBER');
  });

  it('MonopolyPlayed zeroes the resource for every other player and gives the total to the player', () => {
    const state = baseState();
    const card = { id: 'm1', type: 'MONOPOLY' as const };
    const withResources = {
      ...state,
      players: {
        p1: { ...state.players.p1, devCards: [card] },
        p2: { ...state.players.p2, resources: { WOOD: 3, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 } },
      },
    };
    const next = reduceEvent(withResources, {
      type: 'MonopolyPlayed',
      playerId: 'p1',
      cardId: 'm1',
      resource: 'WOOD',
      totalStolen: 3,
    });
    expect(next.players.p1.resources.WOOD).toBe(3);
    expect(next.players.p2.resources.WOOD).toBe(0);
  });

  it('TurnEnded advances the player, increments turnNumber, resets dev-card-turn tracking, and returns to ROLL', () => {
    const state = {
      ...baseState(),
      phase: 'MAIN' as const,
      devCardPlayedThisTurn: true,
      devCardsBoughtThisTurn: ['k1'],
    };
    const next = reduceEvent(state, { type: 'TurnEnded', nextPlayerId: 'p2' });
    expect(next.currentPlayerId).toBe('p2');
    expect(next.turnNumber).toBe(2);
    expect(next.phase).toBe('ROLL');
    expect(next.devCardPlayedThisTurn).toBe(false);
    expect(next.devCardsBoughtThisTurn).toEqual([]);
  });

  it('DevelopmentCardBought also records the card id as bought this turn', () => {
    const state = baseState();
    const card = state.bank.devCards[0];
    const next = reduceEvent(state, { type: 'DevelopmentCardBought', playerId: 'p1', card });
    expect(next.devCardsBoughtThisTurn).toEqual([card.id]);
  });

  it('GameWon sets the winner and GAME_OVER phase', () => {
    const state = baseState();
    const next = reduceEvent(state, { type: 'GameWon', playerId: 'p1' });
    expect(next.winner).toBe('p1');
    expect(next.phase).toBe('GAME_OVER');
  });
});
