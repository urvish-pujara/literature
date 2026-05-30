import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useLobbyStore } from '@literature/domain';
import { Landing } from './pages/Landing.js';
import { Lobby } from './pages/Lobby.js';
import { Play } from './pages/Play.js';
import { ToastSurface } from './components/ToastSurface.js';

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

export function App() {
  return (
    <>
      <LobbyStatusRouter />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/play" element={<Play />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastSurface />
    </>
  );
}
