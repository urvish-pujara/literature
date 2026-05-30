import { create } from 'zustand';

export type SessionState = {
  token: string | null;
  playerId: string | null;
  roomId: string | null;
  displayName: string | null;
  set: (s: Partial<SessionState>) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  playerId: null,
  roomId: null,
  displayName: null,
  set: (s) => set(s),
  clear: () => set({ token: null, playerId: null, roomId: null, displayName: null }),
}));
