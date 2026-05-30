import { describe, it, expect } from 'vitest';
import type { Card, GameState, Player } from '@literature/shared';
import { EXTENDED } from '@literature/shared';
import { applyAction } from './engine.js';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

const eight = (suit: 'H' | 'D' | 'C' | 'S'): Card => ({
  kind: 'standard',
  id: `8${suit}`,
  suit: { H: 'hearts', D: 'diamonds', C: 'clubs', S: 'spades' }[suit] as Card extends { suit: infer S } ? S : never,
  rank: '8',
});

const joker = (id: 'JOKER_1' | 'JOKER_2'): Card => ({ kind: 'joker', id });

type Outcome =
  | { kind: 'invalid'; code: 'BASE_REQUIREMENT' | 'ABSENCE_REQUIREMENT' }
  | { kind: 'valid'; transferHappens: boolean };

function expectedOutcome(askerHas8: boolean, askerJokers: 0 | 1 | 2, targetJokers: 0 | 1 | 2): Outcome {
  if (askerJokers >= 2) return { kind: 'invalid', code: 'ABSENCE_REQUIREMENT' };
  if (!askerHas8 && askerJokers === 0) return { kind: 'invalid', code: 'BASE_REQUIREMENT' };
  return { kind: 'valid', transferHappens: targetJokers > 0 };
}

function buildState(askerHas8: boolean, askerJokers: 0 | 1 | 2, targetJokers: 0 | 1 | 2): GameState {
  const askerHand: Card[] = [];
  if (askerHas8) askerHand.push(eight('H'));

  // give target a filler 2H so they're never empty (keeps turn resolver from skipping them on failed ask)
  const targetHand: Card[] = [
    { kind: 'standard', id: '2H', suit: 'hearts', rank: '2' },
  ];

  const jokers: Card[] = [joker('JOKER_1'), joker('JOKER_2')];
  for (let i = 0; i < askerJokers; i++) askerHand.push(jokers[i]!);
  for (let i = 0; i < targetJokers; i++) {
    targetHand.push(jokers[askerJokers + i]!);
  }

  return {
    variant: 'extended',
    phase: 'playing',
    players: PLAYERS,
    hands: {
      p1: askerHand,
      p2: targetHand,
      p3: [eight('C')],
      p4: [eight('D')],
      p5: [eight('S')],
      p6: [{ kind: 'standard', id: '3H', suit: 'hearts', rank: '3' }],
    },
    turn: { playerId: 'p1', actionCount: 0 },
    score: { A: 0, B: 0 },
    claimedSets: [],
  };
}

describe('JOKER MATRIX through applyAction (asker has-8 × asker jokers × target jokers = 18 cases)', () => {
  const askerHas8s = [false, true] as const;
  const jokerCounts = [0, 1, 2] as const;

  for (const askerHas8 of askerHas8s) {
    for (const askerJokers of jokerCounts) {
      for (const targetJokers of jokerCounts) {
        // Skip impossible: asker holds both jokers AND target holds one (can't have 3 jokers in play)
        if (askerJokers + targetJokers > 2) continue;

        const label = `asker has8=${askerHas8} jokers=${askerJokers}, target jokers=${targetJokers}`;
        const expected = expectedOutcome(askerHas8, askerJokers, targetJokers);

        it(`${label} → ${expected.kind === 'invalid' ? expected.code : `transfer=${expected.transferHappens}`}`, () => {
          const state = buildState(askerHas8, askerJokers, targetJokers);
          const result = applyAction(state, EXTENDED, {
            type: 'ask',
            askerId: 'p1',
            targetId: 'p2',
            request: { kind: 'joker' },
          });

          if (expected.kind === 'invalid') {
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.code).toBe(expected.code);
            return;
          }

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          const askerJokersAfter = (result.state.hands.p1 ?? []).filter((c) => c.kind === 'joker').length;
          const targetJokersAfter = (result.state.hands.p2 ?? []).filter((c) => c.kind === 'joker').length;
          if (expected.transferHappens) {
            expect(askerJokersAfter).toBe(askerJokers + 1);
            expect(targetJokersAfter).toBe(targetJokers - 1);
            // turn retained
            expect(result.state.turn.playerId).toBe('p1');
          } else {
            expect(askerJokersAfter).toBe(askerJokers);
            expect(targetJokersAfter).toBe(targetJokers);
            // turn passes to target
            expect(result.state.turn.playerId).toBe('p2');
          }
        });
      }
    }
  }
});
