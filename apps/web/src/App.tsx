import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { connectSocket, getStatus, useLobbyStore, useSessionStore } from '@literature/domain';
import { Landing } from './pages/Landing.js';
import { Lobby } from './pages/Lobby.js';
import { Play } from './pages/Play.js';
import { ToastSurface } from './components/ToastSurface.js';
import { ConnectionBanner } from './components/ConnectionBanner.js';

const SOCKET_URL = '/';

function LobbyStatusRouter() {
  const status = useLobbyStore((s) => s.lobby?.status);
  const navigate = useNavigate();
  useEffect(() => {
    if (status === 'playing') {
      void navigate('/play', { replace: true });
    } else if (status === 'lobby') {
      void navigate('/lobby', { replace: true });
    }
  }, [status, navigate]);
  return null;
}

function SessionBootstrap() {
  const token = useSessionStore((s) => s.token);
  const connected = useRef(false);
  useEffect(() => {
    if (!token || connected.current) return;
    if (getStatus() === 'connected' || getStatus() === 'connecting') return;
    connectSocket(SOCKET_URL, token);
    connected.current = true;
  }, [token]);
  return null;
}

export function App() {
  return (
    <>
      <SessionBootstrap />
      <LobbyStatusRouter />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/play" element={<Play />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ConnectionBanner />
      <ToastSurface />
    </>
  );
}
