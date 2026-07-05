import { PIECE_LIMITS } from './constants.js';
import { defaultShuffle, generateBoard, type Shuffle } from './board.js';
import type { DevCard, DevCardType, GameState, PlayerId, PlayerState, ResourceType } from './types.js';

const STARTING_BANK_RESOURCES: Record<ResourceType, number> = {
  WOOD: 19,
  BRICK: 19,
  SHEEP: 19,
  WHEAT: 19,
  ORE: 19,
};

const DEV_CARD_COUNTS: Record<DevCardType, number> = {
  KNIGHT: 14,
  VICTORY_POINT: 5,
  ROAD_BUILDING: 2,
  YEAR_OF_PLENTY: 2,
  MONOPOLY: 2,
};

function buildDevCardDeck(shuffle: Shuffle): DevCard[] {
  const deck = Object.entries(DEV_CARD_COUNTS).flatMap(([type, count]) =>
    Array.from({ length: count }, (_, i) => ({ id: `${type}-${i}`, type: type as DevCardType })),
  );
  return shuffle(deck);
}

function createPlayerState(id: PlayerId): PlayerState {
  return {
    id,
    resources: { WOOD: 0, BRICK: 0, SHEEP: 0, WHEAT: 0, ORE: 0 },
    devCards: [],
    playedDevCards: [],
    victoryPoints: 0,
    piecesRemaining: { ...PIECE_LIMITS },
  };
}

export function createInitialGameState(
  playerIds: PlayerId[],
  shuffle: Shuffle = defaultShuffle,
): GameState {
  const players: Record<PlayerId, PlayerState> = {};
  for (const playerId of playerIds) {
    players[playerId] = createPlayerState(playerId);
  }

  return {
    phase: 'SETUP_SETTLEMENT',
    turnNumber: 1,
    currentPlayerId: playerIds[0],
    playerOrder: [...playerIds],
    setupRound: 1,
    board: generateBoard(shuffle),
    players,
    bank: {
      resources: { ...STARTING_BANK_RESOURCES },
      devCards: buildDevCardDeck(shuffle),
    },
    longestRoad: { holder: null, length: 0 },
    largestArmy: { holder: null, count: 0 },
    pendingDiscards: [],
    pendingRobberSteal: null,
    devCardPlayedThisTurn: false,
    devCardsBoughtThisTurn: [],
    winner: null,
  };
}
