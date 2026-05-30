import { useUiStore } from '@literature/domain';

const KIND_STYLES: Record<string, string> = {
  error: 'bg-rose-500/15 border-rose-500/40 text-rose-200',
  info: 'bg-slate-700/40 border-slate-600 text-slate-100',
  success: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
};

export function ToastSurface() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`block max-w-sm rounded-md border px-4 py-2 text-sm text-left ${KIND_STYLES[t.kind] ?? KIND_STYLES.info}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
