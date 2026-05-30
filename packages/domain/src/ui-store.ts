import { create } from 'zustand';

export type ToastKind = 'error' | 'info' | 'success';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

export type ActionTab = 'ask' | 'claim' | 'feed';

export type UiState = {
  toasts: Toast[];
  actionTab: ActionTab;
  showToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  dismissToast: (id: string) => void;
  setActionTab: (tab: ActionTab) => void;
};

let nextToastId = 1;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  actionTab: 'feed',
  showToast: (toast) => {
    const id = toast.id ?? `t${nextToastId++}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind: toast.kind, message: toast.message }] }));
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setActionTab: (tab) => set({ actionTab: tab }),
}));
