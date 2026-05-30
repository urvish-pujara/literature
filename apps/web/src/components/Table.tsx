import type { ClientPlayerView } from '@literature/shared';

type Position = { xPct: number; yPct: number };

function seatPositions(viewerSeatIndex: number): Position[] {
  const positions: Position[] = [];
  for (let i = 0; i < 6; i++) {
    const relative = (i - viewerSeatIndex + 6) % 6;
    const angle = (relative * 60 + 90) * (Math.PI / 180);
    const xPct = 50 + 42 * Math.cos(angle);
    const yPct = 50 + 42 * Math.sin(angle);
    positions[i] = { xPct, yPct };
  }
  return positions;
}

export function Table({
  players,
  viewerId,
  turnPlayerId,
  hostId,
  onlineIds,
  score,
}: {
  players: ClientPlayerView[];
  viewerId: string | null;
  turnPlayerId: string;
  hostId: string | null;
  onlineIds: Set<string>;
  score: { A: number; B: number };
}) {
  const sorted = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const viewer = sorted.find((p) => p.id === viewerId);
  const viewerSeat = viewer?.seatIndex ?? 0;
  const positions = seatPositions(viewerSeat);

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto">
      <div className="absolute inset-[8%] rounded-full bg-emerald-900/50 border border-emerald-800/60 shadow-inner" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="rounded-md bg-slate-950/60 border border-slate-800 px-4 py-2 text-center backdrop-blur">
          <div className="text-xs uppercase text-slate-500 tracking-wide">Score</div>
          <div className="mt-1 flex gap-4 text-lg font-semibold">
            <span className="text-rose-300">A {score.A}</span>
            <span className="text-sky-300">B {score.B}</span>
          </div>
        </div>
      </div>
      {sorted.map((p) => {
        const pos = positions[p.seatIndex];
        if (!pos) return null;
        return (
          <Seat
            key={p.id}
            player={p}
            xPct={pos.xPct}
            yPct={pos.yPct}
            isViewer={p.id === viewerId}
            isActive={p.id === turnPlayerId}
            isHost={p.id === hostId}
            isOnline={onlineIds.has(p.id)}
          />
        );
      })}
    </div>
  );
}

function Seat({
  player,
  xPct,
  yPct,
  isViewer,
  isActive,
  isHost,
  isOnline,
}: {
  player: ClientPlayerView;
  xPct: number;
  yPct: number;
  isViewer: boolean;
  isActive: boolean;
  isHost: boolean;
  isOnline: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        className={`rounded-lg px-3 py-2 text-center min-w-[110px] border transition ${
          isActive
            ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
            : 'bg-slate-900 border-slate-700'
        } ${isViewer ? 'ring-2 ring-emerald-500/40' : ''} ${
          !isOnline ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
            title={isOnline ? 'Online' : 'Offline'}
          />
          <span className="text-sm font-medium truncate">{player.name}</span>
          {isHost && (
            <span className="rounded bg-amber-500/15 text-amber-300 text-[9px] uppercase tracking-wide px-1 py-0.5 border border-amber-500/30">
              Host
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          <span className={player.team === 'A' ? 'text-rose-300' : 'text-sky-300'}>
            Team {player.team}
          </span>
          <span className="text-slate-600 mx-1">·</span>
          <span>{player.handCount} cards</span>
        </div>
      </div>
    </div>
  );
}
