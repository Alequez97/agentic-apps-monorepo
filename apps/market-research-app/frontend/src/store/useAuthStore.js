import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  signInWithGoogle as apiSignInWithGoogle,
  getAuthMe,
  logout as apiLogout,
  claimSession as apiClaimSession,
} from "../api/auth";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      returnStep: null,

      signInWithGoogle: async (credential) => {
        const response = await apiSignInWithGoogle(credential);
        const user = response.data?.user ?? null;
        set({ user });
        return user;
      },

      signOut: async () => {
        try {
          await apiLogout();
        } catch {
          // Cookie cleared client-side even if server call fails
        }
        set({ user: null, returnStep: null });
      },

      claimSession: async (sessionId) => {
        try {
          await apiClaimSession(sessionId);
          return true;
        } catch {
          return false;
        }
      },

      rehydrate: async () => {
        try {
          const response = await getAuthMe();
          const user = response.data?.user ?? null;
          set({ user });
          return user;
        } catch {
          set({ user: null });
          return null;
        }
      },

      setReturnStep: (step) => set({ returnStep: step }),
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
