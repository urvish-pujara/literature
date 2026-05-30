import type { FastifyInstance } from 'fastify';
import type { AppContext } from './server.js';

export function registerMetricsRoutes(fastify: FastifyInstance, ctx: AppContext): void {
  fastify.get('/metrics', async () => {
    const rooms = await ctx.store.all();
    const roomCount = rooms.length;
    const onlinePlayerCount = rooms.reduce(
      (acc, r) => acc + ctx.presence.onlinePlayerIds(r.id).size,
      0,
    );
    const lobbyRooms = rooms.filter((r) => r.status === 'lobby').length;
    const playingRooms = rooms.filter((r) => r.status === 'playing').length;
    const endedRooms = rooms.filter((r) => r.status === 'ended').length;
    return {
      roomCount,
      onlinePlayerCount,
      byStatus: { lobby: lobbyRooms, playing: playingRooms, ended: endedRooms },
    };
  });
}
