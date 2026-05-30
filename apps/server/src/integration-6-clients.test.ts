import { describe, it, expect, afterEach } from 'vitest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { type AddressInfo } from 'node:net';
import type { AppContext } from './server.js';
import { buildServer } from './server.js';

const secret = new TextEncoder().encode('test-secret');

let ctx: AppContext | null = null;
let clients: ClientSocket[] = [];

afterEach(async () => {
  for (const c of clients) c.disconnect();
  clients = [];
  if (ctx) {
    await ctx.fastify.close();
    ctx = null;
  }
});

async function start(): Promise<{ url: string; ctx: AppContext }> {
  const c = await buildServer({
    port: 0,
    host: '127.0.0.1',
    jwtSecret: secret,
    corsOrigin: '*',
    roomTtlMs: 30 * 60 * 1000,
  });
  await c.fastify.listen({ port: 0, host: '127.0.0.1' });
  const addr = c.fastify.server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${addr.port}`, ctx: c };
}

type CreateBody = { roomId: string; code: string; playerId: string; token: string };
type JoinBody = { roomId: string; playerId: string; token: string };
type LobbyUpdate = {
  roomId: string;
  status: string;
  players: { id: string; team: 'A' | 'B'; seatIndex: number }[];
  hostId: string;
};

async function http<T>(
  c: AppContext,
  method: 'POST',
  url: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const r = await c.fastify.inject({ method, url, payload });
  return r.json<T>();
}

function connectAndAwaitLobby(url: string, token: string): Promise<{ socket: ClientSocket; lobby: LobbyUpdate }> {
  const c = ioClient(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  clients.push(c);
  return new Promise((resolve, reject) => {
    let connected = false;
    let lobby: LobbyUpdate | null = null;
    c.on('lobby:update', (payload: LobbyUpdate) => {
      if (!lobby) {
        lobby = payload;
        if (connected) resolve({ socket: c, lobby: payload });
      }
    });
    c.once('connect', () => {
      connected = true;
      if (lobby) resolve({ socket: c, lobby });
    });
    c.once('connect_error', (err) => reject(err));
  });
}

function emitWithAck<R>(socket: ClientSocket, event: string, payload: unknown = {}): Promise<R> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (resp: R) => resolve(resp));
  });
}

describe('integration — 6 clients lobby flow', () => {
  it('host creates, 5 join, all connect, host starts, all see playing', async () => {
    const { url, ctx: c } = await start();
    ctx = c;

    const host = await http<CreateBody>(c, 'POST', '/rooms', { variant: 'classic' });
    const joinTokens: JoinBody[] = [];
    for (let i = 0; i < 5; i++) {
      joinTokens.push(
        await http<JoinBody>(c, 'POST', `/rooms/${host.code}/join`, { displayName: `P${i + 1}` }),
      );
    }

    const allTokens = [host.token, ...joinTokens.map((j) => j.token)];
    const sockets: ClientSocket[] = [];
    for (const token of allTokens) {
      const { socket, lobby } = await connectAndAwaitLobby(url, token);
      sockets.push(socket);
      expect(lobby.players).toHaveLength(6);
      expect(lobby.status).toBe('lobby');
    }

    // wait specifically for the status: 'playing' broadcast — presence-driven
    // lobby:updates may also be in flight
    const updatePromises = sockets.map(
      (s) =>
        new Promise<LobbyUpdate>((resolve) => {
          const handler = (payload: LobbyUpdate): void => {
            if (payload.status === 'playing') {
              s.off('lobby:update', handler);
              resolve(payload);
            }
          };
          s.on('lobby:update', handler);
        }),
    );

    const ack = await emitWithAck<{ ok: boolean; code?: string }>(
      sockets[0]!,
      'lobby:start',
    );
    expect(ack.ok).toBe(true);

    const updates = await Promise.all(updatePromises);
    expect(updates).toHaveLength(6);
    for (const u of updates) {
      expect(u.status).toBe('playing');
      expect(u.players).toHaveLength(6);
    }
  });
});
