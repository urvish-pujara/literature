import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFeedStore } from '@literature/domain';
import type { ClaimedEvent, ClientPlayerView } from '@literature/shared';
import { CLASSIC, EXTENDED, type GameVariant } from '@literature/shared';
import { CardChip } from './CardChip.js';

type ShownEvent = ClaimedEvent & { id: string; ts: number };

const REVEAL_MS = 5_000;

export function ClaimReveal({
  players,
  variantName,
}: {
  players: ClientPlayerView[];
  variantName: string;
}) {
  const entries = useFeedStore((s) => s.entries);
  const [active, setActive] = useState<ShownEvent | null>(null);
  const [seenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    for (const e of entries) {
      if (e.type !== 'claimed') continue;
      if (seenIds.has(e.id)) continue;
      seenIds.add(e.id);
      setActive(e);
      const handle = setTimeout(() => {
        setActive((curr) => (curr?.id === e.id ? null : curr));
      }, REVEAL_MS);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, [entries, seenIds]);

  const variant: GameVariant = variantName === 'extended' ? EXTENDED : CLASSIC;
  const set = active ? variant.sets.find((s) => s.setId === active.setId) : null;
  const byId = new Map(players.map((p) => [p.id, p.name]));

  return (
    <AnimatePresence>
      {active && set && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -6 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
            className={`rounded-xl border-2 p-5 max-w-md w-full backdrop-blur shadow-2xl ${
              active.success
                ? 'bg-emerald-500/15 border-emerald-400'
                : 'bg-rose-500/15 border-rose-400'
            }`}
          >
            <div className="text-center">
              <div
                className={`text-xs uppercase tracking-widest mb-1 ${
                  active.success ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {active.success ? 'Claim correct' : 'Claim wrong'}
              </div>
              <div className="text-lg font-semibold">{set.displayName}</div>
              <div className="text-sm text-slate-300 mt-1">
                {byId.get(active.claimantId) ?? active.claimantId} claimed · Team{' '}
                <span className="font-semibold">{active.scoringTeam}</span> scores
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {set.cards.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col items-center gap-1 bg-slate-950/50 rounded-md py-2"
                >
                  <CardChip card={c} size="sm" />
                  <span className="text-[10px] text-slate-400 truncate max-w-full px-1">
                    {byId.get(active.trueDistribution[c.id] ?? '') ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
