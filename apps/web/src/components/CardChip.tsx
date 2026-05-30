import type { Card } from '@literature/shared';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS = new Set(['hearts', 'diamonds']);

export type CardChipSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<CardChipSize, string> = {
  sm: 'w-8 h-11 text-[10px]',
  md: 'w-12 h-16 text-sm',
  lg: 'w-14 h-20 text-base',
};

export function CardChip({
  card,
  size = 'md',
  disabled,
  selected,
  onClick,
}: {
  card: Card;
  size?: CardChipSize;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const isInteractive = onClick !== undefined;
  const sizeCls = SIZE_CLASSES[size];

  const inner =
    card.kind === 'joker' ? (
      <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-amber-300 border-slate-600">
        <span className="font-semibold tracking-wide">JOKER</span>
        <span className="text-slate-500 mt-0.5 text-[10px]">{card.id.replace('JOKER_', '')}</span>
      </div>
    ) : (
      <div
        className={`flex flex-col items-center justify-center w-full h-full bg-white border-slate-300 ${
          RED_SUITS.has(card.suit) ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        <span className="font-bold leading-none">{card.rank}</span>
        <span className="leading-none mt-0.5">{SUIT_GLYPH[card.suit]}</span>
      </div>
    );

  const base = `${sizeCls} rounded-md border overflow-hidden transition`;
  const state = disabled
    ? 'opacity-30 cursor-not-allowed'
    : selected
      ? 'ring-2 ring-emerald-400 scale-105'
      : isInteractive
        ? 'hover:-translate-y-1 hover:shadow-lg cursor-pointer'
        : '';

  if (isInteractive) {
    return (
      <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${state}`}>
        {inner}
      </button>
    );
  }
  return <div className={`${base} ${state}`}>{inner}</div>;
}
