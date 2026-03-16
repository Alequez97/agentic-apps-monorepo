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

const SOCKET_URL = window.location.origin;

export const useSocketStore = create((set, get) => ({
  socket: null,
  socketConnected: false,

  initSocket: () => {
    if (get().socket) return;

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    set({ socket });

    socket.on("connect", () => {
      set({ socketConnected: true });

      useTaskProgressStore
        .getState()
        .loadTasks()
        .then(() => {
          // Restore competitor stubs from loaded tasks after a page reload.
          const mrStore = useMarketResearchStore.getState();
          const storeSessionId = mrStore.sessionId;
          if (storeSessionId) {
            const { progressByTaskId } = useTaskProgressStore.getState();
            const competitorEntries = [];
            const hasRunningInitial = [...progressByTaskId.values()].some(
              (e) =>
                e.type === TASK_TYPES.MARKET_RESEARCH_INITIAL &&
                (e.status === "running" || e.status === "pending"),
            );
            const hasRunningSummary = [...progressByTaskId.values()].some(
              (e) =>
                e.type === TASK_TYPES.MARKET_RESEARCH_SUMMARY &&
                (e.status === "running" || e.status === "pending"),
            );

            for (const [taskId, entry] of progressByTaskId) {
              if (
                entry.type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR &&
                entry.competitorId &&
                (entry.status === "running" || entry.status === "pending")
              ) {
                competitorEntries.push({ taskId, entry });
              }
            }

            if (
              competitorEntries.length > 0 ||
              hasRunningInitial ||
              hasRunningSummary
            ) {
              if (!mrStore.isAnalyzing) {
                useMarketResearchStore.setState({
                  isAnalyzing: true,
                  step: "analysis",
                });
              }
              for (const { taskId, entry } of competitorEntries) {
                mrStore._addCompetitorStub({
                  taskId,
                  competitorId: entry.competitorId,
                  competitorName: entry.competitorName,
                  competitorUrl: entry.competitorUrl ?? "",
                });
              }
              mrStore._syncSummaryStatus();
            }
          }
        });
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
        const sessionId = data?.params?.sessionId;
        const storeSessionId = useMarketResearchStore.getState().sessionId;
        if (sessionId && sessionId === storeSessionId) {
          useMarketResearchStore.getState()._syncSummaryStatus();
        }
      } else if (type === TASK_TYPES.MARKET_RESEARCH_SUMMARY) {
        const sessionId = data?.params?.sessionId;
        const idea = data?.params?.idea;
        const storeSessionId = useMarketResearchStore.getState().sessionId;

        if (sessionId && idea) {
          useProfileStore.getState().addAnalysis({
            id: sessionId,
            idea,
            completedAt: Date.now(),
            competitorCount:
              useMarketResearchStore.getState().competitors.length,
          });
        }

        if (sessionId && sessionId === storeSessionId) {
          if (useMarketResearchStore.getState().isAnalysisComplete) return;
          getMarketResearchReport(sessionId)
            .then((response) => {
              const report = response?.data?.report;
              if (report) {
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

      if (taskId) {
        useTaskProgressStore
          .getState()
          .setFailed({ id: taskId, type, domainId, error });
      }

      if (type === TASK_TYPES.MARKET_RESEARCH_INITIAL) {
        const sessionId = data?.params?.sessionId;
        const storeSessionId = useMarketResearchStore.getState().sessionId;
        if (sessionId && sessionId === storeSessionId) {
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
      if (taskId) {
        useTaskProgressStore
          .getState()
          .setCanceled({ id: taskId, type, domainId });
      }
    });

    // ── Market research lifecycle events ─────────────────────────────────

    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_FOUND, (data) => {
      const { sessionId, taskId, competitorId, competitorName, competitorUrl } =
        data;
      const storeSessionId = useMarketResearchStore.getState().sessionId;
      if (sessionId && sessionId === storeSessionId) {
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
      const { sessionId, competitor } = data ?? {};
      const mrStore = useMarketResearchStore.getState();
      if (!sessionId || sessionId !== mrStore.sessionId || !competitor?.id) {
        return;
      }
      mrStore._mergeCompetitorProfile(competitor);
      mrStore._syncSummaryStatus();
    });

    socket.on(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, (data) => {
      const { sessionId } = data ?? {};
      const mrStore = useMarketResearchStore.getState();
      if (!sessionId || sessionId !== mrStore.sessionId) return;
      if (mrStore.isAnalysisComplete) return;
      getMarketResearchReport(sessionId)
        .then((response) => {
          const report = response?.data?.report;
          if (report) {
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
