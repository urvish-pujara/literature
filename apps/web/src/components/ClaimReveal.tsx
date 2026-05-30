import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFeedStore } from '@literature/domain';
import type { ClaimedEvent, ClientPlayerView } from '@literature/shared';
import { CLASSIC, EXTENDED, type GameVariant } from '@literature/shared';
import { CardChip } from './CardChip.js';

type ShownEvent = ClaimedEvent & { id: string; ts: number };

const REVEAL_MS = 6_000;

export function ClaimReveal({
  players,
  variantName,
}: {
  players: ClientPlayerView[];
  variantName: string;
}) {
  const entries = useFeedStore((s) => s.entries);
  const [active, setActive] = useState<ShownEvent | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dismiss(): void {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setActive(null);
  }

  useEffect(() => {
    for (const e of entries) {
      if (e.type !== 'claimed') continue;
      if (seenIdsRef.current.has(e.id)) continue;
      seenIdsRef.current.add(e.id);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setActive(e);
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setActive((curr) => (curr?.id === e.id ? null : curr));
      }, REVEAL_MS);
      break;
    }
  }, [entries]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

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
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -6 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-xl border-2 p-5 max-w-md w-full shadow-2xl ${
              active.success
                ? 'bg-emerald-500/15 border-emerald-400'
                : 'bg-rose-500/15 border-rose-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 text-center">
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
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 text-slate-400 hover:text-slate-200 text-xl leading-none px-2 -mr-1 -mt-1"
              >
                ×
              </button>
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
            <div className="mt-3 text-center text-[10px] text-slate-500">
              Click anywhere to dismiss · auto-closes in 6s
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
