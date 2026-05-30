import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  randomizeSeats,
  seat,
  startGame,
  useLobbyStore,
  useSessionStore,
  useUiStore,
} from '@literature/domain';

const SEATS_A = [0, 2, 4];
const SEATS_B = [1, 3, 5];

export function Lobby() {
  const lobby = useLobbyStore((s) => s.lobby);
  const playerId = useSessionStore((s) => s.playerId);
  const token = useSessionStore((s) => s.token);
  const showToast = useUiStore((s) => s.showToast);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      void navigate('/', { replace: true });
    }
  }, [token, navigate]);

  if (!lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Connecting to room…</p>
      </main>
    );
  }

  const isHost = playerId === lobby.hostId;
  const occupants = new Map<number, { id: string; name: string; isHost: boolean }>();
  for (const p of lobby.players)
    occupants.set(p.seatIndex, { id: p.id, name: p.name, isHost: p.id === lobby.hostId });
  const seated = lobby.players.length === 6;
  const allSeatsFilled = [0, 1, 2, 3, 4, 5].every((s) => occupants.has(s));

  function pickSeat(team: 'A' | 'B', seatIndex: number): void {
    setBusy(true);
    void seat(team, seatIndex)
      .then((resp) => {
        if (!resp.ok) showToast({ kind: 'error', message: `seat failed: ${resp.code}` });
      })
      .finally(() => setBusy(false));
  }

  function randomize(): void {
    setBusy(true);
    void randomizeSeats()
      .then((resp) => {
        if (!resp.ok) showToast({ kind: 'error', message: `randomize failed: ${resp.code}` });
      })
      .finally(() => setBusy(false));
  }

  function start(): void {
    setBusy(true);
    void startGame()
      .then((resp) => {
        if (!resp.ok) showToast({ kind: 'error', message: `start failed: ${resp.code}` });
      })
      .finally(() => setBusy(false));
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lobby</h1>
            <p className="text-sm text-slate-400 mt-1">
              Code <span className="font-mono text-emerald-400">{lobby.code}</span> · {lobby.variant}{' '}
              · {lobby.players.length}/6 players · {lobby.status}
            </p>
          </div>
          {isHost && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={randomize}
                disabled={busy || !allSeatsFilled}
                className="rounded-md bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm disabled:opacity-50"
              >
                Randomize
              </button>
              <button
                type="button"
                onClick={start}
                disabled={busy || !seated}
                className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 text-sm disabled:opacity-50"
              >
                Start
              </button>
            </div>
          )}
        </header>

        <section className="grid grid-cols-2 gap-4">
          <TeamColumn
            team="A"
            seats={SEATS_A}
            occupants={occupants}
            myId={playerId}
            busy={busy}
            onPick={pickSeat}
          />
          <TeamColumn
            team="B"
            seats={SEATS_B}
            occupants={occupants}
            myId={playerId}
            busy={busy}
            onPick={pickSeat}
          />
        </section>

        <p className="text-xs text-slate-500">
          Click an empty seat to switch teams. The host can randomize seating and start the game once
          all 6 seats are filled.
        </p>
      </div>
    </main>
  );
}

function TeamColumn({
  team,
  seats,
  occupants,
  myId,
  busy,
  onPick,
}: {
  team: 'A' | 'B';
  seats: number[];
  occupants: Map<number, { id: string; name: string; isHost: boolean }>;
  myId: string | null;
  busy: boolean;
  onPick: (team: 'A' | 'B', seatIndex: number) => void;
}) {
  return (
    <div>
      <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Team {team}</h2>
      <ul className="space-y-2">
        {seats.map((seatIndex) => {
          const occupant = occupants.get(seatIndex);
          const isMe = occupant?.id === myId;
          return (
            <li key={seatIndex}>
              <button
                type="button"
                disabled={busy || (!!occupant && !isMe)}
                onClick={() => onPick(team, seatIndex)}
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  occupant
                    ? isMe
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-slate-900 border-slate-700 cursor-default'
                    : 'bg-slate-900/40 border-dashed border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">
                      {occupant?.name ?? <em className="text-slate-500">Empty</em>}
                    </span>
                    {occupant?.isHost && (
                      <span className="shrink-0 rounded bg-amber-500/15 text-amber-300 text-[10px] uppercase tracking-wide px-1.5 py-0.5 border border-amber-500/30">
                        Host
                      </span>
                    )}
                    {isMe && (
                      <span className="shrink-0 text-[10px] text-emerald-400">(you)</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">Seat {seatIndex}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
