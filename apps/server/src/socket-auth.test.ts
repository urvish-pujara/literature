import { describe, it, expect, afterEach } from 'vitest';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { type AddressInfo } from 'node:net';
import type { AppContext } from './server.js';
import { buildServer } from './server.js';
import { signSession } from './jwt.js';

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

async function start(): Promise<{ url: string }> {
  ctx = await buildServer({
    port: 0,
    host: '127.0.0.1',
    jwtSecret: secret,
    corsOrigin: '*',
    roomTtlMs: 30 * 60 * 1000,
  });
  await ctx.fastify.listen({ port: 0, host: '127.0.0.1' });
  const addr = ctx.fastify.server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${addr.port}` };
}

describe('socket auth middleware', () => {
  it('accepts a valid token', async () => {
    const { url } = await start();
    const token = await signSession({ playerId: 'p1', roomId: 'r1' }, secret);
    const client = ioClient(url, { auth: { token }, transports: ['websocket'] });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => resolve());
      client.on('connect_error', (err) => reject(err));
    });
    expect(client.connected).toBe(true);
  });

  it('rejects a missing token', async () => {
    const { url } = await start();
    const client = ioClient(url, { transports: ['websocket'], reconnection: false });
    clients.push(client);
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toMatch(/missing auth token/);
  });

  it('rejects an invalid token', async () => {
    const { url } = await start();
    const client = ioClient(url, {
      auth: { token: 'not-a-jwt' },
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', (e) => resolve(e));
    });
    expect(err.message).toMatch(/invalid auth token/);
  });
});
