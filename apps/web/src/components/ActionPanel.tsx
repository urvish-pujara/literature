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
    <aside className="w-full lg:w-[380px] shrink-0 border-l border-slate-800 bg-slate-950/40 backdrop-blur flex flex-col">
      <nav className="flex border-b border-slate-800" role="tablist" aria-label="Actions">
        <TabButton
          tab="ask"
          active={tab === 'ask'}
          onClick={() => setTab('ask')}
          badge={isMyTurn ? 'Your turn' : undefined}
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
      <div className="flex-1 overflow-y-auto p-4">
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
      className={`flex-1 px-4 py-3 text-sm border-b-2 transition flex items-center justify-center gap-2 ${
        active
          ? 'border-emerald-400 text-emerald-100 bg-slate-900/60'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
      }`}
    >
      <span>{children}</span>
      {badge && (
        <span className="text-[10px] uppercase tracking-wide rounded bg-amber-500/15 text-amber-300 px-1.5 py-0.5 border border-amber-500/30">
          {badge}
        </span>
      )}
    </button>
  );
}
