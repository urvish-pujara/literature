import type { Card, GameVariant, Player, PlayerId } from '@literature/shared';
import { getDeck } from '@literature/shared';
import type { RNG } from './rng.js';

export function shuffle<T>(items: readonly T[], rng: RNG): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) {
      throw new Error('shuffle: unexpected undefined slot');
    }
    out[i] = b;
    out[j] = a;
  }
  return out;
}

export function deal(
  variant: GameVariant,
  players: readonly Player[],
  rng: RNG,
): Record<PlayerId, Card[]> {
  if (players.length !== 6) {
    throw new Error(`deal: expected 6 players, got ${players.length}`);
  }
  if (variant.totalCards !== players.length * variant.cardsPerPlayer) {
    throw new Error(
      `deal: variant totalCards (${variant.totalCards}) does not match ${players.length} × ${variant.cardsPerPlayer}`,
    );
  }

  const deck = shuffle(getDeck(variant), rng);
  const hands: Record<PlayerId, Card[]> = {};
  for (const p of players) {
    hands[p.id] = [];
  }

  for (let i = 0; i < deck.length; i++) {
    const playerIndex = i % players.length;
    const player = players[playerIndex];
    const card = deck[i];
    if (!player || !card) {
      throw new Error('deal: unexpected undefined slot');
    }
    hands[player.id]!.push(card);
  }

  return hands;
}
