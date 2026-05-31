import { describe, it, expect, afterEach } from 'vitest';
import type { AppContext } from './server.js';
import type { ServerConfig } from './config.js';
import { buildServer } from './server.js';
import { evictExpiredLobbies } from './ttl.js';

const baseConfig: ServerConfig = {
  port: 0,
  host: '127.0.0.1',
  jwtSecret: new TextEncoder().encode('test-secret'),
  corsOrigin: ['*'],
  roomTtlMs: 1000,
  redisUrl: null,
  env: 'test',
};

let ctx: AppContext | null = null;

afterEach(async () => {
  if (ctx) {
    await ctx.fastify.close();
    ctx = null;
  }
});

async function createRoom(c: AppContext): Promise<{ roomId: string }> {
  const r = await c.fastify.inject({
    method: 'POST',
    url: '/rooms',
    payload: { variant: 'classic' },
  });
  return r.json<{ roomId: string }>();
}

describe('evictExpiredLobbies', () => {
  it('removes lobby rooms older than the TTL', async () => {
    ctx = await buildServer(baseConfig);
    const { roomId } = await createRoom(ctx);
    const room = await ctx.store.getById(roomId);
    expect(room).not.toBeNull();

    const now = (room?.createdAt ?? 0) + baseConfig.roomTtlMs + 1;
    const evicted = await evictExpiredLobbies(ctx, now);
    expect(evicted).toBe(1);
    expect(await ctx.store.getById(roomId)).toBeNull();
  });

  it('does not remove fresh lobby rooms', async () => {
    ctx = await buildServer(baseConfig);
    const { roomId } = await createRoom(ctx);
    const evicted = await evictExpiredLobbies(ctx, Date.now());
    expect(evicted).toBe(0);
    expect(await ctx.store.getById(roomId)).not.toBeNull();
  });

  it('does not remove rooms whose status is not lobby', async () => {
    ctx = await buildServer(baseConfig);
    const { roomId } = await createRoom(ctx);
    await ctx.store.update(roomId, (r) => ({ ...r, status: 'playing' }));
    const room = await ctx.store.getById(roomId);
    const now = (room?.createdAt ?? 0) + baseConfig.roomTtlMs + 1;
    const evicted = await evictExpiredLobbies(ctx, now);
    expect(evicted).toBe(0);
    expect(await ctx.store.getById(roomId)).not.toBeNull();
  });
});
