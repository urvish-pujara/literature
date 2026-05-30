import { describe, it, expect } from 'vitest';
import { InMemoryRoomStore, type Room } from './store.js';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'r1',
    code: '123456',
    variant: 'classic',
    hostId: 'p1',
    status: 'lobby',
    players: [],
    state: null,
    createdAt: 0,
    ...overrides,
  };
}

describe('InMemoryRoomStore', () => {
  it('creates and retrieves by id and by code', async () => {
    const store = new InMemoryRoomStore();
    await store.create(makeRoom());
    expect(await store.getById('r1')).not.toBeNull();
    expect(await store.getByCode('123456')).not.toBeNull();
  });

  it('rejects duplicate ids', async () => {
    const store = new InMemoryRoomStore();
    await store.create(makeRoom());
    await expect(store.create(makeRoom())).rejects.toThrow();
  });

  it('rejects duplicate codes', async () => {
    const store = new InMemoryRoomStore();
    await store.create(makeRoom());
    await expect(store.create(makeRoom({ id: 'r2' }))).rejects.toThrow();
  });

  it('updates via functional setter', async () => {
    const store = new InMemoryRoomStore();
    await store.create(makeRoom());
    const updated = await store.update('r1', (r) => ({ ...r, status: 'playing' }));
    expect(updated?.status).toBe('playing');
    expect((await store.getById('r1'))?.status).toBe('playing');
  });

  it('deletes by id and clears the code lookup', async () => {
    const store = new InMemoryRoomStore();
    await store.create(makeRoom());
    await store.delete('r1');
    expect(await store.getById('r1')).toBeNull();
    expect(await store.getByCode('123456')).toBeNull();
  });
});
