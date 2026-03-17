import { APP_EVENTS } from "../../constants/app-events.js";
import { SOCKET_EVENTS } from "../../constants/socket-events.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import * as logger from "../../utils/logger.js";

const LOG_EVENT_MAP = {
  [TASK_TYPES.MARKET_RESEARCH_INITIAL]:
    SOCKET_EVENTS.LOG_MARKET_RESEARCH_INITIAL,
  [TASK_TYPES.MARKET_RESEARCH_COMPETITOR]:
    SOCKET_EVENTS.LOG_MARKET_RESEARCH_COMPETITOR,
  [TASK_TYPES.MARKET_RESEARCH_SUMMARY]:
    SOCKET_EVENTS.LOG_MARKET_RESEARCH_SUMMARY,
};

export function registerTaskSocketBridge({ io, getUserRoom, taskEvents, TASK_EVENTS }) {
  function emitToTaskOwner(eventName, task, payload) {
    if (!task?.ownerId) {
      logger.warn("Skipping task socket emit without ownerId", {
        component: "SocketBridge",
        eventName,
        taskId: task?.id ?? null,
      });
      return;
    }

    io.to(getUserRoom(task.ownerId)).emit(eventName, payload);
  }

  function emitToOwner(eventName, ownerId, payload) {
    if (!ownerId) {
      logger.warn("Skipping socket emit without ownerId", {
        component: "SocketBridge",
        eventName,
      });
      return;
    }

    io.to(getUserRoom(ownerId)).emit(eventName, payload);
  }

  taskEvents.on(TASK_EVENTS.QUEUED, ({ task }) => {
    emitToTaskOwner(SOCKET_EVENTS.TASK_QUEUED, task, {
      taskId: task.id,
      type: task.type,
      domainId: task.params?.domainId ?? null,
      competitorName: task.params?.competitorName ?? null,
      competitorId: task.params?.competitorId ?? null,
      competitorUrl: task.params?.competitorUrl ?? null,
      delegatedByTaskId: task.params?.delegatedByTaskId ?? null,
      agent: task.agentConfig?.agent ?? null,
      model: task.agentConfig?.model ?? null,
      params: task.params ?? {},
    });

    if (
      task.type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR &&
      task.params?.competitorId
    ) {
      emitToTaskOwner(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_FOUND, task, {
        sessionId: task.params.sessionId,
        taskId: task.id,
        competitorId: task.params.competitorId,
        competitorName: task.params.competitorName,
        competitorUrl: task.params.competitorUrl,
        competitorDescription: task.params.competitorDescription ?? "",
      });
    }
  });

  taskEvents.on(TASK_EVENTS.STARTED, ({ task }) => {
    emitToTaskOwner(SOCKET_EVENTS.TASK_STARTED, task, {
      taskId: task.id,
      type: task.type,
      params: task.params ?? {},
    });
  });

  taskEvents.on(TASK_EVENTS.PROGRESS, (data) => {
    emitToOwner(
      SOCKET_EVENTS.TASK_PROGRESS,
      data.ownerId ?? data.task?.ownerId,
      {
        taskId: data.taskId,
        type: data.type,
        domainId: data.params?.domainId ?? null,
        stage: data.stage ?? null,
        message: data.message ?? null,
        kind: data.kind ?? "log",
        params: data.params ?? {},
      },
    );

    const logEvent = LOG_EVENT_MAP[data.type];
    if (logEvent && data.kind !== "task_progress" && data.message) {
      emitToOwner(logEvent, data.ownerId ?? data.task?.ownerId, {
        taskId: data.taskId,
        sessionId: data.params?.sessionId,
        log: data.message,
        kind: data.kind,
        stage: data.stage,
      });
    }
  });

  taskEvents.on(TASK_EVENTS.COMPLETED, ({ task }) => {
    emitToTaskOwner(SOCKET_EVENTS.TASK_COMPLETED, task, {
      taskId: task.id,
      type: task.type,
      domainId: task.params?.domainId ?? null,
      params: task.params ?? {},
    });
  });

  taskEvents.on(TASK_EVENTS.FAILED, ({ task, error }) => {
    emitToTaskOwner(SOCKET_EVENTS.TASK_FAILED, task, {
      taskId: task.id,
      type: task.type,
      domainId: task.params?.domainId ?? null,
      error: error ?? "Task failed",
      params: task.params ?? {},
    });
  });

  taskEvents.on(TASK_EVENTS.CANCELED, ({ task }) => {
    emitToTaskOwner(SOCKET_EVENTS.TASK_CANCELED, task, {
      taskId: task.id,
      type: task.type,
      domainId: task.params?.domainId ?? null,
      params: task.params ?? {},
    });
  });

  taskEvents.on(APP_EVENTS.MARKET_RESEARCH_REPORT_READY, (data) => {
    emitToOwner(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, data.ownerId, data);
  });

  taskEvents.on(APP_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED, (data) => {
    emitToOwner(
      SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED,
      data.ownerId,
      data,
    );
  });
}
