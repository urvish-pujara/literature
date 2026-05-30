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
  lg: 'w-16 h-24 text-lg',
};

const PARCHMENT_STYLE: React.CSSProperties = {
  background: 'linear-gradient(155deg, #fdf6e3 0%, #f1e6c8 60%, #e6d8ad 100%)',
  boxShadow:
    '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -2px 6px rgba(120,90,40,0.18)',
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
      <div
        className="flex flex-col items-center justify-center w-full h-full text-amber-300"
        style={{
          background: 'linear-gradient(160deg, #1a1408 0%, #0c0904 100%)',
          border: '1px solid #5c3e1e',
          boxShadow: 'inset 0 1px 0 rgba(255,210,140,0.2)',
        }}
      >
        <span
          className="font-bold tracking-wide leading-none"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          JKR
        </span>
        <span className="text-[8px] text-amber-200/60 mt-0.5 leading-none">
          {card.id.replace('JOKER_', '#')}
        </span>
      </div>
    ) : (
      <div
        className={`flex flex-col items-center justify-center w-full h-full ${
          RED_SUITS.has(card.suit) ? 'text-rose-700' : 'text-slate-900'
        }`}
        style={PARCHMENT_STYLE}
      >
        <span className="font-bold leading-none" style={{ fontFamily: 'Cinzel, serif' }}>
          {card.rank}
        </span>
        <span className="leading-none mt-0.5">{SUIT_GLYPH[card.suit]}</span>
      </div>
    );

  const base = `${sizeCls} rounded-md overflow-hidden transition relative`;
  const state = disabled
    ? 'opacity-30 cursor-not-allowed'
    : selected
      ? 'ring-2 ring-cyan-400 -translate-y-1 shadow-[0_0_16px_rgba(34,211,238,0.5)]'
      : isInteractive
        ? 'hover:-translate-y-1 hover:shadow-[0_6px_18px_rgba(0,0,0,0.55)] cursor-pointer'
        : 'shadow-[0_2px_8px_rgba(0,0,0,0.4)]';

  if (isInteractive) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`${base} ${state} focus:outline-none focus:ring-2 focus:ring-cyan-400`}
      >
        {inner}
      </button>
    );
  }
  return <div className={`${base} ${state}`}>{inner}</div>;
}
