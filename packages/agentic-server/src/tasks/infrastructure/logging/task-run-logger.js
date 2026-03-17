import fs from "fs/promises";
import path from "path";
import * as logger from "../../../utils/logger.js";
import { TASK_EVENTS } from "../../constants/task-events.js";

export async function setupTaskLogger(task, { logsDir, emitEvent }) {
  await fs.mkdir(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `${task.id}.log`);

  const fsSync = await import("fs");
  const logStream = fsSync.default.createWriteStream(logFile, { flags: "w" });
  const taskLogger = logger.createLogger([logStream]);

  taskLogger.log = (message, { publicLogText, kind } = {}) => {
    if (emitEvent && publicLogText) {
      emitEvent(TASK_EVENTS.PROGRESS, {
        taskId: task.id,
        ownerId: task.ownerId ?? null,
        type: task.type,
        params: task.params,
        message: publicLogText,
        kind: kind || "log",
        stage: null,
      });
    }
  };

  taskLogger.progress = (message, options = {}) => {
    const {
      stage = null,
      publicLogText,
      kind = "task_progress",
      level = "info",
    } = options && typeof options === "object" ? options : {};

    const logMethod =
      typeof taskLogger[level] === "function"
        ? taskLogger[level]
        : taskLogger.info;
    logMethod(message);

    if (emitEvent && publicLogText) {
      emitEvent(TASK_EVENTS.PROGRESS, {
        taskId: task.id,
        ownerId: task.ownerId ?? null,
        type: task.type,
        params: task.params,
        message: publicLogText,
        kind,
        stage,
      });
    } else if (emitEvent && stage) {
      emitEvent(TASK_EVENTS.PROGRESS, {
        taskId: task.id,
        ownerId: task.ownerId ?? null,
        type: task.type,
        params: task.params,
        message,
        kind,
        stage,
      });
    }
  };

  return { taskLogger, logStream };
}

export function logTaskHeader(taskLogger, task, workingDirectory) {
  const agentConfig = task.agentConfig || {};
  taskLogger.raw?.("=".repeat(80));
  taskLogger.info(`STARTING ${task.type.toUpperCase()} TASK`, {
    taskId: task.id,
  });
  taskLogger.info(`Type:              ${task.type}`);
  taskLogger.info(`Agent:             ${agentConfig.agent || "unknown"}`);
  taskLogger.info(`Model:             ${agentConfig.model || "unknown"}`);
  if (agentConfig.reasoningEffort) {
    taskLogger.info(`Reasoning effort:  ${agentConfig.reasoningEffort}`);
  }
  taskLogger.info(
    `Max tokens:        ${agentConfig.maxTokens ?? "default"}`,
  );
  taskLogger.info(
    `Max iterations:    ${agentConfig.maxIterations ?? "default"}`,
  );
  if (task.params?.domainId) {
    taskLogger.info(`Domain:            ${task.params.domainId}`);
  }
  if (Array.isArray(task.params?.files) && task.params.files.length > 0) {
    taskLogger.info(
      `Files (${task.params.files.length}):        ${task.params.files.join(", ")}`,
    );
  }
  if (task.outputFile) {
    taskLogger.info(`Output:            ${task.outputFile}`);
  }
  if (workingDirectory) {
    taskLogger.info(`Target:            ${workingDirectory}`);
  }
  taskLogger.raw?.("=".repeat(80));
  taskLogger.raw?.("");
}

export function logTaskSuccess(taskLogger, task, agent) {
  const metadata = agent.getMetadata?.();
  taskLogger.raw?.("");
  taskLogger.raw?.("=".repeat(80));
  taskLogger.info("TASK COMPLETED SUCCESSFULLY", { taskId: task.id });
  if (metadata) {
    taskLogger.info(`Iterations: ${metadata.iterations}`);
    taskLogger.info(
      `Tokens: ${metadata.tokenUsage.total.toLocaleString()} (${metadata.tokenUsage.input.toLocaleString()} in / ${metadata.tokenUsage.output.toLocaleString()} out)`,
    );
  }
  taskLogger.raw?.("=".repeat(80));
}

export function logTaskError(taskLogger, task, error) {
  taskLogger.raw?.("");
  taskLogger.raw?.("=".repeat(80));
  taskLogger.error("TASK FAILED", {
    error: error.message,
    stack: error.stack,
    taskId: task.id,
  });
  taskLogger.raw?.("=".repeat(80));
}
