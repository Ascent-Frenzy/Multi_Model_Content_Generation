import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  wizardStep: number;
  setWizardStep: (step: number) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  wizardStep: 1,
  setWizardStep: (step) => set({ wizardStep: step }),
}));
