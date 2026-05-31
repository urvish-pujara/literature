import { describe, it, expect, afterEach } from 'vitest';
import type { AppContext } from './server.js';
import type { ServerConfig } from './config.js';
import { buildServer } from './server.js';

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

type Metrics = {
  roomCount: number;
  onlinePlayerCount: number;
  byStatus: { lobby: number; playing: number; ended: number };
};

describe('GET /metrics', () => {
  it('returns zeros when no rooms exist', async () => {
    ctx = await buildServer(baseConfig);
    const res = await ctx.fastify.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    const body = res.json<Metrics>();
    expect(body.roomCount).toBe(0);
    expect(body.onlinePlayerCount).toBe(0);
    expect(body.byStatus).toEqual({ lobby: 0, playing: 0, ended: 0 });
  });

  it('counts rooms by status', async () => {
    ctx = await buildServer(baseConfig);
    await ctx.fastify.inject({ method: 'POST', url: '/rooms', payload: { variant: 'classic' } });
    await ctx.fastify.inject({ method: 'POST', url: '/rooms', payload: { variant: 'extended' } });
    const res = await ctx.fastify.inject({ method: 'GET', url: '/metrics' });
    const body = res.json<Metrics>();
    expect(body.roomCount).toBe(2);
    expect(body.byStatus.lobby).toBe(2);
  });
});
