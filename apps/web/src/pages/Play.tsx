import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  leaveRoom,
  selectIsMyTurn,
  useFeedStore,
  useGameStore,
  useLobbyStore,
  useSessionStore,
  useUiStore,
} from '@literature/domain';
import { Table } from '../components/Table.js';
import { Hand } from '../components/Hand.js';
import { AskModal } from '../components/AskModal.js';
import { ActionFeed } from '../components/ActionFeed.js';
import { ClaimBuilder } from '../components/ClaimBuilder.js';
import { ClaimReveal } from '../components/ClaimReveal.js';
import { LiveAnnouncer } from '../components/LiveAnnouncer.js';
import { GameEndOverlay } from '../components/GameEndOverlay.js';

export function Play() {
  const state = useGameStore((s) => s.state);
  const gameStore = useGameStore();
  const playerId = useSessionStore((s) => s.playerId);
  const hostId = useLobbyStore((s) => s.lobby?.hostId ?? null);
  const lobbyPlayers = useLobbyStore((s) => s.lobby?.players);
  const isMyTurn = selectIsMyTurn(gameStore, playerId);
  const navigate = useNavigate();
  const setAskOpen = useUiStore((s) => s.setAskModalOpen);
  const askOpen = useUiStore((s) => s.askModalOpen);
  const setClaimOpen = useUiStore((s) => s.setClaimBuilderOpen);
  const claimOpen = useUiStore((s) => s.claimBuilderOpen);
  const prune = useFeedStore((s) => s.prune);
  const [, setTick] = useState(0);

  // pulse so feed timers re-evaluate
  useEffect(() => {
    const handle = setInterval(() => {
      prune(Date.now());
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(handle);
  }, [prune]);

  useEffect(() => {
    if (!state) {
      void navigate('/lobby');
    }
  }, [state, navigate]);

  if (!state || !playerId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading game…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          Variant <span className="text-slate-200">{state.variant}</span>
          <span className="mx-2 text-slate-700">·</span>
          Turn <span className="text-slate-200">#{state.turn.actionCount + 1}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            {state.phase === 'ended' ? (
              <span className="text-slate-400">Game over</span>
            ) : isMyTurn ? (
              <span className="text-amber-300">Your turn</span>
            ) : (
              <span className="text-slate-500">Waiting…</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              leaveRoom();
              void navigate('/', { replace: true });
            }}
            className="rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-200 px-3 py-1 text-xs"
          >
            Leave
          </button>
        </div>
      </header>

      <section className="flex-1 px-4 py-6">
        <Table
          players={state.players}
          viewerId={playerId}
          turnPlayerId={state.turn.playerId}
          hostId={hostId}
          onlineIds={new Set((lobbyPlayers ?? []).filter((p) => p.online).map((p) => p.id))}
          score={state.score}
        />
      </section>

      <ActionFeed players={state.players} />

      <section className="px-4 py-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Your hand</h2>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={claimOpen || state.phase !== 'playing'}
              onClick={() => setClaimOpen(true)}
              className="rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold px-4 py-2 text-sm disabled:opacity-40"
            >
              Claim a set
            </button>
            <button
              type="button"
              disabled={!isMyTurn || askOpen || state.phase !== 'playing'}
              onClick={() => setAskOpen(true)}
              className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 text-sm disabled:opacity-40"
            >
              Ask for a card
            </button>
          </div>
        </div>
        <Hand />
      </section>

      <AskModal open={askOpen} onClose={() => setAskOpen(false)} />
      <ClaimBuilder open={claimOpen} onClose={() => setClaimOpen(false)} />
      <ClaimReveal players={state.players} variantName={state.variant} />
      <LiveAnnouncer players={state.players} viewerId={playerId} />
      {state.phase === 'ended' && <GameEndOverlay score={state.score} />}
    </main>
  );
}
