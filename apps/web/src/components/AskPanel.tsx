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

export function AskPanel() {
  const state = useGameStore((s) => s.state);
  const playerId = useSessionStore((s) => s.playerId);
  const showToast = useUiStore((s) => s.showToast);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state || !playerId) {
    return <Empty>Loading…</Empty>;
  }

  const me = state.players.find((p) => p.id === playerId);
  if (!me) return <Empty>You are not in this game.</Empty>;

  const isMyTurn = state.turn.playerId === playerId;
  const ended = state.phase === 'ended';

  if (ended) return <Empty>Game over.</Empty>;
  if (!isMyTurn) {
    const activeName =
      state.players.find((p) => p.id === state.turn.playerId)?.name ?? state.turn.playerId;
    return (
      <Empty>
        Waiting for <span className="text-amber-300 font-medium">{activeName}</span> to play.
      </Empty>
    );
  }

  const variant: GameVariant = state.variant === 'extended' ? EXTENDED : CLASSIC;
  const myHand = state.you.hand;
  const myHandIds = new Set(myHand.map((c) => c.id));
  const myJokerCount = myHand.filter((c) => c.kind === 'joker').length;
  const opponents = state.players.filter((p) => p.team !== me.team);
  const eligibleSets = variant.sets.filter((set) =>
    myHand.some((c) => set.cards.some((sc) => sc.id === c.id)),
  );

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
        setTargetId(null);
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="space-y-5">
      <section>
        <div
          className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Target
        </div>
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
        <div
          className="text-[10px] uppercase tracking-[0.3em] text-slate-500"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Card Sets {targetId ? '' : '· pick target first'}
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
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-slate-400 py-6 text-center">{children}</div>
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
      aria-pressed={selected}
      className={`rounded-md px-3 py-2 text-sm border transition focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
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
      <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500 mb-1.5">
        {displayName}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {standards.map((c) => {
          const owned = myHandIds.has(c.id);
          return (
            <CardChip
              key={c.id}
              card={c}
              size="sm"
              disabled={disabled || !hasTarget || owned}
              onClick={() => onPick({ kind: 'standard', cardId: c.id })}
            />
          );
        })}
        {hasJokerInSet && (
          <button
            type="button"
            disabled={disabled || !hasTarget || myJokerCount >= 2}
            onClick={() => onPick({ kind: 'joker' })}
            className={`w-8 h-11 rounded-md border bg-slate-900 text-amber-300 flex flex-col items-center justify-center transition text-[9px] ${
              disabled || !hasTarget || myJokerCount >= 2
                ? 'opacity-30 cursor-not-allowed border-slate-700'
                : 'hover:-translate-y-1 hover:shadow-lg cursor-pointer border-amber-500/50'
            }`}
          >
            <span className="font-semibold tracking-wide">JKR</span>
            <span className="text-slate-500">any</span>
          </button>
        )}
      </div>
    </div>
  );
}
