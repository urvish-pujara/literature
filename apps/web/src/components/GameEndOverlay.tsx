import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { leaveRoom } from '@literature/domain';

export function GameEndOverlay({
  score,
}: {
  score: { A: number; B: number };
}) {
  const navigate = useNavigate();
  const winner: 'A' | 'B' | 'tie' =
    score.A > score.B ? 'A' : score.B > score.A ? 'B' : 'tie';

  function leave(): void {
    leaveRoom();
    void navigate('/', { replace: true });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-end-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-xl border-2 border-emerald-400/50 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <div className="text-xs uppercase tracking-widest text-emerald-300 mb-2">
          Game over
        </div>
        <h2 id="game-end-title" className="text-3xl font-bold mb-1">
          {winner === 'tie' ? "It's a tie!" : `Team ${winner} wins`}
        </h2>
        <div className="mt-4 flex justify-center gap-6 text-2xl font-semibold">
          <span className={`text-rose-300 ${winner === 'A' ? 'underline decoration-2 underline-offset-4' : ''}`}>
            A {score.A}
          </span>
          <span className="text-slate-600">·</span>
          <span className={`text-sky-300 ${winner === 'B' ? 'underline decoration-2 underline-offset-4' : ''}`}>
            B {score.B}
          </span>
        </div>
        <button
          type="button"
          onClick={leave}
          autoFocus
          className="mt-6 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 text-sm"
        >
          Back to home
        </button>
      </motion.div>
    </div>
  );
}
