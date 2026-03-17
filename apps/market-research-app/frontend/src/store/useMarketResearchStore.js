import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  requestMarketResearchAnalysis,
  getMarketResearchReport as fetchMarketResearchReport,
  getCompetitorDetails,
} from "../api/market-research";

function logLineToKind(log) {
  const lower = log.toLowerCase();
  if (lower.includes("write_file") || lower.includes("writing")) return "write";
  if (lower.includes("read_file") || lower.includes("reading") || lower.includes("extract"))
    return "extract";
  if (lower.includes("navigate") || lower.includes("visiting")) return "navigate";
  if (lower.includes("found") || lower.includes("identified")) return "found";
  return "search";
}

export { logLineToKind };

export const useMarketResearchStore = create(
  persist(
    (set, get) => ({
      // --- Input form ---
      idea: "",
      regions: null,
      billingMode: "monthly",
      selectedPlan: null,

      // --- Analysis state ---
      reportId: null,
      analysisStartedAt: null,
      isAnalyzing: false,
      isAnalysisComplete: false,
      summaryStatus: "idle",
      competitors: [],
      activityEvents: [],
      selectedCompetitorId: null,
      report: null,
      competitorTaskMap: {},

      // --- Navigation actions (pure state; callers handle navigate) ---
      clearIdea: () => set({ idea: "" }),

      // --- Input form actions ---
      setIdea: (idea) => set({ idea }),
      setRegions: (regions) => set({ regions }),
      setBillingMode: (mode) => set({ billingMode: mode }),
      selectPlan: (plan) => set({ selectedPlan: plan }),
      clearPlan: () => set({ selectedPlan: null }),

      // --- Analysis actions ---
      startAnalysis: async () => {
        const { idea, regions, selectedPlan } = get();
        const numCompetitors = selectedPlan?.numCompetitors ?? 10;
        const reportId = crypto.randomUUID();

        set({
          reportId,
          isAnalyzing: true,
          isAnalysisComplete: false,
          summaryStatus: "finding-competitors",
          competitors: [],
          activityEvents: [],
          analysisStartedAt: Date.now(),
          report: null,
          competitorTaskMap: {},
          selectedCompetitorId: null,
        });

        try {
          await requestMarketResearchAnalysis(reportId, idea, numCompetitors, regions);
        } catch {
          set({
            isAnalyzing: false,
            isAnalysisComplete: false,
            summaryStatus: "failed",
            competitors: [],
            report: null,
            competitorTaskMap: {},
            selectedCompetitorId: null,
          });
        }
      },

      resetAnalysis: () => {
        set({
          reportId: null,
          isAnalyzing: false,
          isAnalysisComplete: false,
          summaryStatus: "idle",
          competitors: [],
          activityEvents: [],
          analysisStartedAt: null,
          selectedCompetitorId: null,
          report: null,
          competitorTaskMap: {},
        });
      },

      selectCompetitor: (id) => set({ selectedCompetitorId: id }),
      clearSelectedCompetitor: () => set({ selectedCompetitorId: null }),

      loadCompetitorDetails: async (competitorId) => {
        const { reportId, competitors } = get();
        if (!reportId) return;
        const existing = competitors.find((c) => c.id === competitorId);
        if (existing?.details) return;
        try {
          const response = await getCompetitorDetails(reportId, competitorId);
          if (response?.status === 202 && response?.data?.status === "retrying") {
            set((state) => ({
              competitors: state.competitors.map((c) =>
                c.id === competitorId ? { ...c, status: "analyzing" } : c,
              ),
            }));
            get()._syncSummaryStatus();
            return;
          }
          const profile = response?.data?.competitor;
          if (!profile) return;
          set((state) => ({
            competitors: state.competitors.map((c) =>
              c.id === competitorId ? { ...c, ...profile, status: c.status } : c,
            ),
          }));
          get()._syncSummaryStatus();
        } catch {
          // silently ignore
        }
      },

      latestActivityEvent: () => get().activityEvents[0] ?? null,

      // --- Internal mutation helpers ---
      _addActivityEvent: (event) =>
        set((state) => ({
          activityEvents: [event, ...state.activityEvents],
        })),

      _setCompetitors: (competitors) => set({ competitors }),

      _syncSummaryStatus: () =>
        set((state) => {
          if (state.report || state.isAnalysisComplete) {
            return { summaryStatus: "ready" };
          }
          if (!state.isAnalyzing) {
            return { summaryStatus: "idle" };
          }
          if (state.competitors.length === 0) {
            return { summaryStatus: "finding-competitors" };
          }
          if (
            state.competitors.some(
              (competitor) => competitor.status === "queued" || competitor.status === "analyzing",
            )
          ) {
            return { summaryStatus: "waiting-competitors" };
          }
          return { summaryStatus: "summarizing" };
        }),

      _addCompetitorStub: ({ taskId, competitorId, competitorName, competitorUrl }) =>
        set((state) => {
          if (state.competitors.some((c) => c.id === competitorId)) return state;
          return {
            competitors: [
              ...state.competitors,
              {
                id: competitorId,
                name: competitorName,
                url: competitorUrl,
                status: "queued",
                logoChar: competitorName?.[0]?.toUpperCase() ?? "?",
                logoColor: "#6366f1",
                logoBg: "#eef2ff",
              },
            ],
            competitorTaskMap: {
              ...state.competitorTaskMap,
              [taskId]: competitorId,
            },
            summaryStatus:
              state.summaryStatus === "idle" ? "waiting-competitors" : state.summaryStatus,
          };
        }),

      _mergeCompetitorProfile: (competitor) =>
        set((state) => ({
          competitors: state.competitors.map((entry) =>
            entry.id === competitor.id ? { ...entry, ...competitor, status: "done" } : entry,
          ),
        })),

      _updateCompetitorStatus: (id, status) =>
        set((state) => ({
          competitors: state.competitors.map((c) => (c.id === id ? { ...c, status } : c)),
        })),

      _applyReport: (report) => {
        const competitors = (report?.competitors || []).map((c) => ({
          ...c,
          status: "done",
        }));
        set({
          report,
          competitors,
          isAnalyzing: false,
          isAnalysisComplete: true,
          summaryStatus: "ready",
        });
      },

      _markAnalysisComplete: () => {
        set({
          isAnalyzing: false,
          isAnalysisComplete: true,
          summaryStatus: "ready",
        });
      },

      _markAnalysisFailed: () => {
        set({
          isAnalyzing: false,
          isAnalysisComplete: false,
          summaryStatus: "failed",
        });
      },

      openHistoryAnalysis: async (entry) => {
        const reportId = entry.id;
        set({
          idea: entry.idea,
          reportId,
          report: null,
          competitors: [],
          isAnalyzing: false,
          isAnalysisComplete: true,
          summaryStatus: "ready",
        });
        try {
          const response = await fetchMarketResearchReport(reportId);
          const report = response?.data?.report;
          if (report) {
            get()._applyReport(report);
          }
        } catch {
          // silently ignore
        }
      },
    }),
    {
      name: "market-research-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ reportId: state.reportId }),
    },
  ),
);
