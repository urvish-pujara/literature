import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  connectSocket,
  createRoom,
  joinRoom,
  useSessionStore,
  useUiStore,
} from '@literature/domain';

type Mode = 'pick' | 'create' | 'join';

const SOCKET_URL = '/';

export function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('pick');

  if (mode === 'pick') {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-8">
          <div>
            <h1 className="text-5xl font-bold">Literature</h1>
            <p className="mt-3 text-slate-400">3 vs 3. Six players. One deck.</p>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMode('create')}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3"
            >
              Create a room
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-3"
            >
              Join with code
            </button>
          </div>
        </div>
      </main>
    );
  }

  const goLobby = (): void => {
    void navigate('/lobby');
  };

  if (mode === 'create') {
    return <CreateRoomForm onCancel={() => setMode('pick')} onCreated={goLobby} />;
  }

  return <JoinRoomForm onCancel={() => setMode('pick')} onJoined={goLobby} />;
}

function CreateRoomForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [variant, setVariant] = useState<'classic' | 'extended'>('extended');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const setSession = useSessionStore((s) => s.set);
  const showToast = useUiStore((s) => s.showToast);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    void (async () => {
      try {
        const result = await createRoom(variant);
        setSession({
          token: result.token,
          playerId: result.playerId,
          roomId: result.roomId,
          displayName: name || 'Host',
        });
        connectSocket(SOCKET_URL, result.token);
        onCreated();
      } catch (err) {
        showToast({
          kind: 'error',
          message: err instanceof Error ? err.message : 'create failed',
        });
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <h2 className="text-2xl font-bold">Create a room</h2>
        <label className="block">
          <span className="text-sm text-slate-400">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2"
            placeholder="Host"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm text-slate-400">Variant</legend>
          {(['classic', 'extended'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="variant"
                value={v}
                checked={variant === v}
                onChange={() => setVariant(v)}
              />
              <span className="capitalize">{v}</span>
              <span className="text-xs text-slate-500">
                {v === 'classic' ? '48 cards · 8 sets · 8/player' : '54 cards · 9 sets · 9/player'}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-3"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </main>
  );
}

function JoinRoomForm({ onCancel, onJoined }: { onCancel: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const setSession = useSessionStore((s) => s.set);
  const showToast = useUiStore((s) => s.showToast);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6 || !name.trim()) {
      showToast({ kind: 'error', message: 'enter a 6-digit code and a display name' });
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const result = await joinRoom(code, name.trim());
        setSession({
          token: result.token,
          playerId: result.playerId,
          roomId: result.roomId,
          displayName: name.trim(),
        });
        connectSocket(SOCKET_URL, result.token);
        onJoined();
      } catch (err) {
        showToast({
          kind: 'error',
          message: err instanceof Error ? err.message : 'join failed',
        });
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5">
        <h2 className="text-2xl font-bold">Join a room</h2>
        <label className="block">
          <span className="text-sm text-slate-400">Room code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-2xl font-mono tracking-widest text-center"
            placeholder="000000"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2"
            placeholder="Alice"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 py-3"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 disabled:opacity-50"
          >
            {busy ? 'Joining…' : 'Join'}
          </button>
        </div>
      </form>
    </main>
  );
}
