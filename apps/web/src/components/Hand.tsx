import { selectSortedHand, useGameStore, type SortedCard } from '@literature/domain';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

export function Hand() {
  const state = useGameStore();
  const hand = selectSortedHand(state);
  if (hand.length === 0) {
    return <div className="text-center text-sm text-slate-500 py-8">No cards.</div>;
  }
  // split at the eights/jokers boundary so we can visually separate
  const standard = hand.filter((c) => c.group === 'standard');
  const special = hand.filter((c) => c.group === 'eights-jokers');

  return (
    <div className="w-full overflow-x-auto pb-3">
      <div className="flex items-end justify-center gap-1">
        {standard.map((c) => (
          <CardChip key={c.id} card={c} />
        ))}
        {special.length > 0 && (
          <>
            <div className="w-3 self-stretch" />
            {special.map((c) => (
              <CardChip key={c.id} card={c} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function CardChip({ card }: { card: SortedCard }) {
  if (card.kind === 'joker') {
    return (
      <div className="w-12 h-16 rounded-md bg-slate-900 border border-slate-600 flex flex-col items-center justify-center text-amber-300">
        <span className="text-xs font-semibold">JOKER</span>
        <span className="text-xs text-slate-500 mt-0.5">{card.id.replace('JOKER_', '')}</span>
      </div>
    );
  }
  const isRed = RED_SUITS.has(card.suit);
  return (
    <div
      className={`w-12 h-16 rounded-md bg-white text-slate-900 border border-slate-300 flex flex-col items-center justify-center ${
        isRed ? 'text-rose-600' : 'text-slate-900'
      }`}
    >
      <span className="text-base font-bold">{card.rank}</span>
      <span className="text-lg leading-none">{SUIT_GLYPH[card.suit]}</span>
    </div>
  );
}
