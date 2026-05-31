import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import type { ServerConfig } from './config.js';
import { InMemoryRoomStore, type RoomStore } from './store.js';
import { RedisRoomStore } from './store-redis.js';
import { installSocketAuth } from './socket-auth.js';
import { registerRoomRoutes } from './routes-rooms.js';
import { registerMetricsRoutes } from './routes-metrics.js';
import { installGateway } from './gateway.js';
import { startRoomCleanup } from './ttl.js';
import { PresenceTracker } from './presence.js';

export type AppContext = {
  config: ServerConfig;
  store: RoomStore;
  fastify: FastifyInstance;
  io: SocketIOServer;
  presence: PresenceTracker;
  redis?: Redis;
  stopCleanup?: () => void;
};

export async function buildServer(config: ServerConfig): Promise<AppContext> {
  const fastify = Fastify({ logger: { level: 'info' } });
  await fastify.register(fastifyCors, { origin: config.corsOrigin, credentials: true });
  await fastify.register(fastifyRateLimit, { global: false });

  fastify.get('/healthz', () => ({ ok: true }));

  let store: RoomStore;
  let redis: Redis | undefined;
  if (config.redisUrl) {
    redis = new Redis(config.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 3 });
    redis.on('error', (err) => fastify.log.error({ err }, 'redis error'));
    store = new RedisRoomStore(redis);
    fastify.log.info({ url: redactRedisUrl(config.redisUrl) }, 'using Redis room store');
  } else {
    store = new InMemoryRoomStore();
    fastify.log.info('using in-memory room store (state lost on restart)');
  }

  const io = new SocketIOServer(fastify.server, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  installSocketAuth(io, config.jwtSecret);

  const ctx: AppContext = {
    config,
    store,
    fastify,
    io,
    presence: new PresenceTracker(),
    redis,
  };
  registerRoomRoutes(fastify, ctx);
  registerMetricsRoutes(fastify, ctx);
  installGateway(ctx);

  ctx.stopCleanup = startRoomCleanup(ctx);
  fastify.addHook('onClose', (_inst, done) => {
    ctx.stopCleanup?.();
    if (ctx.redis) void ctx.redis.quit();
    done();
  });

  return ctx;
}

function redactRedisUrl(url: string): string {
  return url.replace(/(:)[^:@]+(@)/, '$1***$2');
}
