import { useLobbyStore, useSessionStore } from '@literature/domain';

export function Lobby() {
  const lobby = useLobbyStore((s) => s.lobby);
  const playerId = useSessionStore((s) => s.playerId);

  if (!lobby) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Connecting to room…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <header>
          <h1 className="text-3xl font-bold">Lobby</h1>
          <p className="text-slate-400 mt-1">
            Code: <span className="font-mono text-emerald-400">{lobby.code}</span> · Variant: {lobby.variant} ·
            Status: {lobby.status}
          </p>
        </header>
        <section>
          <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Players</h2>
          <ul className="space-y-1">
            {lobby.players.map((p) => (
              <li
                key={p.id}
                className="rounded-md bg-slate-900 border border-slate-800 px-3 py-2 flex items-center justify-between"
              >
                <span>
                  {p.name}
                  {p.id === playerId && <span className="ml-2 text-xs text-emerald-400">(you)</span>}
                  {p.id === lobby.hostId && (
                    <span className="ml-2 text-xs text-amber-400">(host)</span>
                  )}
                </span>
                <span className="text-xs text-slate-500">
                  Seat {p.seatIndex} · Team {p.team}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            {lobby.players.length}/6 players. Seating/start controls coming in the next phase.
          </p>
        </section>
      </div>
    </main>
  );
}
