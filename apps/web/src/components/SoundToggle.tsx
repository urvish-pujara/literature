import { useState } from 'react';
import { isMuted, setMuted, unlock } from '../lib/audio.js';

export function SoundToggle() {
  const [muted, setLocalMuted] = useState<boolean>(isMuted());

  function toggle(): void {
    const next = !muted;
    setMuted(next);
    setLocalMuted(next);
    if (!next) unlock();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      title={muted ? 'Sound off' : 'Sound on'}
      className="w-7 h-7 rounded-full border border-amber-700/40 text-amber-300/80 hover:text-amber-200 hover:border-amber-500/60 text-xs flex items-center justify-center"
    >
      {muted ? <SpeakerMutedIcon /> : <SpeakerOnIcon />}
    </button>
  );
}

function SpeakerOnIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6v4h2.5L9 13V3L5.5 6H3Z" fill="currentColor" stroke="none" />
      <path d="M11 5.5c.7.7 1 1.6 1 2.5s-.3 1.8-1 2.5" />
      <path d="M12.8 3.7C14 4.9 14.5 6.4 14.5 8s-.5 3.1-1.7 4.3" />
    </svg>
  );
}

function SpeakerMutedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6v4h2.5L9 13V3L5.5 6H3Z" fill="currentColor" stroke="none" />
      <path d="M11 6l3.5 3.5M14.5 6L11 9.5" />
    </svg>
  );
}
