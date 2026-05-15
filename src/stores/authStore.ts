import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updatePoints: (points: number) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      setLoading: (loading) => set({ loading }),
      updatePoints: (points) =>
        set((state) => ({
          user: state.user ? { ...state.user, points } : null,
        })),
    }),
    { name: "cota-auth-v1" }
  )
);
