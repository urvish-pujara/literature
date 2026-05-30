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

export function AskModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
  const opponents = state.players.filter((p) => p.team !== me.team);
  const eligibleSets = variant.sets.filter((set) =>
    myHand.some((c) => set.cards.some((sc) => sc.id === c.id)),
  );

  function pickTarget(id: string): void {
    setTargetId(id);
  }

  function reset(): void {
    setTargetId(null);
    onClose();
  }

  function send(request: CardRequest): void {
    if (!targetId || !playerId) return;
    setBusy(true);
    void askForCard({ askerId: playerId, targetId, request })
      .then((resp) => {
        if (!resp.ok) {
          showToast({ kind: 'error', message: `${resp.code}${resp.message ? `: ${resp.message}` : ''}` });
          return;
        }
        reset();
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-lg bg-slate-900 border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{targetId ? 'Pick a card' : 'Pick a target'}</h3>
          <button
            type="button"
            onClick={reset}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cancel
          </button>
        </div>

        {!targetId ? (
          <ul className="grid grid-cols-2 gap-2">
            {opponents.map((p) => (
              <li key={p.id}>
                <TargetButton player={p} onPick={() => pickTarget(p.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4">
            {eligibleSets.map((set) => (
              <CardPicker
                key={set.setId}
                setId={set.setId}
                displayName={set.displayName}
                cards={set.cards}
                myHandIds={myHandIds}
                myHand={myHand}
                disabled={busy}
                onPick={send}
              />
            ))}
            {eligibleSets.length === 0 && (
              <p className="text-sm text-slate-400">
                You have no cards in any set — wait for play to shift.
              </p>
            )}
            <button
              type="button"
              onClick={() => setTargetId(null)}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ← change target
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TargetButton({
  player,
  onPick,
}: {
  player: ClientPlayerView;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-3 text-left"
    >
      <div className="text-sm font-medium">{player.name}</div>
      <div className="text-xs text-slate-400 mt-0.5">
        Team {player.team} · {player.handCount} cards
      </div>
    </button>
  );
}

function CardPicker({
  setId,
  displayName,
  cards,
  myHandIds,
  myHand,
  disabled,
  onPick,
}: {
  setId: string;
  displayName: string;
  cards: Card[];
  myHandIds: Set<string>;
  myHand: Card[];
  disabled: boolean;
  onPick: (request: CardRequest) => void;
}) {
  const hasJoker = cards.some((c) => c.kind === 'joker');
  const myJokerCount = myHand.filter((c) => c.kind === 'joker').length;

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{displayName}</div>
      <div className="flex flex-wrap gap-2">
        {hasJoker ? (
          <>
            {cards
              .filter((c) => c.kind === 'standard')
              .map((c) => (
                <CardButton
                  key={c.id}
                  label={c.id}
                  disabled={disabled || myHandIds.has(c.id)}
                  onClick={() => onPick({ kind: 'standard', cardId: c.id })}
                />
              ))}
            <CardButton
              label="Joker"
              disabled={disabled || myJokerCount >= 2}
              onClick={() => onPick({ kind: 'joker' })}
              isJoker
            />
          </>
        ) : (
          cards.map((c) => (
            <CardButton
              key={c.id}
              label={c.kind === 'standard' ? c.id : c.id}
              disabled={disabled || myHandIds.has(c.id)}
              onClick={() =>
                onPick(
                  c.kind === 'joker'
                    ? { kind: 'joker' }
                    : { kind: 'standard', cardId: c.id },
                )
              }
            />
          ))
        )}
      </div>
      {/* setId kept for potential debugging key, not rendered */}
      <span className="hidden">{setId}</span>
    </div>
  );
}

function CardButton({
  label,
  disabled,
  onClick,
  isJoker,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  isJoker?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm border ${
        disabled
          ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
          : isJoker
          ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/50 text-amber-200'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
