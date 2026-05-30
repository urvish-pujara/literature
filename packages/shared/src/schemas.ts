import { z } from 'zod';

export const CardRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('standard'), cardId: z.string().min(1) }),
  z.object({ kind: z.literal('joker') }),
]);

export const AskActionSchema = z.object({
  type: z.literal('ask'),
  askerId: z.string().min(1),
  targetId: z.string().min(1),
  request: CardRequestSchema,
});

export const ClaimActionSchema = z.object({
  type: z.literal('claim'),
  claimantId: z.string().min(1),
  setId: z.string().min(1),
  assignments: z.record(z.string().min(1), z.string().min(1)),
});

export const GameActionSchema = z.discriminatedUnion('type', [AskActionSchema, ClaimActionSchema]);

export const TeamSchema = z.enum(['A', 'B']);

export const LobbySeatPayloadSchema = z.object({
  team: TeamSchema,
  seatIndex: z.number().int().min(0).max(5),
});

export const VariantNameSchema = z.enum(['classic', 'extended']);

export const CreateRoomBodySchema = z.object({
  variant: VariantNameSchema,
});

export const JoinRoomBodySchema = z.object({
  displayName: z.string().min(1).max(32),
});
