import type { ClientGameState, GameState } from './state.js';
import type { PlayerId } from './players.js';

export function project(state: GameState, viewerId: PlayerId): ClientGameState {
  const viewerHand = state.hands[viewerId] ?? [];
  return {
    variant: state.variant,
    phase: state.phase,
    you: { id: viewerId, hand: viewerHand },
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      seatIndex: p.seatIndex,
      handCount: (state.hands[p.id] ?? []).length,
    })),
    turn: state.turn,
    score: state.score,
    claimedSets: state.claimedSets,
  };
}
