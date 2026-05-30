export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export type CardId = string;

export type StandardCard = {
  kind: 'standard';
  id: CardId;
  suit: Suit;
  rank: Rank;
};

export type JokerCard = {
  kind: 'joker';
  id: CardId;
};

export type Card = StandardCard | JokerCard;

export type CardRequest = { kind: 'standard'; cardId: CardId } | { kind: 'joker' };

export type SetId = string;
