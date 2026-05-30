import { describe, it, expect, beforeEach } from 'vitest';
import { useFeedStore, FADE_MS } from './feed-store.js';

beforeEach(() => {
  useFeedStore.getState().clear();
});

describe('useFeedStore', () => {
  it('appends events with an expiresAt 15s out', () => {
    const now = 1_000_000;
    useFeedStore.getState().appendEvent(
      { id: 'e1', ts: now, type: 'asked', askerId: 'p1', targetId: 'p2', request: { kind: 'joker' }, cardTransferred: null },
      now,
    );
    const entries = useFeedStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.expiresAt).toBe(now + FADE_MS);
  });

  it('prune removes expired entries', () => {
    const now = 1_000_000;
    const old = now - FADE_MS - 1;
    useFeedStore.getState().appendEvent(
      { id: 'old', ts: old, type: 'asked', askerId: 'p1', targetId: 'p2', request: { kind: 'joker' }, cardTransferred: null },
      old,
    );
    useFeedStore.getState().appendEvent(
      { id: 'fresh', ts: now, type: 'asked', askerId: 'p1', targetId: 'p2', request: { kind: 'joker' }, cardTransferred: null },
      now,
    );
    useFeedStore.getState().prune(now);
    const entries = useFeedStore.getState().entries;
    expect(entries.map((e) => e.id)).toEqual(['fresh']);
  });
});
