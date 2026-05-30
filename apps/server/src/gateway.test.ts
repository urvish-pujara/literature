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

async function createRoom(c: AppContext): Promise<CreateBody> {
  const r = await c.fastify.inject({
    method: 'POST',
    url: '/rooms',
    payload: { variant: 'classic' },
  });
  return r.json<CreateBody>();
}

async function joinRoom(c: AppContext, code: string, name: string): Promise<JoinBody> {
  const r = await c.fastify.inject({
    method: 'POST',
    url: `/rooms/${code}/join`,
    payload: { displayName: name },
  });
  return r.json<JoinBody>();
}

function connectClient(
  url: string,
  token: string,
): Promise<{ socket: ClientSocket; initialLobby: { players: { id: string; seatIndex: number }[]; status: string } }> {
  const c = ioClient(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  clients.push(c);
  return new Promise((resolve, reject) => {
    let connected = false;
    let initialResolved: { players: { id: string; seatIndex: number }[]; status: string } | null = null;
    c.on('lobby:update', (payload: { players: { id: string; seatIndex: number }[]; status: string }) => {
      if (!initialResolved) {
        initialResolved = payload;
        if (connected) resolve({ socket: c, initialLobby: payload });
      }
    });
    c.once('connect', () => {
      connected = true;
      if (initialResolved) resolve({ socket: c, initialLobby: initialResolved });
    });
    c.once('connect_error', (err) => reject(err));
  });
}

function nextEvent<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

describe('socket gateway — lobby flow', () => {
  it('sends lobby:update on connect', async () => {
    const { url, ctx: c } = await start();
    ctx = c;
    const { token } = await createRoom(c);
    const updatePromise = new Promise<{ players: unknown[] }>((resolve) => {
      // attach listener BEFORE connect to avoid missing the initial emit
      const sock = ioClient(url, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });
      clients.push(sock);
      sock.on('lobby:update', (payload: { players: unknown[] }) => resolve(payload));
    });
    const update = await updatePromise;
    expect(update.players).toHaveLength(1);
  });

  it('broadcasts lobby:update when a player picks a seat', async () => {
    const { url, ctx: c } = await start();
    ctx = c;
    const host = await createRoom(c);
    const alice = await joinRoom(c, host.code, 'Alice');

    const { socket: hostSock } = await connectClient(url, host.token);
    const { socket: aliceSock } = await connectClient(url, alice.token);

    const updatePromise = nextEvent<{ players: { id: string; seatIndex: number }[] }>(
      hostSock,
      'lobby:update',
    );
    aliceSock.emit('lobby:seat', { team: 'B', seatIndex: 3 });
    const update = await updatePromise;
    const alicePlayer = update.players.find((p) => p.id === alice.playerId);
    expect(alicePlayer?.seatIndex).toBe(3);
  });

  it('rejects lobby:start with fewer than 6 players', async () => {
    const { url, ctx: c } = await start();
    ctx = c;
    const host = await createRoom(c);
    const { socket: hostSock } = await connectClient(url, host.token);
    const ack = await new Promise<{ ok: boolean; code?: string }>((resolve) => {
      hostSock.emit('lobby:start', {}, (resp: { ok: boolean; code?: string }) => resolve(resp));
    });
    expect(ack.ok).toBe(false);
    expect(ack.code).toBe('NEEDS_SIX_PLAYERS');
  });

  it('non-host cannot call lobby:start', async () => {
    const { url, ctx: c } = await start();
    ctx = c;
    const host = await createRoom(c);
    const alice = await joinRoom(c, host.code, 'Alice');
    const { socket: aliceSock } = await connectClient(url, alice.token);
    const ack = await new Promise<{ ok: boolean; code?: string }>((resolve) => {
      aliceSock.emit('lobby:start', {}, (resp: { ok: boolean; code?: string }) => resolve(resp));
    });
    expect(ack.ok).toBe(false);
    expect(ack.code).toBe('NOT_HOST');
  });

  it('lobby:start with 6 players seated succeeds and flips status to playing', async () => {
    const { url, ctx: c } = await start();
    ctx = c;
    const host = await createRoom(c);
    for (let i = 0; i < 5; i++) {
      await joinRoom(c, host.code, `P${i}`);
    }
    const { socket: hostSock } = await connectClient(url, host.token);
    const updatePromise = nextEvent<{ status: string }>(hostSock, 'lobby:update');
    const ack = await new Promise<{ ok: boolean; code?: string }>((resolve) => {
      hostSock.emit('lobby:start', {}, (resp: { ok: boolean; code?: string }) => resolve(resp));
    });
    expect(ack.ok).toBe(true);
    const update = await updatePromise;
    expect(update.status).toBe('playing');
  });
});
