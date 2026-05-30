import type { JSX } from 'react';
import { Routes, Route } from 'react-router-dom';

function Landing(): JSX.Element {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Literature</h1>
        <p className="mt-2 text-slate-400">Real-time multiplayer card game.</p>
      </div>
    </main>
  );
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
    </Routes>
  );
}
