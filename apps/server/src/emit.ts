import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { ClientGameState, GameEvent, GameState } from '@literature/shared';
import { project } from '@literature/shared';
import type { Room } from './store.js';

export type ServerGameEvent = GameEvent & { ts: number; id: string };

export function projectFor(state: GameState, viewerId: string): ClientGameState {
  return project(state, viewerId);
}

/**
 * Emit a per-recipient projected game:state to every player in the room.
 * This is the ONLY function that should ever emit game:state. Bypassing it
 * (e.g. io.to(roomId).emit('game:state', state)) would leak hands.
 */
export async function emitProjectedState(io: SocketIOServer, room: Room): Promise<void> {
  if (!room.state) return;
  const sockets = await io.in(room.id).fetchSockets();
  for (const s of sockets) {
    const session = (s.data as { session?: { playerId: string } }).session;
    if (!session) continue;
    s.emit('game:state', project(room.state, session.playerId));
  }
}

export function emitGameEvent(io: SocketIOServer, roomId: string, event: ServerGameEvent): void {
  io.to(roomId).emit('game:event', event);
}

export function emitGameEventToSocket(socket: Socket, event: ServerGameEvent): void {
  socket.emit('game:event', event);
}
