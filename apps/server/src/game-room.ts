import {
  applyAction,
  startGame,
  type ApplyResult,
  type RNG,
} from '@literature/engine';
import type { GameAction, GameEvent, GameState, GameVariant } from '@literature/shared';
import { getVariant } from '@literature/shared';
import type { Room, RoomStore } from './store.js';

export type StartResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; code: 'ROOM_NOT_FOUND' | 'INVALID_LOBBY_STATE'; message: string };

export type ServiceResult =
  | { ok: true; result: ApplyResult & { ok: true } }
  | { ok: false; code: string; message: string };

export class GameRoomService {
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly store: RoomStore) {}

  private async withLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(roomId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    this.locks.set(roomId, prev.then(() => gate));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private variantOf(room: Room): GameVariant {
    return getVariant(room.variant);
  }

  async startGameForRoom(roomId: string, rng: RNG): Promise<StartResult> {
    return this.withLock(roomId, async () => {
      const room = await this.store.getById(roomId);
      if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'room not found' };
      if (room.players.length !== 6 || room.status !== 'lobby') {
        return {
          ok: false,
          code: 'INVALID_LOBBY_STATE',
          message: 'room not ready to start',
        };
      }
      const variant = this.variantOf(room);
      const seated = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
      const { state, events } = startGame(variant, seated, rng);
      await this.store.update(roomId, (r) => ({ ...r, status: 'playing', state }));
      return { ok: true, state, events };
    });
  }

  async handleAction(roomId: string, action: GameAction): Promise<ServiceResult> {
    return this.withLock(roomId, async () => {
      const room = await this.store.getById(roomId);
      if (!room) return { ok: false, code: 'ROOM_NOT_FOUND', message: 'room not found' };
      if (!room.state) {
        return { ok: false, code: 'GAME_NOT_STARTED', message: 'game has not started' };
      }
      const variant = this.variantOf(room);
      const result = applyAction(room.state, variant, action);
      if (!result.ok) {
        return { ok: false, code: result.code, message: result.message };
      }
      await this.store.update(roomId, (r) => ({
        ...r,
        status: result.state.phase === 'ended' ? 'ended' : 'playing',
        state: result.state,
      }));
      return { ok: true, result };
    });
  }
}
