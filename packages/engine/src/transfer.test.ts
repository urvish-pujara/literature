import { describe, it, expect } from 'vitest';
import type { Card, PlayerId } from '@literature/shared';
import { applyAskTransfer } from './transfer.js';

const std = (id: string): Card => ({ kind: 'standard', id, suit: 'hearts', rank: '2' });
const joker = (id: 'JOKER_1' | 'JOKER_2'): Card => ({ kind: 'joker', id });

function hands(map: Record<PlayerId, Card[]>): Record<PlayerId, Card[]> {
  return { p1: [], p2: [], p3: [], p4: [], p5: [], p6: [], ...map };
}

describe('applyAskTransfer — standard cards', () => {
  it('moves the requested card when target holds it', () => {
    const start = hands({ p1: [std('3H')], p2: [std('2H'), std('5H')] });
    const result = applyAskTransfer(start, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.cardTransferred?.id).toBe('2H');
    expect(result.hands.p1).toHaveLength(2);
    expect(result.hands.p1?.map((c) => c.id)).toContain('2H');
    expect(result.hands.p2).toHaveLength(1);
    expect(result.hands.p2?.map((c) => c.id)).not.toContain('2H');
  });

  it('returns no transfer when target does not hold the card', () => {
    const start = hands({ p1: [std('3H')], p2: [std('5H')] });
    const result = applyAskTransfer(start, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.cardTransferred).toBeNull();
    expect(result.hands.p1).toEqual([std('3H')]);
    expect(result.hands.p2).toEqual([std('5H')]);
  });

  it('does not mutate the input hands', () => {
    const start = hands({ p1: [std('3H')], p2: [std('2H')] });
    const snapshotP1 = [...(start.p1 ?? [])];
    const snapshotP2 = [...(start.p2 ?? [])];
    applyAskTransfer(start, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(start.p1).toEqual(snapshotP1);
    expect(start.p2).toEqual(snapshotP2);
  });
});

describe('applyAskTransfer — jokers', () => {
  it('transfers exactly one joker when target holds one', () => {
    const start = hands({ p1: [std('8H')], p2: [joker('JOKER_1')] });
    const result = applyAskTransfer(start, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.cardTransferred?.kind).toBe('joker');
    expect(result.hands.p1?.filter((c) => c.kind === 'joker')).toHaveLength(1);
    expect(result.hands.p2?.filter((c) => c.kind === 'joker')).toHaveLength(0);
  });

  it('transfers exactly one joker when target holds both', () => {
    const start = hands({ p1: [std('8H')], p2: [joker('JOKER_1'), joker('JOKER_2')] });
    const result = applyAskTransfer(start, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.cardTransferred?.kind).toBe('joker');
    expect(result.hands.p1?.filter((c) => c.kind === 'joker')).toHaveLength(1);
    expect(result.hands.p2?.filter((c) => c.kind === 'joker')).toHaveLength(1);
  });

  it('returns no transfer when target holds no jokers', () => {
    const start = hands({ p1: [std('8H')], p2: [std('8C')] });
    const result = applyAskTransfer(start, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.cardTransferred).toBeNull();
    expect(result.hands).toBe(start);
  });
});
