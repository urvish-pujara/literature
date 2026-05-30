import { create } from 'zustand';
import type { Card, ClientGameState } from '@literature/shared';

export type GameStoreState = {
  state: ClientGameState | null;
  applyState: (s: ClientGameState) => void;
  clear: () => void;
};

export const useGameStore = create<GameStoreState>((set) => ({
  state: null,
  applyState: (s) => set({ state: s }),
  clear: () => set({ state: null }),
}));

const SUIT_ORDER: Record<string, number> = {
  spades: 0,
  hearts: 1,
  clubs: 2,
  diamonds: 3,
};

const RANK_ORDER: Record<string, number> = {
  '2': 0,
  '3': 1,
  '4': 2,
  '5': 3,
  '6': 4,
  '7': 5,
  '8': 6,
  '9': 7,
  T: 8,
  J: 9,
  Q: 10,
  K: 11,
  A: 12,
};

const EIGHTS_AND_JOKERS = new Set(['8H', '8D', '8C', '8S', 'JOKER_1', 'JOKER_2']);

export type SortedCard = Card & { group: 'standard' | 'eights-jokers' };

export function selectSortedHand(state: GameStoreState): SortedCard[] {
  const hand = state.state?.you.hand ?? [];
  return [...hand]
    .map((c) => ({
      ...c,
      group: EIGHTS_AND_JOKERS.has(c.id) ? ('eights-jokers' as const) : ('standard' as const),
    }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group === 'eights-jokers' ? 1 : -1;
      if (a.kind === 'joker' && b.kind === 'joker') return a.id.localeCompare(b.id);
      if (a.kind === 'joker') return 1;
      if (b.kind === 'joker') return -1;
      const suitDiff = (SUIT_ORDER[a.suit] ?? 0) - (SUIT_ORDER[b.suit] ?? 0);
      if (suitDiff !== 0) return suitDiff;
      return (RANK_ORDER[a.rank] ?? 0) - (RANK_ORDER[b.rank] ?? 0);
    });
}

export function selectIsMyTurn(state: GameStoreState, viewerId: string | null): boolean {
  if (!state.state || !viewerId) return false;
  return state.state.turn.playerId === viewerId;
}
