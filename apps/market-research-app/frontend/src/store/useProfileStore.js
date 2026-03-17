import { create } from "zustand";
import { getAnalysisHistory } from "../api/market-research";

export const useProfileStore = create((set) => ({
  analysisHistory: [],
  isLoading: false,
  error: null,

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAnalysisHistory();
      set({ analysisHistory: response.data?.history ?? [], isLoading: false });
    } catch (err) {
      set({ error: err.message ?? "Failed to load history", isLoading: false });
    }
  },

  addAnalysis: (entry) =>
    set((state) => {
      const next = [entry, ...state.analysisHistory.filter((item) => item.id !== entry.id)];
      return {
        analysisHistory: next
          .sort((a, b) => (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0))
          .slice(0, 100),
      };
    }),

  upsertAnalysis: (entry) =>
    set((state) => {
      const existing = state.analysisHistory.find((item) => item.id === entry.id);
      const merged = {
        ...existing,
        ...entry,
      };
      const next = [merged, ...state.analysisHistory.filter((item) => item.id !== entry.id)];
      return {
        analysisHistory: next
          .sort((a, b) => (b.completedAt ?? b.updatedAt ?? 0) - (a.completedAt ?? a.updatedAt ?? 0))
          .slice(0, 100),
      };
    }),

  clearHistory: () => set({ analysisHistory: [] }),
}));
