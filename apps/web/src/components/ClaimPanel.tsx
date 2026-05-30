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
        <div
          className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Set to Claim
        </div>
        <div className="flex flex-wrap gap-2">
          {unclaimedSets.map((s) => (
            <button
              key={s.setId}
              type="button"
              onClick={() => pickSet(s.setId)}
              aria-pressed={s.setId === setId}
              className={`rounded-md px-3 py-1.5 text-xs border transition focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                s.setId === setId
                  ? 'bg-cyan-500/15 border-cyan-400/70 text-cyan-100'
                  : 'bg-slate-800/60 hover:bg-slate-700/70 border-slate-700'
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
            <div
              className="text-[10px] uppercase tracking-[0.3em] text-slate-500"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Assign Cards
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

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {Object.keys(assignments).length} / {activeSet.cards.length} assigned
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !complete}
              className="rounded-md font-semibold px-5 py-2.5 text-sm text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 focus:ring-amber-300"
              style={{
                background: 'linear-gradient(180deg, #f6c45a 0%, #c98a2a 100%)',
                boxShadow:
                  '0 4px 14px rgba(201,138,42,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
                fontFamily: 'Cinzel, serif',
                letterSpacing: '0.05em',
              }}
            >
              {busy ? 'Submitting…' : 'Submit Claim'}
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
