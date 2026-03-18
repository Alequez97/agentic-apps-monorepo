import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  signInWithGoogle as apiSignInWithGoogle,
  getAuthMe,
  logout as apiLogout,
} from "../api/auth";
import { setCsrfToken } from "../api/client";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,

      updateUserCredits: (subscription) =>
        set((state) => {
          if (!state.user || !subscription) return state;
          return {
            user: {
              ...state.user,
              plan: subscription.plan ?? state.user.plan,
              creditsUsed: subscription.creditsUsed ?? state.user.creditsUsed ?? 0,
              creditsTotal: subscription.creditsTotal ?? state.user.creditsTotal ?? 0,
              creditsRemaining:
                subscription.creditsRemaining ?? state.user.creditsRemaining ?? 0,
            },
          };
        }),

      signInWithGoogle: async (credential) => {
        const response = await apiSignInWithGoogle(credential);
        const user = response.data?.user ?? null;
        setCsrfToken(response.data?.csrfToken ?? null);
        set({ user });
        return user;
      },

      signOut: async () => {
        try {
          await apiLogout();
        } catch {
          // Cookie cleared client-side even if server call fails
        }
        setCsrfToken(null);
        set({ user: null });
      },

      rehydrate: async () => {
        try {
          const response = await getAuthMe();
          const user = response.data?.user ?? null;
          setCsrfToken(response.data?.csrfToken ?? null);
          set({ user });
          return user;
        } catch {
          set({ user: null });
          return null;
        }
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
