import { DEV_CARD_COUNTS } from './state.js';
import type { Board, DevCard, GameState, Phase, PlayerId, ResourceType } from './types.js';

const TOTAL_DEV_CARDS = Object.values(DEV_CARD_COUNTS).reduce((a, b) => a + b, 0);

export interface PlayerPublicView {
  id: PlayerId;
  victoryPoints: number;
  resourceCount: number;
  resources?: Record<ResourceType, number>;
  devCardCount: number;
  devCards?: DevCard[];
  playedDevCards: DevCard[];
  piecesRemaining: { roads: number; settlements: number; cities: number };
}

export interface PlayerView {
  phase: Phase;
  turnNumber: number;
  currentPlayerId: PlayerId;
  playerOrder: PlayerId[];
  setupRound: 1 | 2 | null;
  board: Board;
  viewingPlayerId: PlayerId;
  players: Record<PlayerId, PlayerPublicView>;
  bankResources: Record<ResourceType, number>;
  bankDevCardCount: number;
  longestRoad: { holder: PlayerId | null; length: number };
  largestArmy: { holder: PlayerId | null; count: number };
  pendingDiscards: PlayerId[];
  pendingRobberSteal: { targets: PlayerId[] } | null;
  winner: PlayerId | null;
}

function publicVictoryPoints(state: GameState, playerId: PlayerId): number {
  const player = state.players[playerId];
  const hiddenVpCards = player.devCards.filter((c) => c.type === 'VICTORY_POINT').length;
  return player.victoryPoints - hiddenVpCards;
}

/**
 * Dev cards a player is currently holding (in hand or already played) are no
 * longer part of the bank's draw pile. Deriving the count this way (rather
 * than reading `state.bank.devCards.length` directly) keeps the projection
 * correct even for hand-constructed states that set player dev cards without
 * also removing them from the bank deck (as several tests do), while still
 * matching `state.bank.devCards.length` for any state reached via
 * `applyCommand`.
 */
function bankDevCardCount(state: GameState): number {
  const held = Object.values(state.players).reduce(
    (sum, player) => sum + player.devCards.length + player.playedDevCards.length,
    0,
  );
  return TOTAL_DEV_CARDS - held;
}

export function getStateView(state: GameState, viewingPlayerId: PlayerId): PlayerView {
  const players: Record<PlayerId, PlayerPublicView> = {};
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    const isSelf = playerId === viewingPlayerId;
    const resourceCount = Object.values(player.resources).reduce((a, b) => a + b, 0);
    players[playerId] = {
      id: playerId,
      victoryPoints: isSelf ? player.victoryPoints : publicVictoryPoints(state, playerId),
      resourceCount,
      resources: isSelf ? { ...player.resources } : undefined,
      devCardCount: player.devCards.length,
      devCards: isSelf ? [...player.devCards] : undefined,
      playedDevCards: [...player.playedDevCards],
      piecesRemaining: { ...player.piecesRemaining },
    };
  }

  return {
    phase: state.phase,
    turnNumber: state.turnNumber,
    currentPlayerId: state.currentPlayerId,
    playerOrder: [...state.playerOrder],
    setupRound: state.setupRound,
    board: state.board,
    viewingPlayerId,
    players,
    bankResources: { ...state.bank.resources },
    bankDevCardCount: bankDevCardCount(state),
    longestRoad: { ...state.longestRoad },
    largestArmy: { ...state.largestArmy },
    pendingDiscards: [...state.pendingDiscards],
    pendingRobberSteal: state.pendingRobberSteal ? { targets: [...state.pendingRobberSteal.targets] } : null,
    winner: state.winner,
  };
}
