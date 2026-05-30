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

const TEAM_COLOR: Record<'A' | 'B', { glow: string; ring: string; chip: string }> = {
  A: { glow: 'bg-amber-400/45', ring: 'shadow-[0_0_24px_rgba(251,191,36,0.55)]', chip: 'text-amber-300' },
  B: { glow: 'bg-cyan-400/45', ring: 'shadow-[0_0_24px_rgba(34,211,238,0.55)]', chip: 'text-cyan-300' },
};

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
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
    <div className="relative w-full aspect-square max-w-[640px] mx-auto">
      {/* Outer brass rim */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, #5c3e1e 0%, #2c1c0a 35%, #150a02 70%, #0a0501 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,210,140,0.18)',
        }}
      />
      {/* Inner brass ring */}
      <div
        className="absolute inset-[3.5%] rounded-full border-2 border-amber-700/40"
        style={{
          background:
            'linear-gradient(180deg, rgba(140, 90, 40, 0.25) 0%, rgba(60, 35, 12, 0.6) 100%)',
        }}
      />
      {/* Felt */}
      <div className="absolute inset-[7%] rounded-full table-felt shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]" />
      {/* Felt rim line */}
      <div className="absolute inset-[10%] rounded-full border border-amber-700/15" />
      <div className="absolute inset-[14%] rounded-full border border-dashed border-amber-700/10" />

      {/* Score badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-2xl border border-amber-900/50 bg-slate-950/85 px-5 py-3 text-center backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
          style={{
            background:
              'linear-gradient(180deg, rgba(10,20,25,0.95) 0%, rgba(4,10,13,0.95) 100%)',
          }}
        >
          <div className="text-[10px] tracking-[0.3em] text-slate-500 uppercase">Score</div>
          <div className="mt-1 flex items-center gap-4 text-2xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
            <span className="text-amber-300">A {score.A}</span>
            <span className="text-slate-700">|</span>
            <span className="text-cyan-300">B {score.B}</span>
          </div>
        </div>
      </div>

      {/* Seats */}
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
  const colors = TEAM_COLOR[player.team];

  return (
    <div
      className="absolute"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex flex-col items-center" style={{ width: '110px' }}>
        {/* Active player aura */}
        <div className="relative">
          {isActive && (
            <div
              className={`seat-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full blur-xl ${colors.glow}`}
            />
          )}
          {/* Portrait frame */}
          <div
            className={`relative w-[72px] h-[88px] rounded-md border-2 ${
              isActive ? 'border-amber-400/70' : 'border-amber-900/40'
            } ${isActive ? colors.ring : ''} ${!isOnline ? 'opacity-40' : ''} overflow-hidden`}
            style={{
              background:
                'linear-gradient(160deg, #2a3640 0%, #16222b 50%, #0c161e 100%)',
              boxShadow:
                'inset 0 1px 0 rgba(255,215,150,0.2), inset 0 -8px 12px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="absolute inset-1 rounded-sm flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(180deg, rgba(60,80,90,0.5), rgba(20,30,40,0.5))',
              }}
            >
              <span
                className="text-2xl font-semibold text-slate-200/90"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {isViewer ? 'YOU' : initials(player.name)}
              </span>
            </div>
            {isHost && (
              <span className="absolute top-1 right-1 rounded bg-amber-500/85 text-slate-950 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5">
                Host
              </span>
            )}
          </div>
          {/* Team glow ring beneath */}
          <div
            className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-1.5 rounded-full ${
              player.team === 'A' ? 'bg-amber-400/70' : 'bg-cyan-400/70'
            } blur-[2px]`}
          />
        </div>

        {/* Nameplate */}
        <div
          className={`mt-3 rounded-md px-2.5 py-1.5 backdrop-blur border ${
            isActive
              ? 'border-amber-400/40 bg-amber-500/5'
              : 'border-slate-700/60 bg-slate-950/60'
          } shadow-md`}
        >
          <div className="flex items-center gap-1 justify-center">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
              title={isOnline ? 'Online' : 'Offline'}
            />
            <span className="text-xs font-medium truncate max-w-[80px]">{player.name}</span>
          </div>
          <div className="text-[10px] mt-0.5 text-center">
            <span className={colors.chip}>Team {player.team}</span>
            <span className="text-slate-600 mx-1">·</span>
            <span className="text-slate-400">{player.handCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
