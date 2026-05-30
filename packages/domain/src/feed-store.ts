import { create } from 'zustand';
import type { GameEvent } from '@literature/shared';

export type FeedEntry = GameEvent & { id: string; ts: number; expiresAt: number };

export const FADE_MS = 15_000;

export type FeedState = {
  entries: FeedEntry[];
  appendEvent: (event: GameEvent & { id: string; ts: number }, now?: number) => void;
  prune: (now: number) => void;
  clear: () => void;
};

export const useFeedStore = create<FeedState>((set) => ({
  entries: [],
  appendEvent: (event, now = Date.now()) => {
    const entry: FeedEntry = { ...event, expiresAt: now + FADE_MS };
    set((s) => ({ entries: [...s.entries, entry] }));
  },
  prune: (now) => {
    set((s) => ({ entries: s.entries.filter((e) => e.expiresAt > now) }));
  },
  clear: () => set({ entries: [] }),
}));
