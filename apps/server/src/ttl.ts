import type { AppContext } from './server.js';

const DEFAULT_TICK_MS = 60 * 1000;

export async function evictExpiredLobbies(ctx: AppContext, now: number): Promise<number> {
  const rooms = await ctx.store.all();
  let evicted = 0;
  for (const room of rooms) {
    if (room.status === 'lobby' && now - room.createdAt > ctx.config.roomTtlMs) {
      await ctx.store.delete(room.id);
      evicted++;
    }
  }
  return evicted;
}

export function startRoomCleanup(ctx: AppContext, tickMs = DEFAULT_TICK_MS): () => void {
  const handle = setInterval(() => {
    void evictExpiredLobbies(ctx, Date.now()).catch(() => {
      // swallow — periodic task, no observer
    });
  }, tickMs);
  return () => clearInterval(handle);
}
