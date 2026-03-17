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
