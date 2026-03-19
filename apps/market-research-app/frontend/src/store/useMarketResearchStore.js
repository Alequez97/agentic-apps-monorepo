import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  requestMarketResearchAnalysis,
  getMarketResearchReport as fetchMarketResearchReport,
  getMarketResearchStatus,
  getCompetitorDetails,
  restartMarketResearchAnalysis,
  cancelMarketResearchAnalysis,
  retryTask,
} from "../api/market-research";
import { useAuthStore } from "./useAuthStore";
import { useProfileStore } from "./useProfileStore";
import {
  ANALYSIS_STATUS,
  TASK_STATUS,
  COMPETITOR_STATUS,
  SUMMARY_STATUS,
} from "../components/market-research/constants";

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
    const taskStatus = task?.status || TASK_STATUS.PENDING;
    const kind =
      taskStatus === TASK_STATUS.FAILED
        ? "write"
        : taskStatus === TASK_STATUS.COMPLETED
          ? "found"
          : "search";

    const message =
      taskStatus === TASK_STATUS.RUNNING
        ? `Researching ${competitorName}.`
        : taskStatus === TASK_STATUS.COMPLETED
          ? `Completed competitor analysis for ${competitorName}.`
          : taskStatus === TASK_STATUS.FAILED
            ? `Competitor analysis failed for ${competitorName}.`
            : taskStatus === TASK_STATUS.CANCELED
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

  if (status === ANALYSIS_STATUS.COMPLETE || status === ANALYSIS_STATUS.COMPLETED) {
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
      retryingCompetitorIds: new Set(),
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
          retryingCompetitorIds: new Set(),
        });

        try {
          const response = await requestMarketResearchAnalysis(
            reportId,
            idea,
            numCompetitors,
            regions,
          );
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
          retryingCompetitorIds: new Set(),
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
          if (
            err?.response?.status === 402 &&
            err?.response?.data?.code === "INSUFFICIENT_CREDITS"
          ) {
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
          retryingCompetitorIds: new Set(),
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
              status === ANALYSIS_STATUS.COMPLETE || status === ANALYSIS_STATUS.COMPLETED
                ? COMPETITOR_STATUS.DONE
                : task?.status === TASK_STATUS.RUNNING
                  ? COMPETITOR_STATUS.ANALYZING
                  : task?.status === TASK_STATUS.COMPLETED || profile?.id
                    ? COMPETITOR_STATUS.DONE
                    : task?.status === TASK_STATUS.FAILED
                      ? COMPETITOR_STATUS.FAILED
                      : task?.status === TASK_STATUS.CANCELED
                        ? COMPETITOR_STATUS.FAILED
                        : COMPETITOR_STATUS.QUEUED;

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
            report:
              report &&
              (status === ANALYSIS_STATUS.COMPLETE || status === ANALYSIS_STATUS.COMPLETED)
                ? report
                : null,
            competitors,
            competitorTaskMap,
            activityEvents: buildHydratedActivityEvents(tasks, competitors, status),
            analysisError: null,
            isAnalyzing: status === ANALYSIS_STATUS.ANALYZING,
            isAnalysisComplete:
              status === ANALYSIS_STATUS.COMPLETE || status === ANALYSIS_STATUS.COMPLETED,
            summaryStatus:
              status === ANALYSIS_STATUS.FAILED
                ? SUMMARY_STATUS.FAILED
                : status === ANALYSIS_STATUS.COMPLETE || status === ANALYSIS_STATUS.COMPLETED
                  ? SUMMARY_STATUS.READY
                  : competitors.length === 0
                    ? SUMMARY_STATUS.FINDING_COMPETITORS
                    : competitors.some(
                          (competitor) =>
                            competitor.status === COMPETITOR_STATUS.QUEUED ||
                            competitor.status === COMPETITOR_STATUS.ANALYZING,
                        )
                      ? SUMMARY_STATUS.WAITING_COMPETITORS
                      : status === ANALYSIS_STATUS.ANALYZING
                        ? SUMMARY_STATUS.SUMMARIZING
                        : SUMMARY_STATUS.IDLE,
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
        if (existing?.loadFailed) return;
        try {
          const response = await getCompetitorDetails(reportId, competitorId);
          if (response?.status === 202 && response?.data?.status === TASK_STATUS.RETRYING) {
            set((state) => ({
              competitors: state.competitors.map((c) =>
                c.id === competitorId ? { ...c, status: COMPETITOR_STATUS.ANALYZING } : c,
              ),
            }));
            get()._syncSummaryStatus();
            return;
          }
          const profile = response?.data?.competitor;
          if (!profile || !profile.description) {
            set((state) => ({
              competitors: state.competitors.map((c) =>
                c.id === competitorId ? { ...c, loadFailed: true } : c,
              ),
            }));
            return;
          }
          set((state) => ({
            competitors: state.competitors.map((c) =>
              c.id === competitorId ? { ...c, ...profile, status: c.status } : c,
            ),
          }));
          get()._syncSummaryStatus();
        } catch {
          set((state) => ({
            competitors: state.competitors.map((c) =>
              c.id === competitorId ? { ...c, loadFailed: true } : c,
            ),
          }));
        }
      },

      retryCompetitor: async (competitorId) => {
        const { competitors, retryingCompetitorIds } = get();
        const competitor = competitors.find((c) => c.id === competitorId);
        if (!competitor || !competitor.taskId) {
          console.error(`Cannot retry competitor ${competitorId}: no taskId found`);
          return false;
        }

        const newRetrying = new Set(retryingCompetitorIds);
        newRetrying.add(competitorId);
        set({ retryingCompetitorIds: newRetrying });

        try {
          await retryTask(competitor.taskId);
          set((state) => {
            const updatedRetrying = new Set(state.retryingCompetitorIds);
            updatedRetrying.delete(competitorId);
            return {
              competitors: state.competitors.map((c) =>
                c.id === competitorId ? { ...c, status: "analyzing", loadFailed: false } : c,
              ),
              retryingCompetitorIds: updatedRetrying,
            };
          });
          get()._syncSummaryStatus();
          return true;
        } catch (error) {
          console.error(`Failed to retry competitor ${competitorId}:`, error);
          set((state) => {
            const updatedRetrying = new Set(state.retryingCompetitorIds);
            updatedRetrying.delete(competitorId);
            return { retryingCompetitorIds: updatedRetrying };
          });
          return false;
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
            return { summaryStatus: SUMMARY_STATUS.READY };
          }
          if (!state.isAnalyzing) {
            return { summaryStatus: SUMMARY_STATUS.IDLE };
          }
          if (state.competitors.length === 0) {
            return { summaryStatus: SUMMARY_STATUS.FINDING_COMPETITORS };
          }
          if (
            state.competitors.some(
              (competitor) =>
                competitor.status === COMPETITOR_STATUS.QUEUED ||
                competitor.status === COMPETITOR_STATUS.ANALYZING,
            )
          ) {
            return { summaryStatus: SUMMARY_STATUS.WAITING_COMPETITORS };
          }
          return { summaryStatus: SUMMARY_STATUS.SUMMARIZING };
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
                status: COMPETITOR_STATUS.QUEUED,
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
              state.summaryStatus === SUMMARY_STATUS.IDLE
                ? SUMMARY_STATUS.WAITING_COMPETITORS
                : state.summaryStatus,
          };
        }),

      _mergeCompetitorProfile: (competitor) =>
        set((state) => ({
          competitors: state.competitors.map((entry) =>
            entry.id === competitor.id
              ? { ...entry, ...competitor, status: COMPETITOR_STATUS.DONE }
              : entry,
          ),
        })),

      _updateCompetitorStatus: (id, status) =>
        set((state) => ({
          competitors: state.competitors.map((c) => (c.id === id ? { ...c, status } : c)),
        })),

      _applyReport: (report) => {
        // Map competitors preserving their status from the backend
        const competitors = (report?.competitors || []).map((c) => ({
          ...c,
          // Use the status from the report - backend sets "done" or "failed"
          status: c.status === "failed" ? COMPETITOR_STATUS.FAILED : COMPETITOR_STATUS.DONE,
        }));
        set({
          report,
          competitors,
          isAnalyzing: false,
          isAnalysisComplete: true,
          summaryStatus: SUMMARY_STATUS.READY,
        });
      },

      _markAnalysisComplete: () => {
        set({
          isAnalyzing: false,
          isAnalysisComplete: true,
          summaryStatus: SUMMARY_STATUS.READY,
        });
      },

      _markAnalysisFailed: () => {
        set({
          isAnalyzing: false,
          isAnalysisComplete: false,
          summaryStatus: SUMMARY_STATUS.FAILED,
        });
      },

      _markAnalysisCanceled: () => {
        set({
          isAnalyzing: false,
          isAnalysisComplete: false,
          summaryStatus: SUMMARY_STATUS.IDLE,
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
          retryingCompetitorIds: new Set(),
          isAnalyzing: entry.status === ANALYSIS_STATUS.ANALYZING,
          isAnalysisComplete: false,
          summaryStatus:
            entry.status === ANALYSIS_STATUS.FAILED
              ? SUMMARY_STATUS.FAILED
              : entry.status === ANALYSIS_STATUS.COMPLETE
                ? SUMMARY_STATUS.SUMMARIZING
                : SUMMARY_STATUS.FINDING_COMPETITORS,
        });
        try {
          const response = await fetchMarketResearchReport(reportId);
          const report = response?.data?.report;
          const status = response?.data?.status ?? entry.status ?? SUMMARY_STATUS.IDLE;

          if (
            report &&
            (status === ANALYSIS_STATUS.COMPLETE || status === ANALYSIS_STATUS.COMPLETED)
          ) {
            get()._applyReport(report);
            return;
          }

          set({
            isAnalyzing: status === ANALYSIS_STATUS.ANALYZING,
            isAnalysisComplete: false,
            summaryStatus:
              status === ANALYSIS_STATUS.FAILED
                ? SUMMARY_STATUS.FAILED
                : status === ANALYSIS_STATUS.ANALYZING
                  ? SUMMARY_STATUS.FINDING_COMPETITORS
                  : SUMMARY_STATUS.IDLE,
          });
          if (status === ANALYSIS_STATUS.FAILED) {
            get()._markAnalysisFailed();
          }
        } catch {
          if (entry.status === ANALYSIS_STATUS.FAILED) {
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
