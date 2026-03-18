import { create } from "zustand";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socket-events";
import { TASK_TYPES } from "../constants/task-types";
import {
  useMarketResearchStore,
  logLineToKind,
} from "./useMarketResearchStore";
import { useProfileStore } from "./useProfileStore";
import { useTaskProgressStore } from "./useTaskProgressStore";
import { getMarketResearchReport } from "../api/market-research";
import { SOCKET_ORIGIN, SOCKET_PATH } from "../config/runtime";

export const useSocketStore = create((set, get) => ({
  socket: null,
  socketConnected: false,

  initSocket: () => {
    if (get().socket) return;

    const socket = io(SOCKET_ORIGIN, {
      path: SOCKET_PATH,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      withCredentials: true,
    });

    set({ socket });

    socket.on("connect", () => {
      set({ socketConnected: true });
    });

    socket.on("disconnect", () => {
      set({ socketConnected: false });
    });

    // ── Task lifecycle events ─────────────────────────────────────────────

    socket.on(SOCKET_EVENTS.TASK_QUEUED, (data) => {
      const {
        taskId,
        type,
        domainId,
        delegatedByTaskId,
        competitorName,
        competitorId,
        competitorUrl,
        agent,
        model,
      } = data;
      if (taskId) {
        useTaskProgressStore.getState().setPending(taskId, {
          domainId,
          type,
          delegatedByTaskId,
          competitorName,
          competitorId,
          competitorUrl,
          agent,
          model,
        });
      }
    });

    socket.on(SOCKET_EVENTS.TASK_PROGRESS, (data) => {
      const { taskId, type, domainId, stage, message } = data;

      useTaskProgressStore.getState().setProgress(taskId, {
        domainId: domainId ?? null,
        type,
        stage,
        message,
      });

      if (type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR) {
        const mrStore = useMarketResearchStore.getState();
        const competitorId = mrStore.competitorTaskMap[taskId];
        if (competitorId) {
          mrStore._updateCompetitorStatus(competitorId, "analyzing");
          mrStore._syncSummaryStatus();
        }
      }
    });

    socket.on(SOCKET_EVENTS.TASK_COMPLETED, (data) => {
      const { type, taskId, domainId } = data;

      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCompleted({ id: taskId, type, domainId });
      }

      if (type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR) {
        const mrStore = useMarketResearchStore.getState();
        const competitorId = mrStore.competitorTaskMap[taskId];
        if (competitorId) {
          mrStore._updateCompetitorStatus(competitorId, "done");
          mrStore._syncSummaryStatus();
        }
      } else if (type === TASK_TYPES.MARKET_RESEARCH_INITIAL) {
        const reportId = data?.params?.sessionId;
        const storeReportId = useMarketResearchStore.getState().reportId;
        if (reportId && reportId === storeReportId) {
          useMarketResearchStore.getState()._syncSummaryStatus();
        }
      } else if (type === TASK_TYPES.MARKET_RESEARCH_SUMMARY) {
        const reportId = data?.params?.sessionId;
        const idea = data?.params?.idea;
        const storeReportId = useMarketResearchStore.getState().reportId;

        if (reportId && idea) {
          useProfileStore.getState().upsertAnalysis({
            id: reportId,
            idea,
            completedAt: Date.now(),
            updatedAt: Date.now(),
            competitorCount:
              useMarketResearchStore.getState().competitors.length,
            status: "complete",
          });
        }

        if (reportId && reportId === storeReportId) {
          if (useMarketResearchStore.getState().isAnalysisComplete) return;
          getMarketResearchReport(reportId)
            .then((response) => {
              const report = response?.data?.report;
              const status = response?.data?.status;
              if (report && (status === "complete" || status === "completed")) {
                useMarketResearchStore.getState()._applyReport(report);
              } else {
                useMarketResearchStore.getState()._markAnalysisFailed();
              }
            })
            .catch(() => {
              useMarketResearchStore.getState()._markAnalysisFailed();
            });
        }
      }
    });

    socket.on(SOCKET_EVENTS.TASK_FAILED, (data) => {
      const { type, taskId, domainId, error } = data;
      const reportId = data?.params?.sessionId;
      const idea = data?.params?.idea;

      if (taskId) {
        useTaskProgressStore
          .getState()
          .setFailed({ id: taskId, type, domainId, error });
      }

      if (
        reportId &&
        [
          TASK_TYPES.MARKET_RESEARCH_INITIAL,
          TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
          TASK_TYPES.MARKET_RESEARCH_SUMMARY,
        ].includes(type)
      ) {
        useProfileStore.getState().upsertAnalysis({
          id: reportId,
          idea: idea ?? useMarketResearchStore.getState().idea ?? "Untitled analysis",
          completedAt: Date.now(),
          updatedAt: Date.now(),
          competitorCount: useMarketResearchStore.getState().competitors.length,
          status: "failed",
          error: error ?? "Task failed",
        });
      }

      if (type === TASK_TYPES.MARKET_RESEARCH_INITIAL) {
        const storeReportId = useMarketResearchStore.getState().reportId;
        if (reportId && reportId === storeReportId) {
          useMarketResearchStore.getState()._markAnalysisFailed();
        }
      } else if (type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR) {
        const mrStore = useMarketResearchStore.getState();
        const competitorId = mrStore.competitorTaskMap[taskId];
        if (competitorId) {
          mrStore._updateCompetitorStatus(competitorId, "failed");
          mrStore._syncSummaryStatus();
        }
      } else if (type === TASK_TYPES.MARKET_RESEARCH_SUMMARY) {
        useMarketResearchStore.getState()._markAnalysisFailed();
      }
    });

    socket.on(SOCKET_EVENTS.TASK_CANCELED, (data) => {
      const { type, taskId, domainId } = data;
      const reportId = data?.params?.sessionId;
      const idea = data?.params?.idea;
      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCanceled({ id: taskId, type, domainId });
      }

      if (
        reportId &&
        [
          TASK_TYPES.MARKET_RESEARCH_INITIAL,
          TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
          TASK_TYPES.MARKET_RESEARCH_SUMMARY,
        ].includes(type)
      ) {
        useProfileStore.getState().upsertAnalysis({
          id: reportId,
          idea: idea ?? useMarketResearchStore.getState().idea ?? "Untitled analysis",
          completedAt: Date.now(),
          updatedAt: Date.now(),
          competitorCount: useMarketResearchStore.getState().competitors.length,
          status: "canceled",
        });
      }

      const mrStore = useMarketResearchStore.getState();
      if (reportId && reportId === mrStore.reportId) {
        mrStore._markAnalysisCanceled();
      }
    });

    // ── Market research lifecycle events ─────────────────────────────────

    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_FOUND, (data) => {
      const { sessionId: reportId, taskId, competitorId, competitorName, competitorUrl } =
        data;
      const storeReportId = useMarketResearchStore.getState().reportId;
      if (reportId && reportId === storeReportId) {
        const mrStore = useMarketResearchStore.getState();
        mrStore._addCompetitorStub({
          taskId,
          competitorId,
          competitorName,
          competitorUrl,
        });
        mrStore._syncSummaryStatus();
      }
    });

    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED, (data) => {
      const { sessionId: reportId, competitor } = data ?? {};
      const mrStore = useMarketResearchStore.getState();
      if (!reportId || reportId !== mrStore.reportId || !competitor?.id) {
        return;
      }
      mrStore._mergeCompetitorProfile(competitor);
      mrStore._syncSummaryStatus();
    });

    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, (data) => {
      const { sessionId: reportId } = data ?? {};
      const mrStore = useMarketResearchStore.getState();
      if (!reportId || reportId !== mrStore.reportId) return;
      if (mrStore.isAnalysisComplete) return;
      getMarketResearchReport(reportId)
        .then((response) => {
          const report = response?.data?.report;
          const status = response?.data?.status;
          if (report && (status === "complete" || status === "completed")) {
            useMarketResearchStore.getState()._applyReport(report);
          } else {
            useMarketResearchStore.getState()._markAnalysisFailed();
          }
        })
        .catch(() => {
          useMarketResearchStore.getState()._markAnalysisFailed();
        });
    });

    // ── Activity feed log events ──────────────────────────────────────────

    const handleMarketResearchLog = (data, agentLabel, agentColor) => {
      const { log, kind } = data ?? {};
      if (!log || typeof log !== "string") return;
      const trimmed = log.trim();
      if (!trimmed) return;
      useMarketResearchStore.getState()._addActivityEvent({
        id: `log-${Date.now()}-${Math.random()}`,
        kind: kind ?? logLineToKind(trimmed),
        message: trimmed,
        agent: agentLabel,
        agentColor,
        timestamp: Date.now(),
      });
    };

    socket.on(SOCKET_EVENTS.LOG_MARKET_RESEARCH_INITIAL, (data) =>
      handleMarketResearchLog(data, "Initial", "#6366f1"),
    );
    socket.on(SOCKET_EVENTS.LOG_MARKET_RESEARCH_COMPETITOR, (data) =>
      handleMarketResearchLog(data, "Competitor", "#d97706"),
    );
    socket.on(SOCKET_EVENTS.LOG_MARKET_RESEARCH_SUMMARY, (data) =>
      handleMarketResearchLog(data, "Summary", "#0f766e"),
    );
  },
}));
