import { describe, it, expect } from 'vitest';
import type { Card, GameState, Player } from './index.js';
import { project } from './projection.js';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

const std = (id: string): Card => ({ kind: 'standard', id, suit: 'hearts', rank: '2' });

const state: GameState = {
  variant: 'classic',
  phase: 'playing',
  players: PLAYERS,
  hands: {
    p1: [std('2H'), std('3H')],
    p2: [std('4H')],
    p3: [std('5H'), std('6H'), std('7H')],
    p4: [std('9H')],
    p5: [std('TH')],
    p6: [std('JH')],
  },
  turn: { playerId: 'p1', actionCount: 0 },
  score: { A: 0, B: 0 },
  claimedSets: [],
};

describe('project', () => {
  it('returns the viewer’s full hand', () => {
    const view = project(state, 'p1');
    expect(view.you.id).toBe('p1');
    expect(view.you.hand.map((c) => c.id)).toEqual(['2H', '3H']);
  });

  it('returns only handCounts for other players — never their cards', () => {
    const view = project(state, 'p1');
    for (const p of view.players) {
      expect(p).not.toHaveProperty('hand');
    }
    const p3 = view.players.find((p) => p.id === 'p3');
    expect(p3?.handCount).toBe(3);
  });

  it('does not include any other player’s card ids anywhere in the projection', () => {
    const view = project(state, 'p1');
    const serialized = JSON.stringify(view);
    // p1 holds 2H, 3H — those are allowed. p2 holds 4H, etc — must not appear.
    const forbidden = ['4H', '5H', '6H', '7H', '9H', 'TH', 'JH'];
    for (const cardId of forbidden) {
      expect(serialized).not.toContain(`"${cardId}"`);
    }
  });

  it('handles a viewer with no hand entry (defensively returns empty hand)', () => {
    const view = project(state, 'ghost');
    expect(view.you.hand).toEqual([]);
  });

  it('preserves turn, score, and claimedSets verbatim', () => {
    const view = project(state, 'p1');
    expect(view.turn).toEqual(state.turn);
    expect(view.score).toEqual(state.score);
    expect(view.claimedSets).toEqual(state.claimedSets);
  });
});
