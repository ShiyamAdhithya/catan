import type { GameState } from '../types.js';
import type { LargestArmyChangedEvent } from '../events.js';

export function recalculateLargestArmy(
  state: GameState,
): { state: GameState; event: LargestArmyChangedEvent | null } {
  const counts = state.playerOrder.map((playerId) => ({
    playerId,
    count: state.players[playerId].playedDevCards.filter((c) => c.type === 'KNIGHT').length,
  }));

  const currentHolder = state.largestArmy.holder;
  const currentHolderCount = counts.find((c) => c.playerId === currentHolder)?.count ?? 0;

  const eligible = counts.filter((c) => c.count >= 3);
  const maxCount = eligible.reduce((max, c) => Math.max(max, c.count), 0);
  const leaders = eligible.filter((c) => c.count === maxCount);

  let holder = currentHolder;
  let count = currentHolderCount;

  if (currentHolder && currentHolderCount < 3) {
    holder = null;
    count = 0;
  }

  if (holder === null && leaders.length === 1) {
    holder = leaders[0].playerId;
    count = leaders[0].count;
  } else if (holder !== null && maxCount > currentHolderCount) {
    const soleLeader = leaders.length === 1 ? leaders[0] : null;
    if (soleLeader && soleLeader.playerId !== holder) {
      holder = soleLeader.playerId;
      count = soleLeader.count;
    }
  } else if (holder !== null) {
    count = counts.find((c) => c.playerId === holder)!.count;
  }

  if (holder === state.largestArmy.holder && count === state.largestArmy.count) {
    return { state, event: null };
  }

  const event: LargestArmyChangedEvent = { type: 'LargestArmyChanged', holder, count };
  return { state: { ...state, largestArmy: { holder, count } }, event };
}
