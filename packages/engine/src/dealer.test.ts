import { describe, it, expect } from 'vitest';
import type { Player } from '@literature/shared';
import { CLASSIC, EXTENDED, getDeck } from '@literature/shared';
import { deal, shuffle } from './dealer.js';
import { mulberry32 } from './rng.js';

const SIX_PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

describe('shuffle', () => {
  it('is deterministic given the same seed', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], mulberry32(42));
    expect(a).toEqual(b);
  });

  it('returns a permutation (same elements, possibly different order)', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(7));
    expect(out.sort((x, y) => x - y)).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    shuffle(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('deal — CLASSIC', () => {
  it('gives every player exactly 8 cards', () => {
    const hands = deal(CLASSIC, SIX_PLAYERS, mulberry32(1));
    for (const p of SIX_PLAYERS) {
      expect(hands[p.id]).toHaveLength(8);
    }
  });

  it('deals all 48 cards with no duplicates', () => {
    const hands = deal(CLASSIC, SIX_PLAYERS, mulberry32(1));
    const allCardIds = Object.values(hands)
      .flat()
      .map((c) => c.id);
    expect(allCardIds).toHaveLength(48);
    expect(new Set(allCardIds).size).toBe(48);
  });

  it('every dealt card belongs to the CLASSIC deck', () => {
    const hands = deal(CLASSIC, SIX_PLAYERS, mulberry32(1));
    const deckIds = new Set(getDeck(CLASSIC).map((c) => c.id));
    for (const c of Object.values(hands).flat()) {
      expect(deckIds.has(c.id)).toBe(true);
    }
  });

  it('is deterministic given the same seed', () => {
    const a = deal(CLASSIC, SIX_PLAYERS, mulberry32(99));
    const b = deal(CLASSIC, SIX_PLAYERS, mulberry32(99));
    expect(a).toEqual(b);
  });
});

describe('deal — EXTENDED', () => {
  it('gives every player exactly 9 cards', () => {
    const hands = deal(EXTENDED, SIX_PLAYERS, mulberry32(1));
    for (const p of SIX_PLAYERS) {
      expect(hands[p.id]).toHaveLength(9);
    }
  });

  it('deals all 54 cards with no duplicates', () => {
    const hands = deal(EXTENDED, SIX_PLAYERS, mulberry32(1));
    const allCardIds = Object.values(hands)
      .flat()
      .map((c) => c.id);
    expect(allCardIds).toHaveLength(54);
    expect(new Set(allCardIds).size).toBe(54);
  });

  it('both Jokers are dealt somewhere', () => {
    const hands = deal(EXTENDED, SIX_PLAYERS, mulberry32(1));
    const jokers = Object.values(hands)
      .flat()
      .filter((c) => c.kind === 'joker');
    expect(jokers).toHaveLength(2);
    const ids = new Set(jokers.map((j) => j.id));
    expect(ids.has('JOKER_1')).toBe(true);
    expect(ids.has('JOKER_2')).toBe(true);
  });
});

describe('deal — validation', () => {
  it('rejects player count != 6', () => {
    const five = SIX_PLAYERS.slice(0, 5);
    expect(() => deal(CLASSIC, five, mulberry32(1))).toThrow();
  });
});
