import type { Player } from '@literature/shared';
import type { Room } from './store.js';
import type { PresenceTracker } from './presence.js';

export type LobbyPlayerView = Player & { online: boolean };

export type LobbyView = {
  roomId: string;
  code: string;
  variant: Room['variant'];
  status: Room['status'];
  players: LobbyPlayerView[];
  hostId: string;
};

export function projectLobby(room: Room, presence: PresenceTracker): LobbyView {
  return {
    roomId: room.id,
    code: room.code,
    variant: room.variant,
    status: room.status,
    players: room.players.map((p) => ({ ...p, online: presence.isOnline(room.id, p.id) })),
    hostId: room.hostId,
  };
}
