import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getStatus, onStatusChange, type ConnectionStatus } from '@literature/domain';

export function ConnectionBanner() {
  const [status, setStatus] = useState<ConnectionStatus>(getStatus());

  useEffect(() => {
    const unsubscribe = onStatusChange(setStatus);
    return () => {
      unsubscribe();
    };
  }, []);

  const show = status === 'connecting' || status === 'disconnected';
  const message =
    status === 'connecting' ? 'Reconnecting to the server…' : 'Disconnected. Trying to reconnect…';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pt-3"
        >
          <div className="rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200 px-4 py-1.5 text-xs flex items-center gap-2 backdrop-blur shadow-lg">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
