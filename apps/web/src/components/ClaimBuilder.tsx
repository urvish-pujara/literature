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

export function ClaimBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const playerId = useSessionStore((s) => s.playerId);
  const showToast = useUiStore((s) => s.showToast);
  const [setId, setSetId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!open || !state || !playerId) return null;

  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;
  const variant: GameVariant = state.variant === 'extended' ? EXTENDED : CLASSIC;
  const teammates = state.players.filter((p) => p.team === me.team);

  const claimedSetIds = new Set(state.claimedSets.map((c) => c.setId));
  const unclaimedSets = variant.sets.filter((s) => !claimedSetIds.has(s.setId));
  const activeSet = setId ? unclaimedSets.find((s) => s.setId === setId) : null;

  function close(): void {
    setSetId(null);
    setAssignments({});
    onClose();
  }

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
        close();
      })
      .finally(() => setBusy(false));
  }

  const complete = activeSet ? activeSet.cards.every((c) => assignments[c.id]) : false;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-slate-900 border border-slate-700 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Claim a set</h3>
          <button
            type="button"
            onClick={close}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cancel
          </button>
        </div>

        <section className="mb-5">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Set</div>
          <div className="flex flex-wrap gap-2">
            {unclaimedSets.map((s) => (
              <button
                key={s.setId}
                type="button"
                onClick={() => pickSet(s.setId)}
                className={`rounded-md px-3 py-2 text-sm border transition ${
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
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Assign every card to a teammate
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

            <div className="mt-5 flex items-center justify-between gap-3">
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
    </div>
  );
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
    <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 rounded-md p-2">
      <CardChip card={card} size="md" />
      <div className="flex-1 flex flex-wrap gap-1.5">
        {teammates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onAssign(t.id)}
            className={`rounded-md px-2.5 py-1.5 text-xs border transition ${
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
