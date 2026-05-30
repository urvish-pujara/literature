import { AnimatePresence, motion } from 'framer-motion';
import { useFeedStore, type FeedEntry } from '@literature/domain';
import type { ClientPlayerView } from '@literature/shared';

export function ActionFeed({ players }: { players: ClientPlayerView[] }) {
  const entries = useFeedStore((s) => s.entries);
  const byId = new Map(players.map((p) => [p.id, p.name]));

  return (
    <div className="pointer-events-none px-4 py-2">
      <div className="max-w-2xl mx-auto space-y-1.5">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.6 } }}
              transition={{ duration: 0.25 }}
              className="text-xs text-slate-300 bg-slate-900/70 border border-slate-800 rounded px-3 py-1.5 backdrop-blur"
            >
              {describe(e, byId)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function describe(entry: FeedEntry, byId: Map<string, string>): string {
  const name = (id: string): string => byId.get(id) ?? id;
  switch (entry.type) {
    case 'dealt':
      return 'Cards dealt.';
    case 'asked': {
      const what = entry.request.kind === 'joker' ? 'a Joker' : entry.request.cardId;
      const result = entry.cardTransferred ? 'had it' : "didn't have it";
      return `${name(entry.askerId)} asked ${name(entry.targetId)} for ${what} — ${result}.`;
    }
    case 'claimed': {
      const verdict = entry.success ? 'CORRECT' : 'WRONG';
      return `${name(entry.claimantId)} claimed ${entry.setId} — ${verdict}. Team ${entry.scoringTeam} scored.`;
    }
    default:
      return '';
  }
}
