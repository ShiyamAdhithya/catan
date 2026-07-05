import type { Board, DevCard, GameState, Phase, PlayerId, ResourceType } from './types.js';

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
    bankDevCardCount: state.bank.devCards.length,
    longestRoad: { ...state.longestRoad },
    largestArmy: { ...state.largestArmy },
    pendingDiscards: [...state.pendingDiscards],
    pendingRobberSteal: state.pendingRobberSteal ? { targets: [...state.pendingRobberSteal.targets] } : null,
    winner: state.winner,
  };
}
