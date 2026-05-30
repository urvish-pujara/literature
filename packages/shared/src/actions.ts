import type { CardRequest, SetId } from './cards.js';
import type { PlayerId } from './players.js';

export type AskAction = {
  type: 'ask';
  askerId: PlayerId;
  targetId: PlayerId;
  request: CardRequest;
};

export type ClaimAction = {
  type: 'claim';
  claimantId: PlayerId;
  setId: SetId;
  assignments: Record<string, PlayerId>;
};

export type GameAction = AskAction | ClaimAction;
