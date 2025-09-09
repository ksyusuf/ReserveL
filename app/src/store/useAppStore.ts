import { create } from 'zustand';

// ----- Types -----
export type BusinessSession = {
  name: string;
  walletAddress: string;
} | null;

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  timeout?: number;
};

type SessionSlice = {
  businessSession: BusinessSession;
  isAuthenticated: boolean;
  setBusinessSession: (session: BusinessSession) => void;
  setAuthenticated: (value: boolean) => void;
  logout: () => void;
};

type WalletSlice = {
  walletConnected: boolean;
  walletAddress: string | null;
  walletError: string | null;
  setWalletConnected: (connected: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setWalletError: (message: string | null) => void;
  resetWallet: () => void;
};

type GlobalUiSlice = {
  isGlobalLoading: boolean;
  globalError: string | null;
  theme: 'light' | 'dark' | 'system';
  sidePanelOpen: boolean;
  activeModal: string | null;
  setGlobalLoading: (value: boolean) => void;
  setGlobalError: (message: string | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSidePanelOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
};

type NotificationsSlice = {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

export type AppState = SessionSlice & WalletSlice & GlobalUiSlice & NotificationsSlice;

// ----- Helpers -----
let toastSequence = 0;
const createToastId = (): string => `${Date.now()}_${toastSequence++}`;

// ----- Store -----
export const useAppStore = create<AppState>((set) => ({
  // Session
  businessSession: null,
  isAuthenticated: false,
  setBusinessSession: (session) =>
    set((state) => ({
      businessSession: session,
      isAuthenticated: Boolean(session),
    })),
  setAuthenticated: (value) => set(() => ({ isAuthenticated: value })),
  logout: () =>
    set(() => ({
      businessSession: null,
      isAuthenticated: false,
    })),

  // Wallet
  walletConnected: false,
  walletAddress: null,
  walletError: null,
  setWalletConnected: (connected) => set(() => ({ walletConnected: connected })),
  setWalletAddress: (address) => set(() => ({ walletAddress: address })),
  setWalletError: (message) => set(() => ({ walletError: message })),
  resetWallet: () =>
    set(() => ({
      walletConnected: false,
      walletAddress: null,
      walletError: null,
    })),

  // Global UI
  isGlobalLoading: false,
  globalError: null,
  theme: 'dark',
  sidePanelOpen: false,
  activeModal: null,
  setGlobalLoading: (value) => set(() => ({ isGlobalLoading: value })),
  setGlobalError: (message) => set(() => ({ globalError: message })),
  setTheme: (theme) => set(() => ({ theme })),
  setSidePanelOpen: (open) => set(() => ({ sidePanelOpen: open })),
  openModal: (modalId) => set(() => ({ activeModal: modalId })),
  closeModal: () => set(() => ({ activeModal: null })),

  // Notifications
  toasts: [],
  pushToast: (toast) => {
    const id = toast.id ?? createToastId();
    set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }));
    return id;
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set(() => ({ toasts: [] })),
}));


