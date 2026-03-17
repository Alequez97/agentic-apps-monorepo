import { tryReadJsonFile } from "@jfs/agentic-server";
import * as marketResearchPersistence from "../../persistence/market-research.js";
import * as logger from "../../utils/logger.js";
import { buildMarketResearchHandler } from "./market-research-handler-common.js";

export function marketResearchInitialHandler(
  task,
  taskLogger,
  agent,
  { taskScheduler },
) {
  const { sessionId, idea } = task.params || {};

  const initialMessage =
    "Research the startup idea and identify competitors to delegate to specialist agents as specified in the instructions.";

  const onComplete = async () => {
    let competitorTasks;
    let report;

    try {
      competitorTasks = await tryReadJsonFile(
        marketResearchPersistence.getMarketResearchCompetitorTasksPath(
          sessionId,
        ),
        `${sessionId} competitor tasks`,
      );
      report = await tryReadJsonFile(
        marketResearchPersistence.getMarketResearchReportPath(sessionId),
        `${sessionId} report`,
      );
    } catch (error) {
      logger.warn("Failed to queue market research summary task", {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
        error: error.message,
      });
      throw error;
    }

    if (!report) {
      const error = new Error("report.json is empty or invalid");
      logger.warn(error.message, {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
      });
      throw error;
    }

    if (!Array.isArray(competitorTasks) || competitorTasks.length === 0) {
      const error = new Error("competitor-tasks.json is empty or invalid");
      logger.warn(error.message, {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
      });
      throw error;
    }

    const queuedSummaryTask = await taskScheduler.queueMarketResearchSummaryTask(
      {
        sessionId,
        idea: report.idea || idea,
        dependsOn: competitorTasks.map((entry) => entry.taskId).filter(Boolean),
      },
    );

    if (queuedSummaryTask?.success === false) {
      const error = new Error(
        queuedSummaryTask.error || "Could not enqueue summary task",
      );
      logger.error(error.message, {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
        error: queuedSummaryTask.error,
      });
      throw error;
    }

    taskLogger.info(
      `Queued summary task ${queuedSummaryTask.id} waiting on ${competitorTasks.length} competitor task(s)`,
    );
  };

  return buildMarketResearchHandler(
    taskLogger,
    initialMessage,
    "Identifying competitors...",
    onComplete,
  );
}
