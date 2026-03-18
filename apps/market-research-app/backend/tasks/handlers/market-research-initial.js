import * as logger from "../../utils/logger.js";
import { buildMarketResearchHandler } from "./market-research-handler-common.js";

export function marketResearchInitialHandler(
  task,
  taskLogger,
  agent,
  { taskScheduler, marketResearchRepository, subscriptionService },
) {
  const { sessionId, idea, billingRunId } = task.params || {};

  const initialMessage =
    "Research the startup idea and identify competitors to delegate to specialist agents as specified in the instructions.";

  const onComplete = async () => {
    let competitorTasks;
    let report;

    try {
      competitorTasks = await marketResearchRepository.getCompetitorTasks(sessionId);
      report = await marketResearchRepository.getReport(sessionId);
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

    await subscriptionService.chargeCredits(task.ownerId, {
      amount: 1,
      eventKey: `market-research:${sessionId}:${billingRunId || "default"}:competitors`,
      reason: "market-research-competitors",
      sessionId,
    });

    const reportSession = await marketResearchRepository.getSession(sessionId);
    if (reportSession) {
      await marketResearchRepository.upsertSession(
        sessionId,
        reportSession.idea || report.idea || idea,
        {
          ...(reportSession.state || {}),
          credits: {
            ...(reportSession.state?.credits || {}),
            competitors: {
              charged: true,
              amount: 1,
              chargedAt: Date.now(),
            },
          },
        },
        reportSession.ownerId,
      );
    }

    const queuedSummaryTask = await taskScheduler.queueMarketResearchSummaryTask({
      ownerId: task.ownerId,
      sessionId,
      idea: report.idea || idea,
      regions: task.params?.regions ?? null,
      dependsOn: competitorTasks.map((entry) => entry.taskId).filter(Boolean),
      billingRunId: billingRunId ?? null,
    });

    if (queuedSummaryTask?.success === false) {
      const error = new Error(queuedSummaryTask.error || "Could not enqueue summary task");
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
