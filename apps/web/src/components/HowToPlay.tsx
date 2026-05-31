import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEscapeToClose } from '../hooks/useEscapeToClose.js';

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEscapeToClose(open, onClose);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-to-play-title"
        >
          <motion.div
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-xl border-2 border-amber-900/60 bg-slate-900 shadow-2xl my-8"
            style={{
              background:
                'linear-gradient(180deg, rgba(14,24,30,0.98) 0%, rgba(8,16,22,0.98) 100%)',
            }}
          >
            <header className="flex items-center justify-between px-6 py-4 border-b border-amber-900/40">
              <h2
                id="how-to-play-title"
                className="text-lg tracking-[0.3em] uppercase text-amber-300"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                How to Play
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none px-2"
              >
                ×
              </button>
            </header>

            <div className="px-6 py-5 space-y-6 text-sm text-slate-300 leading-relaxed">
              <Section title="Goal">
                Two teams of three. Win more <em>sets</em> than the other team before all sets are
                claimed. A set is six cards (a half-suit: 2–7 or 9–A of one suit; in Extended, the
                four 8s plus two Jokers form a ninth set).
              </Section>

              <Section title="On your turn — ask">
                Pick an opponent and ask for one specific card. The rules say you can only ask if:
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>The target is on the <strong>opposing team</strong>.</li>
                  <li>
                    You <strong>hold at least one card</strong> in the same set as what you're
                    asking for.
                  </li>
                  <li>
                    You <strong>don't already hold</strong> the specific card.
                  </li>
                </ul>
                <p className="mt-2">
                  If the target has it → the card moves to you, and you ask again. If they don't →
                  turn passes to them.
                </p>
              </Section>

              <Section title="Jokers (Extended variant)">
                Two Jokers join the four 8s as one set of six. Ask for them generically as{' '}
                <span className="text-amber-300">"Joker"</span>:
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>0 Jokers + at least one 8 → you can ask for a Joker.</li>
                  <li>1 Joker → you can still ask for another.</li>
                  <li>2 Jokers → you can't ask (you already hold all of them).</li>
                </ul>
                If your target holds one or both Jokers, exactly one moves to you.
              </Section>

              <Section title="Claiming a set">
                You can claim <strong>at any time</strong> — your turn, your teammate's turn, even
                during an opponent's turn. To claim, assign each of the 6 cards in a set to a
                teammate (yourself counts as a teammate).
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>
                    <span className="text-emerald-300 font-medium">All 6 correct</span> → your team
                    scores 1 point.
                  </li>
                  <li>
                    <span className="text-rose-300 font-medium">Any wrong</span> → opposing team
                    scores 1 point.
                  </li>
                  <li>Either way, all 6 cards leave play.</li>
                </ul>
              </Section>

              <Section title="The memory part">
                Action notifications appear at the right and{' '}
                <strong>fade away after 15 seconds</strong>. There's no permanent history. Listen
                carefully — every ask is information you can use.
              </Section>

              <Section title="Controls">
                <ul className="list-disc pl-5 mt-1.5 space-y-1">
                  <li>
                    <strong>Ask</strong> tab in the right panel — pick a target, pick a card.
                  </li>
                  <li>
                    <strong>Claim</strong> tab — pick a set, assign each card to a teammate, submit.
                  </li>
                  <li>
                    <strong>Feed</strong> tab — the live action log (15-second window).
                  </li>
                  <li>
                    Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">Esc</kbd> to
                    close any dialog.
                  </li>
                </ul>
              </Section>
            </div>

            <footer className="px-6 py-4 border-t border-amber-900/40 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="rounded-md px-5 py-2 text-sm font-semibold text-slate-950"
                style={{
                  background: 'linear-gradient(180deg, #f6c45a 0%, #c98a2a 100%)',
                  boxShadow:
                    '0 4px 14px rgba(201,138,42,0.4), inset 0 1px 0 rgba(255,255,255,0.45)',
                  fontFamily: 'Cinzel, serif',
                  letterSpacing: '0.05em',
                }}
              >
                Got it
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3
        className="text-[10px] uppercase tracking-[0.3em] text-amber-300/90 mb-1.5"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}
