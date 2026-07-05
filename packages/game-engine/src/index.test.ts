import { describe, expect, it } from 'vitest';
import { applyCommand, createInitialGameState, getStateView, PIECE_LIMITS } from './index.js';

describe('PIECE_LIMITS', () => {
  it('matches official Catan piece counts per player', () => {
    expect(PIECE_LIMITS).toEqual({ roads: 15, settlements: 5, cities: 4 });
  });
});

describe('public API wiring', () => {
  it('createInitialGameState + applyCommand + getStateView work end to end through the barrel', () => {
    const state = createInitialGameState(['p1', 'p2']);
    const vertexId = state.board.vertices[0].id;

    const result = applyCommand(state, {
      type: 'PlaceInitialSettlement',
      playerId: 'p1',
      vertexId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.state.board.vertices.find((v) => v.id === vertexId)?.building).toEqual({
        type: 'SETTLEMENT',
        playerId: 'p1',
      });
      expect(result.value.state.phase).toBe('SETUP_ROAD');

      const view = getStateView(result.value.state, 'p2');
      expect(view.players.p1.resources).toBeUndefined();
    }
  });
});
