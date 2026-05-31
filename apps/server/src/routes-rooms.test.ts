import { describe, it, expect, afterEach } from 'vitest';
import type { AppContext } from './server.js';
import type { ServerConfig } from './config.js';
import { buildServer } from './server.js';

type CreateBody = { roomId: string; code: string; playerId: string; token: string };
type JoinBody = { roomId: string; playerId: string; token: string };
type GetBody = { variant: string; status: string; players: unknown[] };

const baseConfig: ServerConfig = {
  port: 0,
  host: '127.0.0.1',
  jwtSecret: new TextEncoder().encode('test-secret'),
  corsOrigin: ['*'],
  roomTtlMs: 30 * 60 * 1000,
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

describe('POST /rooms', () => {
  it('creates a room and returns roomId, code, playerId, token', async () => {
    ctx = await buildServer(baseConfig);
    const res = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'classic' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<CreateBody>();
    expect(body.roomId).toBeTruthy();
    expect(body.code).toMatch(/^\d{6}$/);
    expect(body.playerId).toBeTruthy();
    expect(body.token).toBeTruthy();
  });

  it('rejects an invalid variant', async () => {
    ctx = await buildServer(baseConfig);
    const res = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'bogus' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /rooms/:code/join', () => {
  it('joins an existing room and returns a session token', async () => {
    ctx = await buildServer(baseConfig);
    const create = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'classic' },
    });
    const { code } = create.json<CreateBody>();
    const join = await ctx.fastify.inject({
      method: 'POST',
      url: `/rooms/${code}/join`,
      payload: { displayName: 'Alice' },
    });
    expect(join.statusCode).toBe(200);
    const body = join.json<JoinBody>();
    expect(body.playerId).toBeTruthy();
    expect(body.token).toBeTruthy();
  });

  it('rejects join on unknown code', async () => {
    ctx = await buildServer(baseConfig);
    const res = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms/000000/join',
      payload: { displayName: 'Alice' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects the 7th joiner', async () => {
    ctx = await buildServer(baseConfig);
    const create = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'classic' },
    });
    const { code } = create.json<CreateBody>();
    for (let i = 0; i < 5; i++) {
      const r = await ctx.fastify.inject({
        method: 'POST',
        url: `/rooms/${code}/join`,
        payload: { displayName: `P${i}` },
      });
      expect(r.statusCode).toBe(200);
    }
    const overflow = await ctx.fastify.inject({
      method: 'POST',
      url: `/rooms/${code}/join`,
      payload: { displayName: 'overflow' },
    });
    expect(overflow.statusCode).toBe(409);
  });

  it('rejects invalid body', async () => {
    ctx = await buildServer(baseConfig);
    const create = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'classic' },
    });
    const { code } = create.json<CreateBody>();
    const res = await ctx.fastify.inject({
      method: 'POST',
      url: `/rooms/${code}/join`,
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /rooms/:code/join — rate limit', () => {
  it('returns 429 after exceeding the per-IP rate limit', async () => {
    ctx = await buildServer(baseConfig);
    const create = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'classic' },
    });
    const { code } = create.json<CreateBody>();
    // limit is 30/min per IP. fire 31 requests from the same IP.
    let saw429 = false;
    for (let i = 0; i < 31; i++) {
      const res = await ctx.fastify.inject({
        method: 'POST',
        url: `/rooms/${code}/join`,
        payload: { displayName: `P${i}` },
        remoteAddress: '10.0.0.42',
      });
      if (res.statusCode === 429) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBe(true);
  });
});

describe('GET /rooms/:code', () => {
  it('returns lobby metadata for an existing room', async () => {
    ctx = await buildServer(baseConfig);
    const create = await ctx.fastify.inject({
      method: 'POST',
      url: '/rooms',
      payload: { variant: 'extended' },
    });
    const { code } = create.json<CreateBody>();
    const res = await ctx.fastify.inject({ method: 'GET', url: `/rooms/${code}` });
    expect(res.statusCode).toBe(200);
    const body = res.json<GetBody>();
    expect(body.variant).toBe('extended');
    expect(body.status).toBe('lobby');
    expect(body.players).toHaveLength(1);
  });

  it('returns 404 for unknown code', async () => {
    ctx = await buildServer(baseConfig);
    const res = await ctx.fastify.inject({ method: 'GET', url: '/rooms/999999' });
    expect(res.statusCode).toBe(404);
  });
});
