import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  requestMarketResearchAnalysis,
  getMarketResearchReport as fetchMarketResearchReport,
  getMarketResearchStatus,
  getCompetitorDetails,
  restartMarketResearchAnalysis,
  cancelMarketResearchAnalysis,
} from "../api/market-research";
import { useAuthStore } from "./useAuthStore";
import { useProfileStore } from "./useProfileStore";

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

function buildHydratedActivityEvents(tasks = [], competitors = [], status = "idle") {
  const events = [];
  const now = Date.now();

  const byCreatedAt = [...tasks].sort((a, b) => {
    const aTs = Date.parse(a?.createdAt || "") || 0;
    const bTs = Date.parse(b?.createdAt || "") || 0;
    return aTs - bTs;
  });

  byCreatedAt.forEach((task, index) => {
    if (task.type !== "market-research-competitor") return;

    const competitorName = task?.params?.competitorName || "Competitor";
    const taskStatus = task?.status || "pending";
    const kind =
      taskStatus === "failed" ? "write" : taskStatus === "completed" ? "found" : "search";

    const message =
      taskStatus === "running"
        ? `Researching ${competitorName}.`
        : taskStatus === "completed"
          ? `Completed competitor analysis for ${competitorName}.`
          : taskStatus === "failed"
            ? `Competitor analysis failed for ${competitorName}.`
            : taskStatus === "canceled"
              ? `Competitor analysis was canceled for ${competitorName}.`
              : `Queued competitor analysis for ${competitorName}.`;

    events.push({
      id: `task-${task.id || index}`,
      kind,
      message,
      agent: "Competitor",
      agentColor: "#d97706",
      timestamp: Date.parse(task?.createdAt || "") || now - index - 1,
    });
  });

  if (status === "complete" || status === "completed") {
    events.unshift({
      id: `summary-${now + 1}`,
      kind: "write",
      message: `Compiled final report for ${competitors.length} competitors.`,
      agent: "Summary",
      agentColor: "#0f766e",
      timestamp: now + 1,
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

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
      isValidating: false,
      validationError: null, // { rejectionReason, suggestedPrompt }
      analysisError: null,
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
      setIdea: (idea) => set({ idea, validationError: null, analysisError: null }),
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
          isValidating: true,
          validationError: null,
          analysisError: null,
          reportId,
          isAnalyzing: false,
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
          const response = await requestMarketResearchAnalysis(reportId, idea, numCompetitors, regions);
          useAuthStore.getState().updateUserCredits(response?.data?.subscription ?? null);
          set({ isValidating: false, isAnalyzing: true });
          useProfileStore.getState().upsertAnalysis({
            id: reportId,
            idea,
            competitorCount: 0,
            completedAt: Date.now(),
            updatedAt: Date.now(),
            status: "analyzing",
          });
          return { success: true };
        } catch (err) {
          const data = err?.response?.data;
          if (err?.response?.status === 422 && data?.rejectionReason) {
            set({
              isValidating: false,
              isAnalyzing: false,
              summaryStatus: "idle",
              reportId: null,
              analysisError: null,
              validationError: {
                rejectionReason: data.rejectionReason,
                suggestedPrompt: data.suggestedPrompt ?? null,
              },
            });
            return { success: false, rejected: true };
          }
          if (err?.response?.status === 402 && data?.code === "INSUFFICIENT_CREDITS") {
            useAuthStore.getState().updateUserCredits(data?.subscription ?? null);
            set({
              isValidating: false,
              isAnalyzing: false,
              isAnalysisComplete: false,
              summaryStatus: "idle",
              reportId: null,
              analysisError: data?.error ?? "At least 2 credits are required to start a report",
            });
            return { success: false, rejected: false, insufficientCredits: true };
          }
          set({
            isValidating: false,
            isAnalyzing: false,
            isAnalysisComplete: false,
            summaryStatus: "failed",
            validationError: null,
            analysisError: null,
            competitors: [],
            report: null,
            competitorTaskMap: {},
            selectedCompetitorId: null,
          });
          useProfileStore.getState().upsertAnalysis({
            id: reportId,
            idea,
            competitorCount: 0,
            completedAt: Date.now(),
            updatedAt: Date.now(),
            status: "failed",
          });
          return { success: false, rejected: false };
        }
      },

      restartAnalysis: async ({ reportId, idea, regions = null }) => {
        set({
          idea,
          regions,
          reportId,
          analysisError: null,
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
          const response = await restartMarketResearchAnalysis(reportId, idea, regions);
          useAuthStore.getState().updateUserCredits(response?.data?.subscription ?? null);
          useProfileStore.getState().upsertAnalysis({
            id: reportId,
            idea,
            competitorCount: 0,
            completedAt: Date.now(),
            updatedAt: Date.now(),
            status: "analyzing",
          });
          return true;
        } catch (err) {
          if (err?.response?.status === 402 && err?.response?.data?.code === "INSUFFICIENT_CREDITS") {
            useAuthStore.getState().updateUserCredits(err.response.data?.subscription ?? null);
            set({
              isAnalyzing: false,
              isAnalysisComplete: false,
              summaryStatus: "idle",
              analysisError:
                err.response.data?.error ?? "At least 2 credits are required to start a report",
            });
            return false;
          }
          set({
            isAnalyzing: false,
            isAnalysisComplete: false,
            summaryStatus: "failed",
          });
          useProfileStore.getState().upsertAnalysis({
            id: reportId,
            idea,
            competitorCount: 0,
            completedAt: Date.now(),
            updatedAt: Date.now(),
            status: "failed",
          });
          return false;
        }
      },

      cancelAnalysis: async () => {
        const { reportId, idea } = get();
        if (!reportId) return false;

        try {
          await cancelMarketResearchAnalysis(reportId);
          set({
            isAnalyzing: false,
            isAnalysisComplete: false,
            summaryStatus: "idle",
          });
          useProfileStore.getState().upsertAnalysis({
            id: reportId,
            idea: idea ?? "Untitled analysis",
            completedAt: Date.now(),
            updatedAt: Date.now(),
            competitorCount: get().competitors.length,
            status: "canceled",
          });
          return true;
        } catch {
          return false;
        }
      },

      resetAnalysis: () => {
        set({
          reportId: null,
          idea: "",
          regions: null,
          analysisError: null,
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

      removeReportFromState: (reportId) => {
        if (!reportId || get().reportId !== reportId) return;
        get().resetAnalysis();
      },

      hydrateAnalysis: async (incomingReportId = null) => {
        const reportId = incomingReportId ?? get().reportId;
        if (!reportId) return false;

        try {
          const response = await getMarketResearchStatus(reportId);
          const session = response?.data?.session ?? null;
          const report = response?.data?.report ?? null;
          const competitorTasks = response?.data?.competitorTasks ?? [];
          const competitorProfiles = response?.data?.competitors ?? [];
          const tasks = response?.data?.tasks ?? [];
          const subscription = response?.data?.subscription ?? null;
          const status = session?.state?.status ?? report?.status ?? "idle";

          useAuthStore.getState().updateUserCredits(subscription);

          const profileMap = new Map(
            competitorProfiles.filter((entry) => entry?.id).map((entry) => [entry.id, entry]),
          );
          const taskMap = new Map(
            competitorTasks
              .filter((entry) => entry?.competitorId)
              .map((entry) => [entry.competitorId, entry]),
          );
          const taskStatusMap = new Map(
            tasks
              .filter((task) => task?.type === "market-research-competitor")
              .map((task) => [task?.params?.competitorId, task]),
          );

          const draftCompetitors = Array.isArray(report?.competitors) ? report.competitors : [];
          const fallbackCompetitors = competitorTasks.map((entry) => ({
            id: entry.competitorId,
            name: profileMap.get(entry.competitorId)?.name ?? entry.competitorId,
            url: profileMap.get(entry.competitorId)?.url ?? "",
          }));
          const sourceCompetitors =
            draftCompetitors.length > 0 ? draftCompetitors : fallbackCompetitors;

          const competitors = sourceCompetitors.map((entry) => {
            const profile = profileMap.get(entry.id) ?? {};
            const task = taskStatusMap.get(entry.id);
            const restoredStatus =
              status === "complete" || status === "completed"
                ? "done"
                : task?.status === "running"
                  ? "analyzing"
                  : task?.status === "completed" || profile?.id
                    ? "done"
                    : task?.status === "failed"
                      ? "failed"
                      : task?.status === "canceled"
                        ? "failed"
                        : "queued";

            return {
              ...entry,
              ...profile,
              taskId: taskMap.get(entry.id)?.taskId ?? task?.id ?? null,
              status: restoredStatus,
              logoChar:
                profile?.logoChar ?? entry?.logoChar ?? entry?.name?.[0]?.toUpperCase() ?? "?",
              logoColor: profile?.logoColor ?? entry?.logoColor ?? "#6366f1",
              logoBg: profile?.logoBg ?? entry?.logoBg ?? "#eef2ff",
            };
          });

          const competitorTaskMap = {};
          competitorTasks.forEach((entry) => {
            if (entry?.taskId && entry?.competitorId) {
              competitorTaskMap[entry.taskId] = entry.competitorId;
            }
          });
          tasks.forEach((task) => {
            const competitorId = task?.params?.competitorId;
            if (task?.id && competitorId && !competitorTaskMap[task.id]) {
              competitorTaskMap[task.id] = competitorId;
            }
          });

          set({
            reportId,
            idea: session?.idea ?? report?.idea ?? get().idea,
            report: report && (status === "complete" || status === "completed") ? report : null,
            competitors,
            competitorTaskMap,
            activityEvents: buildHydratedActivityEvents(tasks, competitors, status),
            analysisError: null,
            isAnalyzing: status === "analyzing",
            isAnalysisComplete: status === "complete" || status === "completed",
            summaryStatus:
              status === "failed"
                ? "failed"
                : status === "complete" || status === "completed"
                  ? "ready"
                  : competitors.length === 0
                    ? "finding-competitors"
                    : competitors.some(
                          (competitor) =>
                            competitor.status === "queued" || competitor.status === "analyzing",
                        )
                      ? "waiting-competitors"
                      : status === "analyzing"
                        ? "summarizing"
                        : "idle",
          });

          return true;
        } catch {
          return false;
        }
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

      _markAnalysisCanceled: () => {
        set({
          isAnalyzing: false,
          isAnalysisComplete: false,
          summaryStatus: "idle",
        });
      },

      openHistoryAnalysis: async (entry) => {
        const reportId = entry.id;
        set({
          idea: entry.idea,
          reportId,
          report: null,
          competitors: [],
          activityEvents: [],
          competitorTaskMap: {},
          selectedCompetitorId: null,
          isAnalyzing: entry.status === "analyzing",
          isAnalysisComplete: false,
          summaryStatus:
            entry.status === "failed"
              ? "failed"
              : entry.status === "complete"
                ? "summarizing"
                : "finding-competitors",
        });
        try {
          const response = await fetchMarketResearchReport(reportId);
          const report = response?.data?.report;
          const status = response?.data?.status ?? entry.status ?? "idle";

          if (report && (status === "complete" || status === "completed")) {
            get()._applyReport(report);
            return;
          }

          set({
            isAnalyzing: status === "analyzing",
            isAnalysisComplete: false,
            summaryStatus:
              status === "failed"
                ? "failed"
                : status === "analyzing"
                  ? "finding-competitors"
                  : "idle",
          });
          if (status === "failed") {
            get()._markAnalysisFailed();
          }
        } catch {
          if (entry.status === "failed") {
            get()._markAnalysisFailed();
          }
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
