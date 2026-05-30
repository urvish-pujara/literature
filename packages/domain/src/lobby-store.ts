import { create } from 'zustand';
import type { Player, VariantName } from '@literature/shared';

export type LobbyPlayerView = Player & { online: boolean };

export type LobbyView = {
  roomId: string;
  code: string;
  variant: VariantName;
  status: 'lobby' | 'playing' | 'ended';
  players: LobbyPlayerView[];
  hostId: string;
};

export type LobbyState = {
  lobby: LobbyView | null;
  applyUpdate: (update: LobbyView) => void;
  clear: () => void;
};

export const useLobbyStore = create<LobbyState>((set) => ({
  lobby: null,
  applyUpdate: (update) => set({ lobby: update }),
  clear: () => set({ lobby: null }),
}));
