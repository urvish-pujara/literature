import type { Redis } from 'ioredis';
import type { Room, RoomStore } from './store.js';

const ROOM_PREFIX = 'literature:room:';
const CODE_PREFIX = 'literature:code:';
const ALL_ROOMS_KEY = 'literature:rooms';

function roomKey(id: string): string {
  return `${ROOM_PREFIX}${id}`;
}

function codeKey(code: string): string {
  return `${CODE_PREFIX}${code}`;
}

/**
 * Redis-backed RoomStore. Persistence + restart-survival for a single instance.
 *
 * NOTE: `update` reads, applies the function, and writes back without transactional
 * locking. The per-room mutex in {@link GameRoomService} serializes mutating actions
 * within a single process. For multi-instance deploys, swap to optimistic-locking
 * (WATCH/MULTI/EXEC) — out of MVP scope.
 */
export class RedisRoomStore implements RoomStore {
  constructor(private readonly redis: Redis) {}

  async create(room: Room): Promise<void> {
    const existing = await this.redis.exists(roomKey(room.id), codeKey(room.code));
    if (existing > 0) {
      throw new Error(`room exists or code in use: ${room.id} / ${room.code}`);
    }
    await this.redis
      .multi()
      .set(roomKey(room.id), JSON.stringify(room))
      .set(codeKey(room.code), room.id)
      .sadd(ALL_ROOMS_KEY, room.id)
      .exec();
  }

  async getById(id: string): Promise<Room | null> {
    const raw = await this.redis.get(roomKey(id));
    return raw ? (JSON.parse(raw) as Room) : null;
  }

  async getByCode(code: string): Promise<Room | null> {
    const id = await this.redis.get(codeKey(code));
    if (!id) return null;
    return this.getById(id);
  }

  async update(id: string, fn: (r: Room) => Room): Promise<Room | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const next = fn(current);
    // If the code changed (it shouldn't, but defensively): keep the code index in sync.
    if (next.code !== current.code) {
      await this.redis
        .multi()
        .del(codeKey(current.code))
        .set(codeKey(next.code), id)
        .set(roomKey(id), JSON.stringify(next))
        .exec();
    } else {
      await this.redis.set(roomKey(id), JSON.stringify(next));
    }
    return next;
  }

  async delete(id: string): Promise<void> {
    const room = await this.getById(id);
    if (!room) return;
    await this.redis
      .multi()
      .del(roomKey(id))
      .del(codeKey(room.code))
      .srem(ALL_ROOMS_KEY, id)
      .exec();
  }

  async all(): Promise<Room[]> {
    const ids = await this.redis.smembers(ALL_ROOMS_KEY);
    if (ids.length === 0) return [];
    const raws = await this.redis.mget(...ids.map((id) => roomKey(id)));
    const rooms: Room[] = [];
    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      if (raw) {
        rooms.push(JSON.parse(raw) as Room);
      } else {
        const id = ids[i];
        if (id) await this.redis.srem(ALL_ROOMS_KEY, id);
      }
    }
    return rooms;
  }
}
