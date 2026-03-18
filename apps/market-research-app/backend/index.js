import "dotenv/config";
import { EventEmitter } from "events";
import express from "express";
import { createServer } from "http";
import {
  TaskOrchestrator,
  createQueueProcessor,
  LLMTaskRunner,
  TASK_EVENTS,
  assertTaskProgressStoreContract,
  assertTaskEventPublisherContract,
  assertTaskSchedulerContract,
} from "@jfs/agentic-server";
import config from "./config.js";
import { createTaskHandlersByType } from "./tasks/handlers/index.js";
import { queueMarketResearchCompetitorTask } from "./tasks/queue/market-research-competitor.js";
import { queueMarketResearchInitialTask } from "./tasks/queue/market-research-initial.js";
import { queueMarketResearchSummaryTask } from "./tasks/queue/market-research-summary.js";
import { startCleanupJob } from "./utils/market-research-cleanup.js";
import * as logger from "./utils/logger.js";
import { createTaskRuntime } from "./infrastructure/runtime/create-task-runtime.js";
import { createAppRepositories } from "./infrastructure/persistence/create-app-repositories.js";
import { createSubscriptionService } from "./services/subscription.js";
import { createSocketServer } from "./infrastructure/http/create-socket-server.js";
import { registerTaskSocketBridge } from "./infrastructure/http/register-task-socket-bridge.js";
import { TASK_TYPES } from "./constants/task-types.js";
import { createHttpApp } from "./app.js";

const app = express();
const httpServer = createServer(app);
const { io, isAllowedOrigin, getUserRoom } = createSocketServer({
  httpServer,
  config,
});

// ==================== Orchestrator ====================

const { queueStore, taskProgressStore } = await createTaskRuntime({ config });
const { marketResearchRepository, userRepository, subscriptionRepository } =
  await createAppRepositories({
    config,
  });
const subscriptionService = createSubscriptionService({
  subscriptionRepository,
});

const taskEvents = new EventEmitter();
const taskEventPublisher = {
  publish: (eventName, payload) => taskEvents.emit(eventName, payload),
};

assertTaskProgressStoreContract(taskProgressStore);
assertTaskEventPublisherContract(taskEventPublisher);

const taskRunner = new LLMTaskRunner({
  apiKeys: config.apiKeys,
  workingDirectory: config.workingDirectory,
  allowedOutputPrefix: config.allowedOutputPrefix,
  logsDir: `${config.queueDir}/logs`,
});

const taskQueue = {
  queueMarketResearchInitialTask: (params) =>
    queueMarketResearchInitialTask({ queueStore, taskProgressStore }, params),
  queueMarketResearchCompetitorTask: (params) =>
    queueMarketResearchCompetitorTask({ queueStore, taskProgressStore }, params),
  queueMarketResearchSummaryTask: (params) =>
    queueMarketResearchSummaryTask({ queueStore, taskProgressStore }, params),
};
assertTaskSchedulerContract(taskQueue, [
  "queueMarketResearchInitialTask",
  "queueMarketResearchCompetitorTask",
  "queueMarketResearchSummaryTask",
]);

const taskHandlersByType = createTaskHandlersByType({
  taskScheduler: taskQueue,
  taskEventPublisher,
  marketResearchRepository,
  subscriptionService,
});

const orchestrator = new TaskOrchestrator({
  resolveTaskHandler: (task) => taskHandlersByType[task.type],
  queueStore,
  taskRunner,
  taskProgressStore,
  taskEventPublisher,
});

const queueProcessor = createQueueProcessor({
  queueStore,
  taskOrchestrator: orchestrator,
});

registerTaskSocketBridge({
  io,
  getUserRoom,
  taskEvents,
  TASK_EVENTS,
});

taskEvents.on(TASK_EVENTS.FAILED, async ({ task, error }) => {
  const sessionId = task?.params?.sessionId;
  if (
    !sessionId ||
    ![
      TASK_TYPES.MARKET_RESEARCH_INITIAL,
      TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
      TASK_TYPES.MARKET_RESEARCH_SUMMARY,
    ].includes(task?.type)
  ) {
    return;
  }

  try {
    await marketResearchRepository.markSessionFailed(sessionId, error);
  } catch (persistError) {
    logger.warn("Failed to persist failed market research session state", {
      component: "Server",
      sessionId,
      taskId: task?.id,
      error: persistError.message,
    });
  }
});

createHttpApp({
  app,
  isAllowedOrigin,
  taskQueue,
  marketResearchRepository,
  subscriptionService,
  userRepository,
  orchestrator,
});

// ==================== Start ====================

const PORT = config.port;

httpServer.listen(PORT, async () => {
  logger.info(`Market Research Backend listening on port ${PORT}`, {
    component: "Server",
    port: PORT,
    dataDir: config.dataDir,
  });

  try {
    await orchestrator.recoverOrphanedTasks();
    logger.info("Orphaned task recovery complete", { component: "Server" });
  } catch (error) {
    logger.warn("Orphaned task recovery failed (non-fatal)", {
      component: "Server",
      error: error.message,
    });
  }

  startCleanupJob({ marketResearchRepository });
  queueProcessor.start();

  logger.info("Queue processor started", { component: "Server" });
});
