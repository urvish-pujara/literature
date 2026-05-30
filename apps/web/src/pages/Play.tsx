import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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

export function Play() {
  const state = useGameStore((s) => s.state);
  const gameStore = useGameStore();
  const playerId = useSessionStore((s) => s.playerId);
  const hostId = useLobbyStore((s) => s.lobby?.hostId ?? null);
  const isMyTurn = selectIsMyTurn(gameStore, playerId);
  const navigate = useNavigate();
  const setAskOpen = useUiStore((s) => s.setAskModalOpen);
  const askOpen = useUiStore((s) => s.askModalOpen);
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
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Variant <span className="text-slate-200">{state.variant}</span>
          <span className="mx-2 text-slate-700">·</span>
          Turn <span className="text-slate-200">#{state.turn.actionCount + 1}</span>
        </div>
        <div className="text-sm">
          {isMyTurn ? (
            <span className="text-amber-300">Your turn</span>
          ) : (
            <span className="text-slate-500">Waiting…</span>
          )}
        </div>
      </header>

      <section className="flex-1 px-4 py-6">
        <Table
          players={state.players}
          viewerId={playerId}
          turnPlayerId={state.turn.playerId}
          hostId={hostId}
          score={state.score}
        />
      </section>

      <ActionFeed players={state.players} />

      <section className="px-4 py-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wide text-slate-500">Your hand</h2>
          <button
            type="button"
            disabled={!isMyTurn || askOpen}
            onClick={() => setAskOpen(true)}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 text-sm disabled:opacity-40"
          >
            Ask for a card
          </button>
        </div>
        <Hand />
      </section>

      <AskModal open={askOpen} onClose={() => setAskOpen(false)} />
    </main>
  );
}
