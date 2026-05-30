import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { SessionClaims } from './jwt.js';
import { verifySession } from './jwt.js';

export type SocketData = {
  session?: SessionClaims;
};

export function getSession(socket: Socket): SessionClaims | undefined {
  return (socket.data as SocketData).session;
}

export function installSocketAuth(io: SocketIOServer, jwtSecret: Uint8Array): void {
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const auth = socket.handshake.auth as Record<string, unknown> | undefined;
    const tokenRaw = auth?.['token'];
    const token = typeof tokenRaw === 'string' ? tokenRaw : null;
    if (!token) {
      next(new Error('missing auth token'));
      return;
    }
    verifySession(token, jwtSecret)
      .then((session) => {
        (socket.data as SocketData).session = session;
        next();
      })
      .catch(() => {
        next(new Error('invalid auth token'));
      });
  });
}
