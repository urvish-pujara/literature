import type { Server as SocketIOServer, Socket } from 'socket.io';
import { mulberry32 } from '@literature/engine';
import {
  GameActionSchema,
  LobbySeatPayloadSchema,
  project,
  type GameEvent,
  type Team,
} from '@literature/shared';
import { nanoid } from 'nanoid';
import type { AppContext } from './server.js';
import { getSession } from './socket-auth.js';
import type { Room } from './store.js';
import { GameRoomService } from './game-room.js';
import { emitGameEvent, emitProjectedState, type ServerGameEvent } from './emit.js';
import { EventBuffer } from './event-buffer.js';
import type { PresenceTracker } from './presence.js';
import { projectLobby } from './lobby-projection.js';

function broadcastLobby(io: SocketIOServer, room: Room, presence: PresenceTracker): void {
  io.to(room.id).emit('lobby:update', projectLobby(room, presence));
}

function stamp(event: GameEvent): ServerGameEvent {
  return { ...event, ts: Date.now(), id: nanoid() };
}

export function installGateway(ctx: AppContext): void {
  const { io, store, presence } = ctx;
  const service = new GameRoomService(store);
  const eventBuffer = new EventBuffer();

  io.on('connection', (socket: Socket) => {
    const session = getSession(socket);
    if (!session) {
      socket.disconnect(true);
      return;
    }

    let joinedRoomId: string | null = null;

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
      joinedRoomId = room.id;
      const { wentOnline } = presence.add(room.id, session.playerId);
      socket.emit('lobby:update', projectLobby(room, presence));
      if (wentOnline) broadcastLobby(io, room, presence);
      if (room.state) {
        socket.emit('game:state', project(room.state, session.playerId));
        for (const ev of eventBuffer.get(room.id)) {
          socket.emit('game:event', ev);
        }
      }
    })();

    socket.on('disconnect', () => {
      if (!joinedRoomId) return;
      const roomId = joinedRoomId;
      const { wentOffline } = presence.remove(roomId, session.playerId);
      if (wentOffline) {
        void (async () => {
          const room = await store.getById(roomId);
          if (room) broadcastLobby(io, room, presence);
        })();
      }
    });

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
        if (updated) broadcastLobby(io, updated, presence);
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
        if (updated) broadcastLobby(io, updated, presence);
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
        const seed = Math.floor(Math.random() * 2 ** 31);
        const result = await service.startGameForRoom(room.id, mulberry32(seed));
        if (!result.ok) {
          ack?.({ ok: false, code: result.code });
          return;
        }
        const updated = await store.getById(room.id);
        if (updated) {
          broadcastLobby(io, updated, presence);
          await emitProjectedState(io, updated);
          for (const ev of result.events) {
            const stamped = stamp(ev);
            eventBuffer.append(room.id, stamped);
            emitGameEvent(io, room.id, stamped);
          }
        }
        ack?.({ ok: true });
      })();
    });

    socket.on('game:ask', (payload: unknown, ack?: (resp: unknown) => void) => {
      void (async () => {
        const parsed = GameActionSchema.safeParse(payload);
        if (!parsed.success || parsed.data.type !== 'ask') {
          ack?.({ ok: false, code: 'INVALID_PAYLOAD' });
          return;
        }
        if (parsed.data.askerId !== session.playerId) {
          ack?.({ ok: false, code: 'IMPERSONATION' });
          return;
        }
        const result = await service.handleAction(session.roomId, parsed.data);
        if (!result.ok) {
          ack?.({ ok: false, code: result.code, message: result.message });
          return;
        }
        const room = await store.getById(session.roomId);
        if (room) {
          await emitProjectedState(io, room);
          for (const ev of result.result.events) {
            const stamped = stamp(ev);
            eventBuffer.append(session.roomId, stamped);
            emitGameEvent(io, session.roomId, stamped);
          }
        }
        ack?.({ ok: true });
      })();
    });

    socket.on('game:claim', (payload: unknown, ack?: (resp: unknown) => void) => {
      void (async () => {
        const parsed = GameActionSchema.safeParse(payload);
        if (!parsed.success || parsed.data.type !== 'claim') {
          ack?.({ ok: false, code: 'INVALID_PAYLOAD' });
          return;
        }
        if (parsed.data.claimantId !== session.playerId) {
          ack?.({ ok: false, code: 'IMPERSONATION' });
          return;
        }
        const result = await service.handleAction(session.roomId, parsed.data);
        if (!result.ok) {
          ack?.({ ok: false, code: result.code, message: result.message });
          return;
        }
        const room = await store.getById(session.roomId);
        if (room) {
          await emitProjectedState(io, room);
          for (const ev of result.result.events) {
            const stamped = stamp(ev);
            eventBuffer.append(session.roomId, stamped);
            emitGameEvent(io, session.roomId, stamped);
          }
        }
        ack?.({ ok: true });
      })();
    });
  });
}
