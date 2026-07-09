import type { GameState } from '../types.js';
import type { GameWonEvent } from '../events.js';

export function recalculateVictoryPoints(state: GameState): GameState {
  // Preserves reference equality when nothing changed (same pattern as
  // recalculateLongestRoad/recalculateLargestArmy) — applyCommand's Task 7 test
  // relies on a no-op command returning the exact same state reference.
  let players = state.players;
  let changed = false;
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    const settlementPoints = state.board.vertices.filter(
      (v) => v.building?.playerId === playerId && v.building.type === 'SETTLEMENT',
    ).length;
    const cityPoints =
      state.board.vertices.filter((v) => v.building?.playerId === playerId && v.building.type === 'CITY')
        .length * 2;
    const longestRoadPoints = state.longestRoad.holder === playerId ? 2 : 0;
    const largestArmyPoints = state.largestArmy.holder === playerId ? 2 : 0;
    const devCardPoints = player.devCards.filter((c) => c.type === 'VICTORY_POINT').length;
    const victoryPoints =
      settlementPoints + cityPoints + longestRoadPoints + largestArmyPoints + devCardPoints;
    if (victoryPoints !== player.victoryPoints) {
      if (!changed) players = { ...state.players };
      players[playerId] = { ...player, victoryPoints };
      changed = true;
    }
  }
  return changed ? { ...state, players } : state;
}

export function checkWinCondition(state: GameState): { state: GameState; event: GameWonEvent | null } {
  if (state.winner !== null) return { state, event: null };
  const currentPlayer = state.players[state.currentPlayerId];
  if (currentPlayer.victoryPoints >= 10) {
    const event: GameWonEvent = { type: 'GameWon', playerId: state.currentPlayerId };
    return { state: { ...state, winner: state.currentPlayerId, phase: 'GAME_OVER' }, event };
  }
  return { state, event: null };
}
