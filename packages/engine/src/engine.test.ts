import { describe, it, expect } from 'vitest';
import type { Player } from '@literature/shared';
import { EXTENDED, CLASSIC } from '@literature/shared';
import { applyAction, startGame } from './engine.js';
import { mulberry32 } from './rng.js';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

describe('startGame', () => {
  it('deals hands and sets phase to playing', () => {
    const { state, events } = startGame(CLASSIC, PLAYERS, mulberry32(1));
    expect(state.phase).toBe('playing');
    expect(events[0]?.type).toBe('dealt');
    for (const p of PLAYERS) {
      expect(state.hands[p.id]).toHaveLength(CLASSIC.cardsPerPlayer);
    }
  });

  it('starts with the lowest-seat player', () => {
    const { state } = startGame(CLASSIC, PLAYERS, mulberry32(1));
    expect(state.turn.playerId).toBe('p1');
  });
});

describe('applyAction — ask routing', () => {
  it('returns error for invalid asks', () => {
    const { state } = startGame(CLASSIC, PLAYERS, mulberry32(1));
    const result = applyAction(state, CLASSIC, {
      type: 'ask',
      askerId: 'p3',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_YOUR_TURN');
  });

  it('progresses state on a valid ask', () => {
    const { state } = startGame(CLASSIC, PLAYERS, mulberry32(1));
    const p1Hand = state.hands.p1 ?? [];
    const askedCard = p1Hand[0]!;
    // pick a different card in the same set that p1 doesn't hold
    const setCardIds = CLASSIC.sets
      .find((s) => s.cards.some((c) => c.id === askedCard.id))!
      .cards.map((c) => c.id);
    const candidate = setCardIds.find((id) => !p1Hand.some((c) => c.id === id));
    expect(candidate).toBeDefined();
    const result = applyAction(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: candidate! },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.type).toBe('asked');
    }
  });
});

describe('applyAction — three-move sequence with hand assertions', () => {
  it('handles ask-success → retain turn → ask-fail → pass turn', () => {
    const players = PLAYERS;
    const { state: s0 } = startGame(EXTENDED, players, mulberry32(42));

    // Find a deterministic legal ask: p1 picks a card they don't hold from a set they have at least one card in
    const askerId = s0.turn.playerId;
    expect(askerId).toBe('p1');
    const p1Hand = s0.hands[askerId] ?? [];
    let askCardId: string | undefined;
    let targetId: string | undefined;
    let setOfAskedCard: { setId: string; cards: { id: string }[] } | undefined;
    for (const set of EXTENDED.sets) {
      const askerHasInSet = p1Hand.some((c) => set.cards.some((sc) => sc.id === c.id));
      if (!askerHasInSet) continue;
      for (const c of set.cards) {
        if (p1Hand.some((pc) => pc.id === c.id)) continue;
        // find which opponent holds it
        for (const opp of players.filter((p) => p.team !== 'A')) {
          if (s0.hands[opp.id]?.some((oc) => oc.id === c.id)) {
            askCardId = c.id;
            targetId = opp.id;
            setOfAskedCard = set;
            break;
          }
        }
        if (askCardId) break;
      }
      if (askCardId) break;
    }
    expect(askCardId).toBeDefined();
    expect(targetId).toBeDefined();
    expect(setOfAskedCard).toBeDefined();

    // First ask — should succeed (target holds the card)
    const r1 = applyAction(s0, EXTENDED, {
      type: 'ask',
      askerId,
      targetId: targetId!,
      request: { kind: 'standard', cardId: askCardId! },
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.state.turn.playerId).toBe(askerId);
    expect(r1.state.hands[askerId]?.some((c) => c.id === askCardId)).toBe(true);
    expect(r1.state.hands[targetId!]?.some((c) => c.id === askCardId)).toBe(false);

    // Find a card in same set that nobody on opposing team has -> ask one that opponent does NOT have
    // Easier: ask the same card again. p1 now holds it, so target will not. validator passes BASE_REQUIREMENT (set in hand),
    // but ABSENCE_REQUIREMENT will fail because p1 holds it. We need a different unheld card from same set.
    const newP1Hand = r1.state.hands[askerId] ?? [];
    let secondAskCardId: string | undefined;
    let secondTargetId: string | undefined;
    for (const c of setOfAskedCard!.cards) {
      if (newP1Hand.some((pc) => pc.id === c.id)) continue;
      for (const opp of players.filter((p) => p.team !== 'A')) {
        if (!r1.state.hands[opp.id]?.some((oc) => oc.id === c.id)) {
          secondAskCardId = c.id;
          secondTargetId = opp.id;
          break;
        }
      }
      if (secondAskCardId) break;
    }
    if (!secondAskCardId || !secondTargetId) return;

    const r2 = applyAction(r1.state, EXTENDED, {
      type: 'ask',
      askerId,
      targetId: secondTargetId,
      request: { kind: 'standard', cardId: secondAskCardId },
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    // failed ask passes turn to the target
    expect(r2.state.turn.playerId).toBe(secondTargetId);
  });
});

describe('applyAction — claim routing', () => {
  it('returns error for unknown set', () => {
    const { state } = startGame(CLASSIC, PLAYERS, mulberry32(1));
    const result = applyAction(state, CLASSIC, {
      type: 'claim',
      claimantId: 'p1',
      setId: 'bogus',
      assignments: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_SET');
  });
});

describe('applyAction — invariants', () => {
  it('does not mutate the input state', () => {
    const { state } = startGame(CLASSIC, PLAYERS, mulberry32(1));
    const handSnapshot = JSON.stringify(state.hands);
    const turnSnapshot = JSON.stringify(state.turn);
    applyAction(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: state.hands.p2?.[0]?.id ?? '2H' },
    });
    expect(JSON.stringify(state.hands)).toBe(handSnapshot);
    expect(JSON.stringify(state.turn)).toBe(turnSnapshot);
  });
});
