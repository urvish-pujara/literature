import { describe, it, expect } from 'vitest';
import type { Card, GameState, Player } from '@literature/shared';
import { CLASSIC, EXTENDED } from '@literature/shared';
import { validateAsk } from './validator.js';

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

const std = (id: string): Card => ({
  kind: 'standard',
  id,
  suit: 'hearts',
  rank: '2',
});

const joker = (id: 'JOKER_1' | 'JOKER_2'): Card => ({ kind: 'joker', id });

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    variant: 'classic',
    phase: 'playing',
    players: PLAYERS,
    hands: Object.fromEntries(PLAYERS.map((p) => [p.id, []])),
    turn: { playerId: 'p1', actionCount: 0 },
    score: { A: 0, B: 0 },
    claimedSets: [],
    ...overrides,
  };
}

describe('validateAsk — game phase and turn', () => {
  it('fails when game is not playing', () => {
    const state = makeState({ phase: 'lobby' });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('GAME_NOT_PLAYING');
  });

  it('fails when it is not the asker’s turn', () => {
    const state = makeState({
      turn: { playerId: 'p3', actionCount: 0 },
      hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: [std('3H')] },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_YOUR_TURN');
  });
});

describe('validateAsk — targeting', () => {
  it('fails when target is on the same team as asker', () => {
    const state = makeState({
      hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: [std('3H')] },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p3',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('TARGETING');
  });

  it('succeeds for opposing team', () => {
    const state = makeState({
      hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: [std('3H')] },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateAsk — base requirement', () => {
  it('fails when asker holds no card in the requested set', () => {
    const state = makeState({
      hands: {
        ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])),
        p1: [std('9C')],
      },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('BASE_REQUIREMENT');
  });

  it('passes when asker holds at least one card in the set', () => {
    const state = makeState({
      hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: [std('3H')] },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateAsk — absence requirement (standard cards)', () => {
  it('fails when asker already holds the requested card', () => {
    const state = makeState({
      hands: {
        ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])),
        p1: [std('2H'), std('3H')],
      },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ABSENCE_REQUIREMENT');
  });
});

describe('validateAsk — unknown identifiers', () => {
  it('rejects unknown card id', () => {
    const state = makeState({
      hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: [std('3H')] },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: 'XX' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_CARD');
  });

  it('rejects joker request in CLASSIC (no joker set)', () => {
    const state = makeState({
      hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: [std('3H')] },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_SET');
  });

  it('rejects unknown asker', () => {
    const state = makeState({
      turn: { playerId: 'ghost', actionCount: 0 },
    });
    const result = validateAsk(state, CLASSIC, {
      type: 'ask',
      askerId: 'ghost',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_PLAYER');
  });
});

describe('validateAsk — JOKER MATRIX (EXTENDED)', () => {
  type Case = {
    label: string;
    askerHand: Card[];
    expected: 'ok' | 'BASE_REQUIREMENT' | 'ABSENCE_REQUIREMENT';
  };

  const eight = std('8H');
  const j1 = joker('JOKER_1');
  const j2 = joker('JOKER_2');

  const cases: Case[] = [
    {
      label: '0 jokers, no 8: BASE_REQUIREMENT',
      askerHand: [std('3H')],
      expected: 'BASE_REQUIREMENT',
    },
    { label: '0 jokers, has 8: ok', askerHand: [eight], expected: 'ok' },
    { label: '1 joker, no 8: ok', askerHand: [j1], expected: 'ok' },
    { label: '1 joker + 8: ok', askerHand: [j1, eight], expected: 'ok' },
    {
      label: '2 jokers, no 8: ABSENCE_REQUIREMENT',
      askerHand: [j1, j2],
      expected: 'ABSENCE_REQUIREMENT',
    },
    {
      label: '2 jokers + 8: ABSENCE_REQUIREMENT',
      askerHand: [j1, j2, eight],
      expected: 'ABSENCE_REQUIREMENT',
    },
  ];

  for (const c of cases) {
    it(c.label, () => {
      const state = makeState({
        variant: 'extended',
        hands: { ...Object.fromEntries(PLAYERS.map((p) => [p.id, []])), p1: c.askerHand },
      });
      const result = validateAsk(state, EXTENDED, {
        type: 'ask',
        askerId: 'p1',
        targetId: 'p2',
        request: { kind: 'joker' },
      });
      if (c.expected === 'ok') {
        expect(result.ok).toBe(true);
      } else {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe(c.expected);
      }
    });
  }
});
