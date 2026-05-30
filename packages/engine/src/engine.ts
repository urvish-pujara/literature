import type {
  AskAction,
  AskedEvent,
  ClaimAction,
  ClaimedEvent,
  DealtEvent,
  GameAction,
  GameEvent,
  GameState,
  GameVariant,
  Player,
} from '@literature/shared';
import { resolveClaim, type ClaimErrorCode } from './claim.js';
import { deal } from './dealer.js';
import type { RNG } from './rng.js';
import { applyAskTransfer } from './transfer.js';
import { nextTurnAfterAsk } from './turn.js';
import { validateAsk, type ValidationErrorCode } from './validator.js';

export type ApplyErrorCode = ValidationErrorCode | ClaimErrorCode;

export type ApplyResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; code: ApplyErrorCode; message: string };

export function startGame(
  variant: GameVariant,
  players: readonly Player[],
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  const hands = deal(variant, players, rng);
  const firstPlayer = [...players].sort((a, b) => a.seatIndex - b.seatIndex)[0];
  if (!firstPlayer) throw new Error('startGame: no players');
  const state: GameState = {
    variant: variant.name,
    phase: 'playing',
    players: [...players],
    hands,
    turn: { playerId: firstPlayer.id, actionCount: 0 },
    score: { A: 0, B: 0 },
    claimedSets: [],
  };
  const dealt: DealtEvent = { type: 'dealt' };
  return { state, events: [dealt] };
}

function applyAsk(state: GameState, variant: GameVariant, action: AskAction): ApplyResult {
  const validation = validateAsk(state, variant, action);
  if (!validation.ok) {
    return { ok: false, code: validation.code, message: validation.message };
  }

  const { hands: nextHands, cardTransferred } = applyAskTransfer(state.hands, action);
  const success = cardTransferred !== null;
  const nextTurn = nextTurnAfterAsk(
    state.players,
    nextHands,
    state.turn,
    action,
    success,
  );

  const event: AskedEvent = {
    type: 'asked',
    askerId: action.askerId,
    targetId: action.targetId,
    request: action.request,
    cardTransferred: cardTransferred?.id ?? null,
  };

  return {
    ok: true,
    state: { ...state, hands: nextHands, turn: nextTurn },
    events: [event],
  };
}

function applyClaim(state: GameState, variant: GameVariant, action: ClaimAction): ApplyResult {
  const result = resolveClaim(state, variant, action);
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }
  const claimedEvent: ClaimedEvent = result.event;
  return { ok: true, state: result.state, events: [claimedEvent] };
}

export function applyAction(
  state: GameState,
  variant: GameVariant,
  action: GameAction,
): ApplyResult {
  switch (action.type) {
    case 'ask':
      return applyAsk(state, variant, action);
    case 'claim':
      return applyClaim(state, variant, action);
  }
}
