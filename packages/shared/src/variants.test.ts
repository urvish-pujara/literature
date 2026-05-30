import { describe, it, expect } from 'vitest';
import { CLASSIC, EXTENDED, getDeck, findSetForCard } from './variants.js';

describe('CLASSIC variant', () => {
  it('has 48 cards across 8 sets', () => {
    expect(CLASSIC.sets).toHaveLength(8);
    expect(getDeck(CLASSIC)).toHaveLength(48);
    expect(CLASSIC.totalCards).toBe(48);
    expect(CLASSIC.totalSets).toBe(8);
  });

  it('cards divide evenly across 6 players', () => {
    expect(CLASSIC.totalCards % 6).toBe(0);
    expect(CLASSIC.cardsPerPlayer).toBe(CLASSIC.totalCards / 6);
  });

  it('contains no 8s', () => {
    const deck = getDeck(CLASSIC);
    const eights = deck.filter((c) => c.kind === 'standard' && c.rank === '8');
    expect(eights).toHaveLength(0);
  });

  it('contains no Jokers', () => {
    const deck = getDeck(CLASSIC);
    const jokers = deck.filter((c) => c.kind === 'joker');
    expect(jokers).toHaveLength(0);
  });

  it('every card belongs to exactly one set', () => {
    const deck = getDeck(CLASSIC);
    for (const c of deck) {
      const matchingSets = CLASSIC.sets.filter((s) => s.cards.some((sc) => sc.id === c.id));
      expect(matchingSets).toHaveLength(1);
    }
  });
});

describe('EXTENDED variant', () => {
  it('has 54 cards across 9 sets', () => {
    expect(EXTENDED.sets).toHaveLength(9);
    expect(getDeck(EXTENDED)).toHaveLength(54);
    expect(EXTENDED.totalCards).toBe(54);
    expect(EXTENDED.totalSets).toBe(9);
  });

  it('cards divide evenly across 6 players', () => {
    expect(EXTENDED.totalCards % 6).toBe(0);
    expect(EXTENDED.cardsPerPlayer).toBe(EXTENDED.totalCards / 6);
  });

  it('contains four 8s and two Jokers in the same set', () => {
    const set = EXTENDED.sets.find((s) => s.setId === 'eights-and-jokers');
    expect(set).toBeDefined();
    const eights = set!.cards.filter((c) => c.kind === 'standard' && c.rank === '8');
    const jokers = set!.cards.filter((c) => c.kind === 'joker');
    expect(eights).toHaveLength(4);
    expect(jokers).toHaveLength(2);
  });

  it('Jokers have distinct ids', () => {
    const jokers = getDeck(EXTENDED).filter((c) => c.kind === 'joker');
    const ids = new Set(jokers.map((j) => j.id));
    expect(ids.size).toBe(2);
  });

  it('findSetForCard locates each card', () => {
    for (const c of getDeck(EXTENDED)) {
      expect(findSetForCard(EXTENDED, c.id)?.cards.some((sc) => sc.id === c.id)).toBe(true);
    }
  });
});
