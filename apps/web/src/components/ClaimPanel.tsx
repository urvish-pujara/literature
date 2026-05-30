import { useState } from 'react';
import { submitClaim, useGameStore, useSessionStore, useUiStore } from '@literature/domain';
import {
  CLASSIC,
  EXTENDED,
  type Card,
  type ClientPlayerView,
  type GameVariant,
} from '@literature/shared';
import { CardChip } from './CardChip.js';

export function ClaimPanel() {
  const state = useGameStore((s) => s.state);
  const playerId = useSessionStore((s) => s.playerId);
  const showToast = useUiStore((s) => s.showToast);
  const [setId, setSetId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!state || !playerId) {
    return <Empty>Loading…</Empty>;
  }

  const me = state.players.find((p) => p.id === playerId);
  if (!me) return <Empty>You are not in this game.</Empty>;

  if (state.phase === 'ended') return <Empty>Game over.</Empty>;

  const variant: GameVariant = state.variant === 'extended' ? EXTENDED : CLASSIC;
  const teammates = state.players.filter((p) => p.team === me.team);
  const claimedSetIds = new Set(state.claimedSets.map((c) => c.setId));
  const unclaimedSets = variant.sets.filter((s) => !claimedSetIds.has(s.setId));
  const activeSet = setId ? unclaimedSets.find((s) => s.setId === setId) : null;

  function pickSet(id: string): void {
    setSetId(id);
    setAssignments({});
  }

  function assign(cardId: string, assignee: string): void {
    setAssignments((prev) => ({ ...prev, [cardId]: assignee }));
  }

  function submit(): void {
    if (!activeSet || !playerId) return;
    const complete = activeSet.cards.every((c) => assignments[c.id]);
    if (!complete) {
      showToast({ kind: 'error', message: 'Assign every card before submitting.' });
      return;
    }
    setBusy(true);
    void submitClaim({ claimantId: playerId, setId: activeSet.setId, assignments })
      .then((resp) => {
        if (!resp.ok) {
          showToast({
            kind: 'error',
            message: `${resp.code}${resp.message ? `: ${resp.message}` : ''}`,
          });
          return;
        }
        setSetId(null);
        setAssignments({});
      })
      .finally(() => setBusy(false));
  }

  const complete = activeSet ? activeSet.cards.every((c) => assignments[c.id]) : false;

  return (
    <div className="space-y-5">
      <section>
        <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Set</div>
        <div className="flex flex-wrap gap-2">
          {unclaimedSets.map((s) => (
            <button
              key={s.setId}
              type="button"
              onClick={() => pickSet(s.setId)}
              aria-pressed={s.setId === setId}
              className={`rounded-md px-3 py-1.5 text-xs border transition focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                s.setId === setId
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
            >
              {s.displayName}
            </button>
          ))}
          {unclaimedSets.length === 0 && (
            <span className="text-sm text-slate-400">All sets already claimed.</span>
          )}
        </div>
      </section>

      {activeSet && (
        <>
          <section className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Assign every card
            </div>
            {activeSet.cards.map((c) => (
              <CardAssignmentRow
                key={c.id}
                card={c}
                teammates={teammates}
                currentAssignee={assignments[c.id]}
                onAssign={(assignee) => assign(c.id, assignee)}
              />
            ))}
          </section>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {Object.keys(assignments).length} / {activeSet.cards.length} assigned
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !complete}
              className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 text-sm disabled:opacity-40"
            >
              {busy ? 'Submitting…' : 'Submit claim'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-400 py-6 text-center">{children}</div>;
}

function CardAssignmentRow({
  card,
  teammates,
  currentAssignee,
  onAssign,
}: {
  card: Card;
  teammates: ClientPlayerView[];
  currentAssignee: string | undefined;
  onAssign: (assignee: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-slate-950/40 border border-slate-800 rounded-md p-2">
      <CardChip card={card} size="sm" />
      <div className="flex-1 flex flex-wrap gap-1">
        {teammates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onAssign(t.id)}
            aria-pressed={currentAssignee === t.id}
            className={`rounded-md px-2 py-1 text-[11px] border transition ${
              currentAssignee === t.id
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
