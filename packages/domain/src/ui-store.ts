import { create } from 'zustand';

export type ToastKind = 'error' | 'info' | 'success';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

export type UiState = {
  toasts: Toast[];
  askModalOpen: boolean;
  claimBuilderOpen: boolean;
  showToast: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  dismissToast: (id: string) => void;
  setAskModalOpen: (open: boolean) => void;
  setClaimBuilderOpen: (open: boolean) => void;
};

let nextToastId = 1;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  askModalOpen: false,
  claimBuilderOpen: false,
  showToast: (toast) => {
    const id = toast.id ?? `t${nextToastId++}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind: toast.kind, message: toast.message }] }));
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setAskModalOpen: (open) => set({ askModalOpen: open }),
  setClaimBuilderOpen: (open) => set({ claimBuilderOpen: open }),
}));
