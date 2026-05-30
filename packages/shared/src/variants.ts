import type { Card, CardId, Rank, SetId, StandardCard, Suit } from './cards.js';

export type SetDef = {
  setId: SetId;
  displayName: string;
  cards: Card[];
};

export type GameVariant = {
  name: string;
  totalCards: number;
  totalSets: number;
  cardsPerPlayer: number;
  sets: SetDef[];
};

const SUIT_LETTER: Record<Suit, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
};

const MINOR_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7'];
const MAJOR_RANKS: Rank[] = ['9', 'T', 'J', 'Q', 'K', 'A'];
const ALL_SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const card = (rank: Rank, suit: Suit): StandardCard => ({
  kind: 'standard',
  id: `${rank}${SUIT_LETTER[suit]}`,
  suit,
  rank,
});

const halfSuit = (suit: Suit, half: 'minor' | 'major'): SetDef => {
  const ranks = half === 'minor' ? MINOR_RANKS : MAJOR_RANKS;
  return {
    setId: `${suit}-${half}`,
    displayName: `${suit.charAt(0).toUpperCase() + suit.slice(1)} ${half === 'minor' ? 'Minor (2-7)' : 'Major (9-A)'}`,
    cards: ranks.map((r) => card(r, suit)),
  };
};

const STANDARD_SETS: SetDef[] = ALL_SUITS.flatMap((suit) => [
  halfSuit(suit, 'minor'),
  halfSuit(suit, 'major'),
]);

const EIGHTS_AND_JOKERS_SET: SetDef = {
  setId: 'eights-and-jokers',
  displayName: '8s and Jokers',
  cards: [
    card('8', 'hearts'),
    card('8', 'diamonds'),
    card('8', 'clubs'),
    card('8', 'spades'),
    { kind: 'joker', id: 'JOKER_1' },
    { kind: 'joker', id: 'JOKER_2' },
  ],
};

export const CLASSIC: GameVariant = {
  name: 'classic',
  totalCards: 48,
  totalSets: 8,
  cardsPerPlayer: 8,
  sets: STANDARD_SETS,
};

export const EXTENDED: GameVariant = {
  name: 'extended',
  totalCards: 54,
  totalSets: 9,
  cardsPerPlayer: 9,
  sets: [...STANDARD_SETS, EIGHTS_AND_JOKERS_SET],
};

export const VARIANTS = {
  classic: CLASSIC,
  extended: EXTENDED,
} as const;

export type VariantName = keyof typeof VARIANTS;

export function getVariant(name: VariantName): GameVariant {
  return VARIANTS[name];
}

export function getDeck(variant: GameVariant): Card[] {
  return variant.sets.flatMap((s) => s.cards);
}

export function findSetForCard(variant: GameVariant, cardId: CardId): SetDef | undefined {
  return variant.sets.find((s) => s.cards.some((c) => c.id === cardId));
}
