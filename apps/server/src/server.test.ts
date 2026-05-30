import { describe, it, expect, afterEach } from 'vitest';
import type { ServerConfig } from './config.js';
import { buildServer, type AppContext } from './server.js';

const config: ServerConfig = {
  port: 0,
  host: '127.0.0.1',
  jwtSecret: new TextEncoder().encode('test-secret'),
  corsOrigin: 'http://localhost:5173',
  roomTtlMs: 30 * 60 * 1000,
};

let ctx: AppContext | null = null;

afterEach(async () => {
  if (ctx) {
    await ctx.fastify.close();
    ctx = null;
  }
});

describe('buildServer', () => {
  it('responds 200 on /healthz', async () => {
    ctx = await buildServer(config);
    const response = await ctx.fastify.inject({ method: 'GET', url: '/healthz' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
