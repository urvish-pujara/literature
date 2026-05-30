import { describe, it, expect } from 'vitest';
import type { Card, ClaimAction, GameState, Player } from '@literature/shared';
import { CLASSIC } from '@literature/shared';
import { resolveClaim } from './claim.js';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

const std = (id: string): Card => ({ kind: 'standard', id, suit: 'hearts', rank: '2' });

const HEARTS_MINOR = ['2H', '3H', '4H', '5H', '6H', '7H'];

function stateWithHeartsMinorDistributed(distribution: Record<string, string>): GameState {
  const hands: Record<string, Card[]> = Object.fromEntries(PLAYERS.map((p) => [p.id, []]));
  for (const [cardId, holder] of Object.entries(distribution)) {
    hands[holder] = [...(hands[holder] ?? []), std(cardId)];
  }
  return {
    variant: 'classic',
    phase: 'playing',
    players: PLAYERS,
    hands,
    turn: { playerId: 'p1', actionCount: 0 },
    score: { A: 0, B: 0 },
    claimedSets: [],
  };
}

const correctClaim = (claimantId: string): ClaimAction => ({
  type: 'claim',
  claimantId,
  setId: 'hearts-minor',
  assignments: { '2H': 'p1', '3H': 'p1', '4H': 'p3', '5H': 'p3', '6H': 'p5', '7H': 'p5' },
});

const TRUE_DIST: Record<string, string> = {
  '2H': 'p1',
  '3H': 'p1',
  '4H': 'p3',
  '5H': 'p3',
  '6H': 'p5',
  '7H': 'p5',
};

describe('resolveClaim — correct claim', () => {
  it('awards 1 point to claimant team', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const result = resolveClaim(state, CLASSIC, correctClaim('p1'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.score.A).toBe(1);
      expect(result.state.score.B).toBe(0);
      expect(result.event.success).toBe(true);
      expect(result.event.scoringTeam).toBe('A');
    }
  });

  it('removes all 6 cards from play', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const result = resolveClaim(state, CLASSIC, correctClaim('p1'));
    if (!result.ok) throw new Error('expected ok');
    for (const hand of Object.values(result.state.hands)) {
      for (const c of hand) {
        expect(HEARTS_MINOR).not.toContain(c.id);
      }
    }
  });

  it('records the set in claimedSets', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const result = resolveClaim(state, CLASSIC, correctClaim('p1'));
    if (!result.ok) throw new Error('expected ok');
    expect(result.state.claimedSets).toHaveLength(1);
    expect(result.state.claimedSets[0]?.setId).toBe('hearts-minor');
    expect(result.state.claimedSets[0]?.winningTeam).toBe('A');
  });

  it('emits trueDistribution in the event', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const result = resolveClaim(state, CLASSIC, correctClaim('p1'));
    if (!result.ok) throw new Error('expected ok');
    expect(result.event.trueDistribution).toEqual(TRUE_DIST);
  });
});

describe('resolveClaim — wrong claim', () => {
  it('awards 1 point to opposing team on one wrong assignment', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const wrong: ClaimAction = {
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
      assignments: {
        '2H': 'p1',
        '3H': 'p1',
        '4H': 'p3',
        '5H': 'p3',
        '6H': 'p3',
        '7H': 'p5',
      },
    };
    const result = resolveClaim(state, CLASSIC, wrong);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.score.A).toBe(0);
      expect(result.state.score.B).toBe(1);
      expect(result.event.success).toBe(false);
      expect(result.event.scoringTeam).toBe('B');
    }
  });

  it('still removes all 6 cards on a wrong claim', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const wrong: ClaimAction = {
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
      assignments: { ...TRUE_DIST, '6H': 'p3' },
    };
    const result = resolveClaim(state, CLASSIC, wrong);
    if (!result.ok) throw new Error('expected ok');
    for (const hand of Object.values(result.state.hands)) {
      for (const c of hand) {
        expect(HEARTS_MINOR).not.toContain(c.id);
      }
    }
  });
});

describe('resolveClaim — claim by player with zero cards in the set', () => {
  it('still works (claim by teammate is allowed)', () => {
    const state = stateWithHeartsMinorDistributed({
      '2H': 'p3',
      '3H': 'p3',
      '4H': 'p3',
      '5H': 'p5',
      '6H': 'p5',
      '7H': 'p5',
    });
    const claim: ClaimAction = {
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
      assignments: {
        '2H': 'p3',
        '3H': 'p3',
        '4H': 'p3',
        '5H': 'p5',
        '6H': 'p5',
        '7H': 'p5',
      },
    };
    const result = resolveClaim(state, CLASSIC, claim);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.score.A).toBe(1);
  });
});

describe('resolveClaim — validation errors', () => {
  it('rejects unknown set', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const claim: ClaimAction = {
      type: 'claim',
      claimantId: 'p1',
      setId: 'bogus',
      assignments: TRUE_DIST,
    };
    const result = resolveClaim(state, CLASSIC, claim);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_SET');
  });

  it('rejects already-claimed set', () => {
    const state: GameState = {
      ...stateWithHeartsMinorDistributed(TRUE_DIST),
      claimedSets: [{ setId: 'hearts-minor', winningTeam: 'A' }],
    };
    const result = resolveClaim(state, CLASSIC, correctClaim('p1'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ALREADY_CLAIMED');
  });

  it('rejects incomplete assignments', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const claim: ClaimAction = {
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
      assignments: { '2H': 'p1', '3H': 'p1', '4H': 'p3', '5H': 'p3', '6H': 'p5' },
    };
    const result = resolveClaim(state, CLASSIC, claim);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INCOMPLETE_ASSIGNMENTS');
  });

  it('rejects assignment to opposing team', () => {
    const state = stateWithHeartsMinorDistributed(TRUE_DIST);
    const claim: ClaimAction = {
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
      assignments: { ...TRUE_DIST, '6H': 'p2' },
    };
    const result = resolveClaim(state, CLASSIC, claim);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_ASSIGNEE_TEAM');
  });
});

describe('resolveClaim — game end', () => {
  it('flips phase to ended when the last set is claimed', () => {
    const state: GameState = {
      ...stateWithHeartsMinorDistributed(TRUE_DIST),
      claimedSets: CLASSIC.sets
        .filter((s) => s.setId !== 'hearts-minor')
        .map((s) => ({ setId: s.setId, winningTeam: 'A' as const })),
    };
    const result = resolveClaim(state, CLASSIC, correctClaim('p1'));
    if (!result.ok) throw new Error('expected ok');
    expect(result.state.phase).toBe('ended');
  });
});
