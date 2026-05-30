import { selectSortedHand, useGameStore } from '@literature/domain';
import { CardChip } from './CardChip.js';

export function Hand() {
  const state = useGameStore();
  const hand = selectSortedHand(state);
  if (hand.length === 0) {
    return <div className="text-center text-sm text-slate-500 py-8">No cards.</div>;
  }
  const standard = hand.filter((c) => c.group === 'standard');
  const special = hand.filter((c) => c.group === 'eights-jokers');

  return (
    <div className="w-full overflow-x-auto pb-3">
      <div className="flex items-end justify-center gap-1.5">
        {standard.map((c) => (
          <CardChip key={c.id} card={c} size="md" />
        ))}
        {special.length > 0 && (
          <>
            <div className="w-3 self-stretch" aria-hidden />
            {special.map((c) => (
              <CardChip key={c.id} card={c} size="md" />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
