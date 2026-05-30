import { useState } from 'react';
import { askForCard, useGameStore, useSessionStore, useUiStore } from '@literature/domain';
import {
  CLASSIC,
  EXTENDED,
  type Card,
  type CardRequest,
  type ClientPlayerView,
  type GameVariant,
} from '@literature/shared';
import { CardChip } from './CardChip.js';

export function AskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const playerId = useSessionStore((s) => s.playerId);
  const showToast = useUiStore((s) => s.showToast);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open || !state || !playerId) return null;

  const me = state.players.find((p) => p.id === playerId);
  if (!me) return null;
  const variant: GameVariant = state.variant === 'extended' ? EXTENDED : CLASSIC;
  const myHand = state.you.hand;
  const myHandIds = new Set(myHand.map((c) => c.id));
  const myJokerCount = myHand.filter((c) => c.kind === 'joker').length;
  const opponents = state.players.filter((p) => p.team !== me.team);
  const eligibleSets = variant.sets.filter((set) =>
    myHand.some((c) => set.cards.some((sc) => sc.id === c.id)),
  );

  function close(): void {
    setTargetId(null);
    onClose();
  }

  function send(request: CardRequest): void {
    if (!targetId) {
      showToast({ kind: 'error', message: 'Pick a target first.' });
      return;
    }
    if (!playerId) return;
    setBusy(true);
    void askForCard({ askerId: playerId, targetId, request })
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-slate-900 border border-slate-700 p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ask for a card</h3>
          <button
            type="button"
            onClick={close}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cancel
          </button>
        </div>

        <section className="mb-5">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Target</div>
          <div className="flex flex-wrap gap-2">
            {opponents.map((p) => (
              <TargetChip
                key={p.id}
                player={p}
                selected={p.id === targetId}
                onPick={() => setTargetId(p.id)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Card {targetId ? '' : '(pick a target first)'}
          </div>
          {eligibleSets.length === 0 ? (
            <p className="text-sm text-slate-400">
              You have no cards in any set — wait for play to shift.
            </p>
          ) : (
            eligibleSets.map((set) => (
              <SetRow
                key={set.setId}
                displayName={set.displayName}
                cards={set.cards}
                myHandIds={myHandIds}
                myJokerCount={myJokerCount}
                hasTarget={!!targetId}
                disabled={busy}
                onPick={send}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function TargetChip({
  player,
  selected,
  onPick,
}: {
  player: ClientPlayerView;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`rounded-md px-3 py-2 text-sm border transition ${
        selected
          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
      }`}
    >
      <div className="font-medium">{player.name}</div>
      <div className="text-xs text-slate-400 mt-0.5">
        Team {player.team} · {player.handCount} cards
      </div>
    </button>
  );
}

function SetRow({
  displayName,
  cards,
  myHandIds,
  myJokerCount,
  hasTarget,
  disabled,
  onPick,
}: {
  displayName: string;
  cards: Card[];
  myHandIds: Set<string>;
  myJokerCount: number;
  hasTarget: boolean;
  disabled: boolean;
  onPick: (request: CardRequest) => void;
}) {
  const hasJokerInSet = cards.some((c) => c.kind === 'joker');
  const standards = cards.filter((c) => c.kind === 'standard');

  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">{displayName}</div>
      <div className="flex flex-wrap gap-2">
        {standards.map((c) => {
          const owned = myHandIds.has(c.id);
          return (
            <CardChip
              key={c.id}
              card={c}
              size="md"
              disabled={disabled || !hasTarget || owned}
              onClick={() => onPick({ kind: 'standard', cardId: c.id })}
            />
          );
        })}
        {hasJokerInSet && (
          <JokerAskChip
            disabled={disabled || !hasTarget || myJokerCount >= 2}
            onClick={() => onPick({ kind: 'joker' })}
          />
        )}
      </div>
    </div>
  );
}

function JokerAskChip({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-12 h-16 rounded-md border bg-slate-900 text-amber-300 flex flex-col items-center justify-center transition ${
        disabled
          ? 'opacity-30 cursor-not-allowed border-slate-700'
          : 'hover:-translate-y-1 hover:shadow-lg cursor-pointer border-amber-500/50'
      }`}
    >
      <span className="text-[10px] font-semibold tracking-wide">JOKER</span>
      <span className="text-[10px] text-slate-500 mt-0.5">(any)</span>
    </button>
  );
}
