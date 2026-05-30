import type { AskAction, Card, PlayerId } from '@literature/shared';

export type TransferResult = {
  hands: Record<PlayerId, Card[]>;
  cardTransferred: Card | null;
};

function findCardToTransfer(targetHand: Card[], action: AskAction): Card | null {
  const { request } = action;
  if (request.kind === 'joker') {
    return targetHand.find((c) => c.kind === 'joker') ?? null;
  }
  return targetHand.find((c) => c.id === request.cardId) ?? null;
}

export function applyAskTransfer(
  hands: Record<PlayerId, Card[]>,
  action: AskAction,
): TransferResult {
  const askerHand = hands[action.askerId];
  const targetHand = hands[action.targetId];
  if (!askerHand || !targetHand) {
    throw new Error(
      `applyAskTransfer: missing hand for ${!askerHand ? action.askerId : action.targetId}`,
    );
  }

  const card = findCardToTransfer(targetHand, action);
  if (!card) {
    return { hands, cardTransferred: null };
  }

  const nextHands: Record<PlayerId, Card[]> = {
    ...hands,
    [action.targetId]: targetHand.filter((c) => c.id !== card.id),
    [action.askerId]: [...askerHand, card],
  };
  return { hands: nextHands, cardTransferred: card };
}
