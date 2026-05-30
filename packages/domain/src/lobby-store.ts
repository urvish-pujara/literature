import { create } from 'zustand';
import type { Player, VariantName } from '@literature/shared';

export type LobbyView = {
  roomId: string;
  code: string;
  variant: VariantName;
  status: 'lobby' | 'playing' | 'ended';
  players: Player[];
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
