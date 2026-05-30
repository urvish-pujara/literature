import type {
  AskAction,
  Card,
  CardRequest,
  GameState,
  GameVariant,
  Player,
  SetDef,
} from '@literature/shared';
import { findSetForCard } from '@literature/shared';

export type ValidationErrorCode =
  | 'GAME_NOT_PLAYING'
  | 'NOT_YOUR_TURN'
  | 'UNKNOWN_PLAYER'
  | 'TARGETING'
  | 'UNKNOWN_CARD'
  | 'UNKNOWN_SET'
  | 'BASE_REQUIREMENT'
  | 'ABSENCE_REQUIREMENT';

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: ValidationErrorCode; message: string };

const ok = (): ValidationResult => ({ ok: true });
const fail = (code: ValidationErrorCode, message: string): ValidationResult => ({
  ok: false,
  code,
  message,
});

function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function findCardById(variant: GameVariant, cardId: string): Card | undefined {
  for (const set of variant.sets) {
    const card = set.cards.find((c) => c.id === cardId);
    if (card) return card;
  }
  return undefined;
}

function findJokerSet(variant: GameVariant): SetDef | undefined {
  return variant.sets.find((s) => s.cards.some((c) => c.kind === 'joker'));
}

function setForRequest(
  variant: GameVariant,
  request: CardRequest,
): { set: SetDef; specificCard: Card | null } | { error: ValidationResult } {
  if (request.kind === 'joker') {
    const set = findJokerSet(variant);
    if (!set) return { error: fail('UNKNOWN_SET', 'variant has no joker set') };
    return { set, specificCard: null };
  }
  const card = findCardById(variant, request.cardId);
  if (!card) return { error: fail('UNKNOWN_CARD', `unknown card id: ${request.cardId}`) };
  const set = findSetForCard(variant, card.id);
  if (!set) return { error: fail('UNKNOWN_SET', `no set contains card: ${card.id}`) };
  return { set, specificCard: card };
}

export function validateAsk(
  state: GameState,
  variant: GameVariant,
  action: AskAction,
): ValidationResult {
  if (state.phase !== 'playing') {
    return fail('GAME_NOT_PLAYING', `game phase is ${state.phase}, expected playing`);
  }
  if (state.turn.playerId !== action.askerId) {
    return fail('NOT_YOUR_TURN', `it is not ${action.askerId}'s turn`);
  }

  const asker = findPlayer(state, action.askerId);
  const target = findPlayer(state, action.targetId);
  if (!asker) return fail('UNKNOWN_PLAYER', `unknown asker: ${action.askerId}`);
  if (!target) return fail('UNKNOWN_PLAYER', `unknown target: ${action.targetId}`);
  if (asker.team === target.team) {
    return fail('TARGETING', 'target must be on the opposing team');
  }

  const resolved = setForRequest(variant, action.request);
  if ('error' in resolved) return resolved.error;
  const { set, specificCard } = resolved;

  const askerHand = state.hands[asker.id] ?? [];
  const askerHasInSet = askerHand.some((c) => set.cards.some((sc) => sc.id === c.id));
  if (!askerHasInSet) {
    return fail('BASE_REQUIREMENT', `asker holds no card in set ${set.setId}`);
  }

  if (action.request.kind === 'joker') {
    const jokerCount = askerHand.filter((c) => c.kind === 'joker').length;
    if (jokerCount >= 2) {
      return fail('ABSENCE_REQUIREMENT', 'asker already holds both jokers');
    }
    return ok();
  }

  if (!specificCard) {
    return fail('UNKNOWN_CARD', 'standard request resolved to no card');
  }
  if (askerHand.some((c) => c.id === specificCard.id)) {
    return fail('ABSENCE_REQUIREMENT', `asker already holds ${specificCard.id}`);
  }
  return ok();
}
