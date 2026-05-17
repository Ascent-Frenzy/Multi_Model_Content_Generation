import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: { id: string; email: string } | null;
  hydrated: boolean;
  setAuth: (token: string, refreshToken: string, user: { id: string; email: string }) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setAuth: (token, refreshToken, user) => {
        set({ token, refreshToken, user });
      },
      logout: () => set({ token: null, refreshToken: null, user: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
