import { create } from "zustand";
import api from "../api";

export const useTaskProgressStore = create((set, get) => ({
  /**
   * Map<taskId, {domainId, type, status, stage?, message?, error?, competitorId?, competitorName?, ...}>
   */
  progressByTaskId: new Map(),
  loadingTasks: true,
  timeFilter: "24",

  setPending: (
    taskId,
    {
      domainId,
      type,
      delegatedByTaskId,
      competitorName,
      competitorId,
      competitorUrl,
      agent,
      model,
    },
  ) => {
    set((state) => {
      const existing = state.progressByTaskId.get(taskId);
      if (existing?.status === "running") return state;
      const next = new Map(state.progressByTaskId);
      next.set(taskId, {
        domainId,
        type,
        status: "pending",
        delegatedByTaskId: delegatedByTaskId ?? null,
        competitorName: competitorName ?? null,
        competitorId: competitorId ?? null,
        competitorUrl: competitorUrl ?? null,
        agent: agent ?? existing?.agent ?? null,
        model: model ?? existing?.model ?? null,
        stage: null,
        message: null,
        error: null,
      });
      return { progressByTaskId: next };
    });
  },

  setProgress: (taskId, { domainId, type, stage, message }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(taskId) ?? {};
      next.set(taskId, {
        ...existing,
        domainId,
        type,
        stage,
        message,
        status: "running",
      });
      return { progressByTaskId: next };
    });
  },

  clearProgress: (taskId) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      next.delete(taskId);
      return { progressByTaskId: next };
    });
  },

  setCompleted: ({ id, type, domainId }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        domainId: domainId ?? existing.domainId,
        type: type ?? existing.type,
        status: "completed",
        stage: null,
        message: null,
        error: null,
        delegatedByTaskId: existing.delegatedByTaskId ?? null,
      });
      return { progressByTaskId: next };
    });
  },

  setFailed: ({ id, type, domainId, error }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        domainId: domainId ?? existing.domainId,
        type: type ?? existing.type,
        status: "failed",
        stage: null,
        message: null,
        error,
      });
      return { progressByTaskId: next };
    });
  },

  setCanceled: ({ id, type, domainId }) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        domainId: domainId ?? existing.domainId,
        type: type ?? existing.type,
        status: "canceled",
        stage: null,
        message: null,
        error: null,
      });
      return { progressByTaskId: next };
    });
  },

  dismissFailed: (taskId) => {
    set((state) => {
      const next = new Map(state.progressByTaskId);
      next.delete(taskId);
      return { progressByTaskId: next };
    });
  },

  loadTasks: async (filters = {}) => {
    set({ loadingTasks: true });
    try {
      const { timeFilter } = get();
      const params = { ...filters };

      if (!params.dateFrom && timeFilter !== "all") {
        const hoursAgo = new Date();
        hoursAgo.setHours(hoursAgo.getHours() - Number(timeFilter));
        params.dateFrom = hoursAgo.toISOString();
      }

      if (!params.status) {
        params.status = "pending,running,failed,completed,canceled";
      }

      const res = await api.getTasks(params);
      const tasks = res.data?.tasks ?? [];
      const LIVE_STATUSES = new Set(["running", "pending"]);
      set((state) => {
        const next = new Map();
        for (const [id, entry] of state.progressByTaskId) {
          if (LIVE_STATUSES.has(entry.status)) {
            next.set(id, entry);
          }
        }
        for (const task of tasks) {
          const existing = next.get(task.id);
          if (existing?.status === "running" && task.status !== "running") {
            continue;
          }
          next.set(task.id, {
            domainId: task.params?.domainId ?? task.domainId,
            type: task.type,
            status: task.status,
            error: task.error,
            stage: existing?.stage,
            message: existing?.message,
            delegatedByTaskId: task.params?.delegatedByTaskId ?? null,
            competitorName: task.params?.competitorName ?? null,
            competitorId: task.params?.competitorId ?? null,
            competitorUrl: task.params?.competitorUrl ?? null,
            agent: task.agentConfig?.agent ?? existing?.agent ?? null,
            model: task.agentConfig?.model ?? existing?.model ?? null,
          });
        }
        return { progressByTaskId: next };
      });
    } catch {
      // silently ignore
    } finally {
      set({ loadingTasks: false });
    }
  },

  setTimeFilter: async (timeFilter) => {
    set({ timeFilter });
    await get().loadTasks();
  },

  reset: () => set({ progressByTaskId: new Map() }),
}));
