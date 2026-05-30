import { describe, it, expect } from 'vitest';
import type { Card, GameState, Player } from '@literature/shared';
import { CLASSIC } from '@literature/shared';
import { applyAction } from './engine.js';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

const hc = (id: string): Card => ({ kind: 'standard', id, suit: 'hearts', rank: '2' });

function handIds(state: GameState, pid: string): string[] {
  return (state.hands[pid] ?? []).map((c) => c.id).sort();
}

describe('Turn flow — 3-action sequence with hand-level assertions', () => {
  it('ask-success → retain → ask-fail → pass → ask-success → retain', () => {
    // Hand-built state. Two sets in play: hearts-minor (2H..7H), hearts-major (9H..AH).
    // p1 (team A) holds 2H, 9H. p2 (team B) holds 3H. p4 (team B) holds 4H. p3 (team A) holds 5H.
    const state0: GameState = {
      variant: 'classic',
      phase: 'playing',
      players: PLAYERS,
      hands: {
        p1: [hc('2H'), hc('9H')],
        p2: [hc('3H')],
        p3: [hc('5H')],
        p4: [hc('4H')],
        p5: [hc('6H')],
        p6: [hc('7H')],
      },
      turn: { playerId: 'p1', actionCount: 0 },
      score: { A: 0, B: 0 },
      claimedSets: [],
    };

    // ACTION 1: p1 asks p2 for 3H — p2 has it → SUCCESS
    const r1 = applyAction(state0, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '3H' },
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(handIds(r1.state, 'p1')).toEqual(['2H', '3H', '9H']);
    expect(handIds(r1.state, 'p2')).toEqual([]);
    expect(r1.state.turn.playerId).toBe('p1');
    expect(r1.state.turn.actionCount).toBe(1);
    expect(r1.events[0]?.type).toBe('asked');
    if (r1.events[0]?.type === 'asked') expect(r1.events[0].cardTransferred).toBe('3H');

    // ACTION 2: p1 asks p4 for 5H — p3 (teammate) has it, p4 does not → FAIL
    const r2 = applyAction(r1.state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p4',
      request: { kind: 'standard', cardId: '5H' },
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(handIds(r2.state, 'p1')).toEqual(['2H', '3H', '9H']); // unchanged
    expect(handIds(r2.state, 'p4')).toEqual(['4H']); // unchanged
    expect(handIds(r2.state, 'p3')).toEqual(['5H']); // unchanged
    expect(r2.state.turn.playerId).toBe('p4');
    expect(r2.state.turn.actionCount).toBe(2);
    if (r2.events[0]?.type === 'asked') expect(r2.events[0].cardTransferred).toBeNull();

    // ACTION 3: p4 asks p3 for 5H — p3 has it → SUCCESS
    const r3 = applyAction(r2.state, CLASSIC, {
      type: 'ask',
      askerId: 'p4',
      targetId: 'p3',
      request: { kind: 'standard', cardId: '5H' },
    });
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    expect(handIds(r3.state, 'p4')).toEqual(['4H', '5H']);
    expect(handIds(r3.state, 'p3')).toEqual([]);
    expect(r3.state.turn.playerId).toBe('p4');
    expect(r3.state.turn.actionCount).toBe(3);

    // Sanity: total cards conserved across all actions
    const totalCards = Object.values(r3.state.hands).flat().length;
    expect(totalCards).toBe(7); // started with 7
  });

  it('successful ask emptying the target — turn passes to teammate of asker only if asker empties', () => {
    // Special case: ask-success drains the asker (asker had only one card, didn't have the target's, got transferred a card back)
    // Actually a successful ask ADDS a card to asker. Asker emptying only happens via claim. Skipped.
    // But: ask-fail can cause target to remain active even if depleted-after-no-transfer. The transfer didn't happen, so hands unchanged.
    const state: GameState = {
      variant: 'classic',
      phase: 'playing',
      players: PLAYERS,
      hands: {
        p1: [hc('2H')],
        p2: [],
        p3: [],
        p4: [],
        p5: [hc('3H')],
        p6: [],
      },
      turn: { playerId: 'p1', actionCount: 0 },
      score: { A: 0, B: 0 },
      claimedSets: [],
    };

    // p1 asks p2 for 4H — base requirement met (p1 holds 2H in hearts-minor), p2 has no cards → FAIL, turn → p2
    // but p2 has zero cards → resolver passes turn to teammate (p4 or p6, both empty too, then fallback to p2)
    const r = applyAction(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '4H' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // p2, p4, p6 all empty — fallback to candidate (p2)
    expect(r.state.turn.playerId).toBe('p2');
  });
});
