import { describe, it, expect } from 'vitest';
import type { AskAction, Card, Player, PlayerId, Turn } from '@literature/shared';
import { nextTurnAfterAsk, resolveActivePlayer } from './turn.js';

const std = (id: string): Card => ({ kind: 'standard', id, suit: 'hearts', rank: '2' });

const PLAYERS: Player[] = [
  { id: 'p1', name: 'P1', team: 'A', seatIndex: 0 },
  { id: 'p2', name: 'P2', team: 'B', seatIndex: 1 },
  { id: 'p3', name: 'P3', team: 'A', seatIndex: 2 },
  { id: 'p4', name: 'P4', team: 'B', seatIndex: 3 },
  { id: 'p5', name: 'P5', team: 'A', seatIndex: 4 },
  { id: 'p6', name: 'P6', team: 'B', seatIndex: 5 },
];

function fullHands(): Record<PlayerId, Card[]> {
  return Object.fromEntries(PLAYERS.map((p) => [p.id, [std(`X${p.seatIndex}`)]]));
}

function turn(playerId: PlayerId, actionCount = 0): Turn {
  return { playerId, actionCount };
}

const askAction = (askerId: PlayerId, targetId: PlayerId): AskAction => ({
  type: 'ask',
  askerId,
  targetId,
  request: { kind: 'standard', cardId: 'doesnt-matter' },
});

describe('nextTurnAfterAsk', () => {
  it('keeps the asker on a successful ask', () => {
    const hands = fullHands();
    const result = nextTurnAfterAsk(PLAYERS, hands, turn('p1'), askAction('p1', 'p2'), true);
    expect(result.playerId).toBe('p1');
    expect(result.actionCount).toBe(1);
  });

  it('passes turn to the target on a failed ask', () => {
    const hands = fullHands();
    const result = nextTurnAfterAsk(PLAYERS, hands, turn('p1'), askAction('p1', 'p2'), false);
    expect(result.playerId).toBe('p2');
    expect(result.actionCount).toBe(1);
  });

  it('skips the asker to a teammate if asker has 0 cards after successful ask', () => {
    const hands = fullHands();
    hands.p1 = [];
    const result = nextTurnAfterAsk(PLAYERS, hands, turn('p1'), askAction('p1', 'p2'), true);
    expect(['p3', 'p5']).toContain(result.playerId);
  });

  it('skips the target to a teammate if target has 0 cards after failed ask', () => {
    const hands = fullHands();
    hands.p2 = [];
    const result = nextTurnAfterAsk(PLAYERS, hands, turn('p1'), askAction('p1', 'p2'), false);
    expect(['p4', 'p6']).toContain(result.playerId);
  });

  it('increments action count regardless of outcome', () => {
    const hands = fullHands();
    const t1 = nextTurnAfterAsk(PLAYERS, hands, turn('p1', 7), askAction('p1', 'p2'), true);
    const t2 = nextTurnAfterAsk(PLAYERS, hands, turn('p1', 7), askAction('p1', 'p2'), false);
    expect(t1.actionCount).toBe(8);
    expect(t2.actionCount).toBe(8);
  });
});

describe('resolveActivePlayer', () => {
  it('returns the candidate when they have cards', () => {
    const hands = fullHands();
    expect(resolveActivePlayer(PLAYERS, hands, 'p1')).toBe('p1');
  });

  it('passes to next teammate in seat order when candidate has no cards', () => {
    const hands = fullHands();
    hands.p1 = [];
    const next = resolveActivePlayer(PLAYERS, hands, 'p1');
    expect(next).toBe('p3');
  });

  it('wraps around teammates if needed', () => {
    const hands = fullHands();
    hands.p1 = [];
    hands.p3 = [];
    const next = resolveActivePlayer(PLAYERS, hands, 'p1');
    expect(next).toBe('p5');
  });

  it('returns the candidate as fallback when no teammate has cards', () => {
    const hands = fullHands();
    hands.p1 = [];
    hands.p3 = [];
    hands.p5 = [];
    const next = resolveActivePlayer(PLAYERS, hands, 'p1');
    expect(next).toBe('p1');
  });
});
