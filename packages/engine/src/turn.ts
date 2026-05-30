import type { AskAction, Card, Player, PlayerId, Turn } from '@literature/shared';

function handSize(hands: Record<PlayerId, Card[]>, id: PlayerId): number {
  return hands[id]?.length ?? 0;
}

function findNextTeammateWithCards(
  players: readonly Player[],
  hands: Record<PlayerId, Card[]>,
  fromId: PlayerId,
): PlayerId | null {
  const from = players.find((p) => p.id === fromId);
  if (!from) return null;
  const teammates = players
    .filter((p) => p.team === from.team)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const fromIdx = teammates.findIndex((p) => p.id === fromId);
  if (fromIdx < 0) return null;
  for (let i = 1; i <= teammates.length; i++) {
    const candidate = teammates[(fromIdx + i) % teammates.length];
    if (candidate && handSize(hands, candidate.id) > 0) {
      return candidate.id;
    }
  }
  return null;
}

export function resolveActivePlayer(
  players: readonly Player[],
  hands: Record<PlayerId, Card[]>,
  candidateId: PlayerId,
): PlayerId {
  if (handSize(hands, candidateId) > 0) return candidateId;
  return findNextTeammateWithCards(players, hands, candidateId) ?? candidateId;
}

export function nextTurnAfterAsk(
  players: readonly Player[],
  postTransferHands: Record<PlayerId, Card[]>,
  currentTurn: Turn,
  action: AskAction,
  success: boolean,
): Turn {
  const candidate = success ? action.askerId : action.targetId;
  const resolved = resolveActivePlayer(players, postTransferHands, candidate);
  return { playerId: resolved, actionCount: currentTurn.actionCount + 1 };
}
