import { useGameStore, useSessionStore, useUiStore, type ActionTab } from '@literature/domain';
import { AskPanel } from './AskPanel.js';
import { ClaimPanel } from './ClaimPanel.js';
import { ActionFeed } from './ActionFeed.js';
import type { ClientPlayerView } from '@literature/shared';

export function ActionPanel({ players }: { players: ClientPlayerView[] }) {
  const tab = useUiStore((s) => s.actionTab);
  const setTab = useUiStore((s) => s.setActionTab);
  const playerId = useSessionStore((s) => s.playerId);
  const turnPlayerId = useGameStore((s) => s.state?.turn.playerId ?? null);
  const isMyTurn = playerId !== null && turnPlayerId === playerId;

  return (
    <aside
      className="w-full lg:w-[400px] shrink-0 border-l border-amber-900/30 backdrop-blur flex flex-col"
      style={{
        background:
          'linear-gradient(180deg, rgba(10,18,22,0.88) 0%, rgba(6,12,16,0.88) 100%)',
      }}
    >
      <nav
        className="flex border-b border-slate-800/80 px-2 pt-3 gap-1"
        role="tablist"
        aria-label="Actions"
      >
        <TabButton
          tab="ask"
          active={tab === 'ask'}
          onClick={() => setTab('ask')}
          badge={isMyTurn && tab !== 'ask' ? '•' : undefined}
        >
          Ask
        </TabButton>
        <TabButton tab="claim" active={tab === 'claim'} onClick={() => setTab('claim')}>
          Claim
        </TabButton>
        <TabButton tab="feed" active={tab === 'feed'} onClick={() => setTab('feed')}>
          Feed
        </TabButton>
      </nav>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'ask' && <AskPanel />}
        {tab === 'claim' && <ClaimPanel />}
        {tab === 'feed' && <ActionFeed players={players} />}
      </div>
    </aside>
  );
}

function TabButton({
  tab,
  active,
  onClick,
  badge,
  children,
}: {
  tab: ActionTab;
  active: boolean;
  onClick: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`panel-${tab}`}
      onClick={onClick}
      className={`flex-1 px-4 py-3 text-xs uppercase tracking-[0.2em] transition relative ${
        active ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'
      }`}
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {badge && <span className="text-amber-400 text-base leading-none">{badge}</span>}
      </span>
      {active && (
        <span
          className="absolute left-3 right-3 -bottom-px h-[2px] rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.95) 50%, transparent 100%)',
            boxShadow: '0 0 12px rgba(34,211,238,0.6)',
          }}
        />
      )}
    </button>
  );
}
