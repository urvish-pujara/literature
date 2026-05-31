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
import { ActionPanel } from '../components/ActionPanel.js';
import { ClaimReveal } from '../components/ClaimReveal.js';
import { LiveAnnouncer } from '../components/LiveAnnouncer.js';
import { GameEndOverlay } from '../components/GameEndOverlay.js';
import { HowToPlay } from '../components/HowToPlay.js';

export function Play() {
  const state = useGameStore((s) => s.state);
  const gameStore = useGameStore();
  const playerId = useSessionStore((s) => s.playerId);
  const hostId = useLobbyStore((s) => s.lobby?.hostId ?? null);
  const lobbyPlayers = useLobbyStore((s) => s.lobby?.players);
  const isMyTurn = selectIsMyTurn(gameStore, playerId);
  const setActionTab = useUiStore((s) => s.setActionTab);
  const navigate = useNavigate();
  const prune = useFeedStore((s) => s.prune);
  const [, setTick] = useState(0);
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    const handle = setInterval(() => {
      prune(Date.now());
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(handle);
  }, [prune]);

  useEffect(() => {
    if (!state) void navigate('/lobby');
  }, [state, navigate]);

  // When it becomes your turn, auto-flip the panel to Ask
  useEffect(() => {
    if (isMyTurn) setActionTab('ask');
  }, [isMyTurn, setActionTab]);

  if (!state || !playerId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading game…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 py-3 border-b border-amber-900/30 flex items-center justify-between gap-3 bg-slate-950/40 backdrop-blur">
        <div className="flex items-baseline gap-4">
          <h1
            className="text-base text-amber-300 tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Literature
          </h1>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
            <span className="text-slate-300">{state.variant}</span>
            <span className="mx-2 text-slate-700">·</span>
            Turn #{state.turn.actionCount + 1}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="text-[11px] uppercase tracking-[0.25em]"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {state.phase === 'ended' ? (
              <span className="text-slate-400">Game over</span>
            ) : isMyTurn ? (
              <span className="text-amber-300">Your Turn</span>
            ) : (
              <span className="text-slate-500">Waiting…</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setHowToOpen(true)}
            aria-label="How to play"
            title="How to play"
            className="w-7 h-7 rounded-full border border-amber-700/40 text-amber-300/80 hover:text-amber-200 hover:border-amber-500/60 text-xs font-semibold"
          >
            ?
          </button>
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

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 px-4 py-6 flex items-center justify-center">
            <Table
              players={state.players}
              viewerId={playerId}
              turnPlayerId={state.turn.playerId}
              hostId={hostId}
              onlineIds={new Set((lobbyPlayers ?? []).filter((p) => p.online).map((p) => p.id))}
              score={state.score}
            />
          </div>
          <section
            className="px-4 py-4 border-t border-amber-900/30 backdrop-blur"
            style={{
              background:
                'linear-gradient(180deg, rgba(8,16,20,0.85) 0%, rgba(4,10,13,0.95) 100%)',
            }}
          >
            <h2
              className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2 text-center"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Your Hand
            </h2>
            <Hand />
          </section>
        </section>

        <ActionPanel players={state.players} />
      </div>

      <ClaimReveal players={state.players} variantName={state.variant} />
      <LiveAnnouncer players={state.players} viewerId={playerId} />
      {state.phase === 'ended' && <GameEndOverlay score={state.score} />}
      <HowToPlay open={howToOpen} onClose={() => setHowToOpen(false)} />
    </main>
  );
}
