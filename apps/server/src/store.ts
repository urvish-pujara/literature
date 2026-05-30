import type { GameState, Player, VariantName } from '@literature/shared';

export type RoomStatus = 'lobby' | 'playing' | 'ended';

export type Room = {
  id: string;
  code: string;
  variant: VariantName;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  state: GameState | null;
  createdAt: number;
};

export interface RoomStore {
  create(room: Room): Promise<void>;
  getById(id: string): Promise<Room | null>;
  getByCode(code: string): Promise<Room | null>;
  update(id: string, fn: (r: Room) => Room): Promise<Room | null>;
  delete(id: string): Promise<void>;
  all(): Promise<Room[]>;
}

export class InMemoryRoomStore implements RoomStore {
  private byId = new Map<string, Room>();
  private byCode = new Map<string, string>();

  create(room: Room): Promise<void> {
    if (this.byId.has(room.id)) return Promise.reject(new Error(`room exists: ${room.id}`));
    if (this.byCode.has(room.code))
      return Promise.reject(new Error(`code in use: ${room.code}`));
    this.byId.set(room.id, room);
    this.byCode.set(room.code, room.id);
    return Promise.resolve();
  }

  getById(id: string): Promise<Room | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }

  getByCode(code: string): Promise<Room | null> {
    const id = this.byCode.get(code);
    return Promise.resolve(id ? (this.byId.get(id) ?? null) : null);
  }

  update(id: string, fn: (r: Room) => Room): Promise<Room | null> {
    const current = this.byId.get(id);
    if (!current) return Promise.resolve(null);
    const next = fn(current);
    this.byId.set(id, next);
    return Promise.resolve(next);
  }

  delete(id: string): Promise<void> {
    const room = this.byId.get(id);
    if (!room) return Promise.resolve();
    this.byId.delete(id);
    this.byCode.delete(room.code);
    return Promise.resolve();
  }

  all(): Promise<Room[]> {
    return Promise.resolve([...this.byId.values()]);
  }
}
