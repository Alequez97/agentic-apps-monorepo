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
    set((state) => ({
      analysisHistory: [entry, ...state.analysisHistory].slice(0, 100),
    })),

  clearHistory: () => set({ analysisHistory: [] }),
}));
