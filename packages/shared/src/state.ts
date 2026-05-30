import type { Card, SetId } from './cards.js';
import type { Player, PlayerId, Team } from './players.js';

export type GamePhase = 'lobby' | 'playing' | 'ended';

export type Score = { A: number; B: number };

export type Turn = {
  playerId: PlayerId;
  actionCount: number;
};

export type ClaimedSet = {
  setId: SetId;
  winningTeam: Team;
};

export type GameState = {
  variant: string;
  phase: GamePhase;
  players: Player[];
  hands: Record<PlayerId, Card[]>;
  turn: Turn;
  score: Score;
  claimedSets: ClaimedSet[];
};

export type ClientPlayerView = {
  id: PlayerId;
  name: string;
  team: Team;
  seatIndex: number;
  handCount: number;
};

export type ClientGameState = {
  variant: string;
  phase: GamePhase;
  you: { id: PlayerId; hand: Card[] };
  players: ClientPlayerView[];
  turn: Turn;
  score: Score;
  claimedSets: ClaimedSet[];
};
