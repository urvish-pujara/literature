import { Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing.js';
import { Lobby } from './pages/Lobby.js';
import { ToastSurface } from './components/ToastSurface.js';

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastSurface />
    </>
  );
}
