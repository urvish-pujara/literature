import { describe, it, expect, beforeEach } from 'vitest';
import type { ClientGameState } from '@literature/shared';
import { useGameStore, selectSortedHand, selectIsMyTurn } from './game-store.js';

const mkState = (overrides: Partial<ClientGameState> = {}): ClientGameState => ({
  variant: 'extended',
  phase: 'playing',
  you: { id: 'p1', hand: [] },
  players: [],
  turn: { playerId: 'p1', actionCount: 0 },
  score: { A: 0, B: 0 },
  claimedSets: [],
  ...overrides,
});

beforeEach(() => {
  useGameStore.getState().clear();
});

describe('useGameStore', () => {

  it('starts with null state', () => {
    expect(useGameStore.getState().state).toBeNull();
  });

  it('applies state', () => {
    const s = mkState();
    useGameStore.getState().applyState(s);
    expect(useGameStore.getState().state).toEqual(s);
  });
});

describe('selectSortedHand', () => {
  it('sorts standard cards by suit then rank, and clusters 8s+jokers at the end', () => {
    const state = mkState({
      you: {
        id: 'p1',
        hand: [
          { kind: 'standard', id: '5H', suit: 'hearts', rank: '5' },
          { kind: 'standard', id: '3S', suit: 'spades', rank: '3' },
          { kind: 'joker', id: 'JOKER_2' },
          { kind: 'standard', id: '8H', suit: 'hearts', rank: '8' },
          { kind: 'standard', id: '2H', suit: 'hearts', rank: '2' },
          { kind: 'joker', id: 'JOKER_1' },
        ],
      },
    });
    useGameStore.getState().applyState(state);
    const sorted = selectSortedHand(useGameStore.getState());
    const ids = sorted.map((c) => c.id);
    expect(ids).toEqual(['3S', '2H', '5H', '8H', 'JOKER_1', 'JOKER_2']);
  });
});

describe('selectIsMyTurn', () => {
  it('returns true when the active player matches the viewer', () => {
    const state = mkState({ turn: { playerId: 'p1', actionCount: 0 } });
    useGameStore.getState().applyState(state);
    expect(selectIsMyTurn(useGameStore.getState(), 'p1')).toBe(true);
    expect(selectIsMyTurn(useGameStore.getState(), 'p2')).toBe(false);
  });

  it('returns false when state is null', () => {
    expect(selectIsMyTurn(useGameStore.getState(), 'p1')).toBe(false);
  });
});
