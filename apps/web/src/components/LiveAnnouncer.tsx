import { useEffect, useMemo, useState } from 'react';
import { useFeedStore, useGameStore } from '@literature/domain';
import type { ClientPlayerView } from '@literature/shared';

export function LiveAnnouncer({
  players,
  viewerId,
}: {
  players: ClientPlayerView[];
  viewerId: string | null;
}) {
  const turnPlayerId = useGameStore((s) => s.state?.turn.playerId ?? null);
  const entries = useFeedStore((s) => s.entries);
  const [message, setMessage] = useState<string>('');

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.id, p.name);
    return m;
  }, [players]);

  useEffect(() => {
    if (!turnPlayerId) return;
    const name = turnPlayerId === viewerId ? 'Your' : `${nameById.get(turnPlayerId) ?? 'Unknown'}'s`;
    setMessage(`${name} turn.`);
  }, [turnPlayerId, viewerId, nameById]);

  useEffect(() => {
    const last = entries[entries.length - 1];
    if (!last) return;
    if (last.type === 'claimed') {
      setMessage(`Claim ${last.success ? 'correct' : 'wrong'}. Team ${last.scoringTeam} scored.`);
    }
  }, [entries]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
