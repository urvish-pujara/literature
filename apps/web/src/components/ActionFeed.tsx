import { useFeedStore } from '@literature/domain';
import type { ClientPlayerView } from '@literature/shared';

export function ActionFeed({ players }: { players: ClientPlayerView[] }) {
  const entries = useFeedStore((s) => s.entries);
  const byId = new Map(players.map((p) => [p.id, p.name]));

  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none px-4">
      <div className="max-w-2xl mx-auto space-y-1">
        {entries.map((e) => (
          <FeedRow key={e.id} entry={e} byId={byId} />
        ))}
      </div>
    </div>
  );
}

function FeedRow({
  entry,
  byId,
}: {
  entry: ReturnType<typeof useFeedStore.getState>['entries'][number];
  byId: Map<string, string>;
}) {
  const fade = Math.max(0, (entry.expiresAt - Date.now()) / 15_000);
  const opacity = Math.min(1, fade);
  return (
    <div
      className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded px-3 py-1.5 transition"
      style={{ opacity }}
    >
      {describe(entry, byId)}
    </div>
  );
}

function describe(
  entry: ReturnType<typeof useFeedStore.getState>['entries'][number],
  byId: Map<string, string>,
): string {
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
