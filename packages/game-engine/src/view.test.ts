import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './state.js';
import { getStateView } from './view.js';
import type { GameState } from './types.js';

const identityShuffle = <T,>(items: T[]): T[] => [...items];

function stateWithHands(): GameState {
  const base = createInitialGameState(['p1', 'p2'], identityShuffle);
  // Deal p1/p2's hand cards from the actual top of the bank deck, and remove
  // them from state.bank.devCards, so the fixture is internally consistent
  // (a card can't simultaneously be in a player's hand and still "in the
  // bank") — this keeps bankDevCardCount's plain state.bank.devCards.length
  // read correct for this test, matching what applyCommand would actually
  // produce via BuyDevelopmentCard.
  const [p1Card, p2Card, ...remainingDevCards] = base.bank.devCards;
  return {
    ...base,
    bank: { ...base.bank, devCards: remainingDevCards },
    players: {
      p1: {
        ...base.players.p1,
        resources: { WOOD: 2, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 },
        devCards: [{ ...p1Card, type: 'VICTORY_POINT' }],
        victoryPoints: 3,
      },
      p2: {
        ...base.players.p2,
        resources: { WOOD: 0, BRICK: 0, SHEEP: 3, WHEAT: 1, ORE: 0 },
        devCards: [{ ...p2Card, type: 'KNIGHT' }],
        victoryPoints: 2,
      },
    },
  };
}

describe('getStateView', () => {
  it('shows the viewing player their own exact hand', () => {
    const view = getStateView(stateWithHands(), 'p1');
    expect(view.players.p1.resources).toEqual({ WOOD: 2, BRICK: 1, SHEEP: 0, WHEAT: 0, ORE: 0 });
    // The card's id comes from whatever the bank deck actually deals (stateWithHands takes it
    // from base.bank.devCards rather than a hardcoded id), so only its type is asserted here.
    expect(view.players.p1.devCards).toHaveLength(1);
    expect(view.players.p1.devCards?.[0]?.type).toBe('VICTORY_POINT');
    expect(view.players.p1.resourceCount).toBe(3);
    expect(view.players.p1.devCardCount).toBe(1);
  });

  it('hides an opponent\'s exact hand, exposing only counts', () => {
    const view = getStateView(stateWithHands(), 'p1');
    expect(view.players.p2.resources).toBeUndefined();
    expect(view.players.p2.devCards).toBeUndefined();
    expect(view.players.p2.resourceCount).toBe(4);
    expect(view.players.p2.devCardCount).toBe(1);
  });

  it('includes the viewing player\'s own hidden VP dev cards in their victoryPoints, but excludes them from opponents', () => {
    const view = getStateView(stateWithHands(), 'p1');
    expect(view.players.p1.victoryPoints).toBe(3); // true total, includes their own hidden VP card
    // p2's stored total (2) has no hidden VP cards in this fixture, so it passes through unchanged.
    expect(view.players.p2.victoryPoints).toBe(2);
  });

  it('excludes a hidden VP dev card from how OTHER players see that total', () => {
    const base = stateWithHands();
    const withHiddenVp = {
      ...base,
      players: {
        ...base.players,
        p2: {
          ...base.players.p2,
          devCards: [...base.players.p2.devCards, { id: 'v2', type: 'VICTORY_POINT' as const }],
          victoryPoints: 3,
        },
      },
    };
    const viewFromP1 = getStateView(withHiddenVp, 'p1');
    expect(viewFromP1.players.p2.victoryPoints).toBe(2); // hidden VP card excluded from p1's view of p2
    const viewFromP2 = getStateView(withHiddenVp, 'p2');
    expect(viewFromP2.players.p2.victoryPoints).toBe(3); // p2 sees their own true total
  });

  it('exposes only the bank dev card count, not the deck contents', () => {
    const view = getStateView(stateWithHands(), 'p1');
    expect(view.bankDevCardCount).toBe(23); // 25 - 1 (p1) - 1 (p2)
    expect((view as unknown as { bank?: unknown }).bank).toBeUndefined();
  });

  it('exposes full board occupancy regardless of viewer', () => {
    const view = getStateView(stateWithHands(), 'p1');
    expect(view.board.hexes).toHaveLength(19);
  });
});
