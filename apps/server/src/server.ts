import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import type { ServerConfig } from './config.js';
import { InMemoryRoomStore, type RoomStore } from './store.js';
import { installSocketAuth } from './socket-auth.js';
import { registerRoomRoutes } from './routes-rooms.js';

export type AppContext = {
  config: ServerConfig;
  store: RoomStore;
  fastify: FastifyInstance;
  io: SocketIOServer;
};

export async function buildServer(config: ServerConfig): Promise<AppContext> {
  const fastify = Fastify({ logger: { level: 'info' } });
  await fastify.register(fastifyCors, { origin: config.corsOrigin, credentials: true });

  fastify.get('/healthz', () => ({ ok: true }));

  const store: RoomStore = new InMemoryRoomStore();
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: config.corsOrigin, credentials: true },
  });

  installSocketAuth(io, config.jwtSecret);

  const ctx: AppContext = { config, store, fastify, io };
  registerRoomRoutes(fastify, ctx);

  return ctx;
}
