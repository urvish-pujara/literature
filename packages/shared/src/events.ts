import type { CardId, CardRequest, SetId } from './cards.js';
import type { PlayerId, Team } from './players.js';

export type DealtEvent = {
  type: 'dealt';
};

export type AskedEvent = {
  type: 'asked';
  askerId: PlayerId;
  targetId: PlayerId;
  request: CardRequest;
  cardTransferred: CardId | null;
};

export type ClaimedEvent = {
  type: 'claimed';
  claimantId: PlayerId;
  setId: SetId;
  success: boolean;
  scoringTeam: Team;
  trueDistribution: Record<CardId, PlayerId>;
};

export type GameEvent = DealtEvent | AskedEvent | ClaimedEvent;
