import { useEffect, useRef } from 'react';
import { useFeedStore, useGameStore } from '@literature/domain';
import { play } from '../lib/audio.js';

/**
 * Subscribes to feed events + turn changes and plays cue sounds.
 * Idempotent: dedupes by event id so the same event never plays twice
 * (e.g., on reconnect, when the server replays the recent buffer).
 */
export function useGameSounds(viewerId: string | null): void {
  const entries = useFeedStore((s) => s.entries);
  const turnPlayerId = useGameStore((s) => s.state?.turn.playerId ?? null);
  const phase = useGameStore((s) => s.state?.phase ?? null);

  const seenEventsRef = useRef<Set<string>>(new Set());
  const prevTurnRef = useRef<string | null>(null);
  // Skip the first effect pass — events present at mount are historical replays,
  // not fresh events worth sounding off for.
  const primedRef = useRef(false);

  useEffect(() => {
    if (!primedRef.current) {
      for (const e of entries) seenEventsRef.current.add(e.id);
      primedRef.current = true;
      return;
    }
    for (const e of entries) {
      if (seenEventsRef.current.has(e.id)) continue;
      seenEventsRef.current.add(e.id);
      switch (e.type) {
        case 'dealt':
          play('deal');
          break;
        case 'asked':
          play(e.cardTransferred ? 'card_take' : 'card_miss');
          break;
        case 'claimed':
          play(e.success ? 'claim_win' : 'claim_lose');
          break;
      }
    }
  }, [entries]);

  useEffect(() => {
    if (!turnPlayerId || phase !== 'playing') {
      prevTurnRef.current = turnPlayerId;
      return;
    }
    // Cue only on a true transition INTO the viewer's turn, not on initial mount.
    if (
      prevTurnRef.current !== null &&
      prevTurnRef.current !== turnPlayerId &&
      turnPlayerId === viewerId
    ) {
      play('your_turn');
    }
    prevTurnRef.current = turnPlayerId;
  }, [turnPlayerId, phase, viewerId]);
}
