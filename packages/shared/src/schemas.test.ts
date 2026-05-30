import { describe, it, expect, expectTypeOf } from 'vitest';
import type { z } from 'zod';
import {
  AskActionSchema,
  ClaimActionSchema,
  CardRequestSchema,
  LobbySeatPayloadSchema,
} from './schemas.js';
import type { GameActionSchema } from './schemas.js';
import type { AskAction, ClaimAction, GameAction } from './actions.js';
import type { CardRequest } from './cards.js';

describe('schema/type parity', () => {
  it('AskActionSchema matches AskAction', () => {
    expectTypeOf<z.infer<typeof AskActionSchema>>().toEqualTypeOf<AskAction>();
  });

  it('ClaimActionSchema matches ClaimAction', () => {
    expectTypeOf<z.infer<typeof ClaimActionSchema>>().toEqualTypeOf<ClaimAction>();
  });

  it('GameActionSchema matches GameAction', () => {
    expectTypeOf<z.infer<typeof GameActionSchema>>().toEqualTypeOf<GameAction>();
  });

  it('CardRequestSchema matches CardRequest', () => {
    expectTypeOf<z.infer<typeof CardRequestSchema>>().toEqualTypeOf<CardRequest>();
  });
});

describe('AskActionSchema', () => {
  it('accepts a valid standard ask', () => {
    const result = AskActionSchema.safeParse({
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'standard', cardId: '2H' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid joker ask', () => {
    const result = AskActionSchema.safeParse({
      type: 'ask',
      askerId: 'p1',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty askerId', () => {
    const result = AskActionSchema.safeParse({
      type: 'ask',
      askerId: '',
      targetId: 'p2',
      request: { kind: 'joker' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a joker request with a cardId field', () => {
    const result = CardRequestSchema.safeParse({ kind: 'joker', cardId: 'JOKER_1' });
    expect(result.success).toBe(true);
  });
});

describe('ClaimActionSchema', () => {
  it('accepts a valid claim', () => {
    const result = ClaimActionSchema.safeParse({
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
      assignments: { '2H': 'p1', '3H': 'p1', '4H': 'p3', '5H': 'p3', '6H': 'p5', '7H': 'p5' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing assignments', () => {
    const result = ClaimActionSchema.safeParse({
      type: 'claim',
      claimantId: 'p1',
      setId: 'hearts-minor',
    });
    expect(result.success).toBe(false);
  });
});

describe('LobbySeatPayloadSchema', () => {
  it('accepts seat indices 0-5', () => {
    for (let i = 0; i <= 5; i++) {
      expect(LobbySeatPayloadSchema.safeParse({ team: 'A', seatIndex: i }).success).toBe(true);
    }
  });

  it('rejects seat index 6', () => {
    expect(LobbySeatPayloadSchema.safeParse({ team: 'A', seatIndex: 6 }).success).toBe(false);
  });

  it('rejects an invalid team', () => {
    expect(LobbySeatPayloadSchema.safeParse({ team: 'C', seatIndex: 0 }).success).toBe(false);
  });
});
