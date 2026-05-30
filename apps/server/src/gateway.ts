import type { Server as SocketIOServer, Socket } from 'socket.io';
import { LobbySeatPayloadSchema, type Player, type Team } from '@literature/shared';
import type { AppContext } from './server.js';
import { getSession } from './socket-auth.js';
import type { Room } from './store.js';

type LobbyView = {
  roomId: string;
  code: string;
  variant: Room['variant'];
  status: Room['status'];
  players: Player[];
  hostId: string;
};

function projectLobby(room: Room): LobbyView {
  return {
    roomId: room.id,
    code: room.code,
    variant: room.variant,
    status: room.status,
    players: room.players,
    hostId: room.hostId,
  };
}

async function broadcastLobby(io: SocketIOServer, room: Room): Promise<void> {
  io.to(room.id).emit('lobby:update', projectLobby(room));
  await Promise.resolve();
}

export function installGateway(ctx: AppContext): void {
  const { io, store } = ctx;

  io.on('connection', (socket: Socket) => {
    const session = getSession(socket);
    if (!session) {
      socket.disconnect(true);
      return;
    }

    void (async () => {
      const room = await store.getById(session.roomId);
      if (!room) {
        socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'room does not exist' });
        socket.disconnect(true);
        return;
      }
      const known = room.players.some((p) => p.id === session.playerId);
      if (!known) {
        socket.emit('error', { code: 'PLAYER_NOT_IN_ROOM', message: 'unknown player' });
        socket.disconnect(true);
        return;
      }
      await socket.join(room.id);
      socket.emit('lobby:update', projectLobby(room));
    })();

    socket.on('lobby:seat', (payload: unknown, ack?: (resp: unknown) => void) => {
      void (async () => {
        const parsed = LobbySeatPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          ack?.({ ok: false, code: 'INVALID_PAYLOAD' });
          return;
        }
        const room = await store.getById(session.roomId);
        if (!room || room.status !== 'lobby') {
          ack?.({ ok: false, code: 'ROOM_NOT_JOINABLE' });
          return;
        }
        const { team, seatIndex } = parsed.data;
        const occupied = room.players.find(
          (p) => p.seatIndex === seatIndex && p.id !== session.playerId,
        );
        if (occupied) {
          ack?.({ ok: false, code: 'SEAT_TAKEN' });
          return;
        }
        const updated = await store.update(room.id, (r) => ({
          ...r,
          players: r.players.map((p) =>
            p.id === session.playerId ? { ...p, team, seatIndex } : p,
          ),
        }));
        if (updated) await broadcastLobby(io, updated);
        ack?.({ ok: true });
      })();
    });

    socket.on('lobby:randomize', (_payload: unknown, ack?: (resp: unknown) => void) => {
      void (async () => {
        const room = await store.getById(session.roomId);
        if (!room || room.status !== 'lobby') {
          ack?.({ ok: false, code: 'ROOM_NOT_JOINABLE' });
          return;
        }
        if (room.hostId !== session.playerId) {
          ack?.({ ok: false, code: 'NOT_HOST' });
          return;
        }
        const shuffled = [...room.players]
          .map((p) => ({ p, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ p }, idx) => {
            const team: Team = idx % 2 === 0 ? 'A' : 'B';
            return { ...p, seatIndex: idx, team };
          });
        const updated = await store.update(room.id, (r) => ({ ...r, players: shuffled }));
        if (updated) await broadcastLobby(io, updated);
        ack?.({ ok: true });
      })();
    });

    socket.on('lobby:start', (_payload: unknown, ack?: (resp: unknown) => void) => {
      void (async () => {
        const room = await store.getById(session.roomId);
        if (!room || room.status !== 'lobby') {
          ack?.({ ok: false, code: 'ROOM_NOT_JOINABLE' });
          return;
        }
        if (room.hostId !== session.playerId) {
          ack?.({ ok: false, code: 'NOT_HOST' });
          return;
        }
        if (room.players.length !== 6) {
          ack?.({ ok: false, code: 'NEEDS_SIX_PLAYERS' });
          return;
        }
        const seatIndices = room.players.map((p) => p.seatIndex).sort((a, b) => a - b);
        const expected = [0, 1, 2, 3, 4, 5];
        if (!expected.every((s, i) => s === seatIndices[i])) {
          ack?.({ ok: false, code: 'INVALID_SEATING' });
          return;
        }
        // Phase 2 stops at "ready to start" — actual game start (deal hands, broadcast game:state)
        // happens in Phase 3 when the engine is wired through the gateway.
        const updated = await store.update(room.id, (r) => ({ ...r, status: 'playing' }));
        if (updated) await broadcastLobby(io, updated);
        ack?.({ ok: true });
      })();
    });
  });
}
