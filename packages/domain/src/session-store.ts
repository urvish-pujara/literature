import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SessionState = {
  token: string | null;
  playerId: string | null;
  roomId: string | null;
  displayName: string | null;
  set: (s: Partial<SessionState>) => void;
  clear: () => void;
};

type SessionPersisted = Pick<SessionState, 'token' | 'playerId' | 'roomId' | 'displayName'>;

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      playerId: null,
      roomId: null,
      displayName: null,
      set: (s) => set(s),
      clear: () => set({ token: null, playerId: null, roomId: null, displayName: null }),
    }),
    {
      name: 'literature-session',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') return undefined as never;
        try {
          return window.localStorage;
        } catch {
          return undefined as never;
        }
      }),
      partialize: (s): SessionPersisted => ({
        token: s.token,
        playerId: s.playerId,
        roomId: s.roomId,
        displayName: s.displayName,
      }),
    },
  ),
);
