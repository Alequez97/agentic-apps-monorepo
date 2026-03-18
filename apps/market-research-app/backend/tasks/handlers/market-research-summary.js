import { PROGRESS_STAGES } from "@jfs/llm-core";
import { APP_EVENTS } from "../../constants/app-events.js";
import * as logger from "../../utils/logger.js";
import { buildMarketResearchHandler } from "./market-research-handler-common.js";

export async function marketResearchSummaryHandler(
  task,
  taskLogger,
  agent,
  { taskEventPublisher, marketResearchRepository, subscriptionService },
) {
  const { sessionId, idea, billingRunId } = task.params || {};

  const competitorTasks = await marketResearchRepository.getCompetitorTasks(sessionId);
  if (!Array.isArray(competitorTasks) || competitorTasks.length === 0) {
    throw new Error("competitor-tasks.json is empty or invalid");
  }

  const competitors = await marketResearchRepository.getCompetitorProfiles(
    sessionId,
    competitorTasks.map((entry) => entry.competitorId).filter(Boolean),
  );

  const competitorProfilesJson = JSON.stringify(competitors, null, 2);
  const initialMessage = [
    "Read the competitor profiles below and produce an honest market verdict.",
    "",
    `Idea: ${idea}`,
    `Session ID: ${sessionId}`,
    "",
    "Competitor profiles JSON:",
    competitorProfilesJson,
  ].join("\n");

  const onStart = () => {
    taskLogger.progress("Summarizing market opportunity...", {
      stage: PROGRESS_STAGES.ANALYZING,
    });
  };

  const onComplete = async () => {
    try {
      const [report, opportunity] = await Promise.all([
        marketResearchRepository.getReport(sessionId),
        marketResearchRepository.getOpportunity(sessionId),
      ]);

      if (!report) throw new Error("report.json is empty or invalid");
      if (
        !opportunity ||
        typeof opportunity !== "object" ||
        Object.keys(opportunity).length === 0
      ) {
        throw new Error("opportunity is empty or invalid");
      }

      // Load profiles keyed by plan IDs — handles broken/empty competitorTasks entries
      const plannedIds = (report.competitors || []).map((c) => c.id).filter(Boolean);
      const allProfiles = await marketResearchRepository.getCompetitorProfiles(
        sessionId,
        plannedIds,
      );
      const profileById = new Map(allProfiles.map((c) => [c.id, c]));

      // Validate every planned competitor has a real (non-stub) profile BEFORE charging
      const incompleteIds = plannedIds.filter((id) => {
        const p = profileById.get(id);
        return !p || !p.description;
      });
      if (incompleteIds.length > 0) {
        throw new Error(
          `Competitor analysis incomplete for: ${incompleteIds.join(", ")}. Re-run to complete missing profiles.`,
        );
      }

      const mergedCompetitors = (report.competitors || []).map((stub) => {
        const full = profileById.get(stub.id);
        return full ? { ...stub, ...full } : stub;
      });

      const mergedIds = new Set(mergedCompetitors.map((competitor) => competitor.id));
      for (const profile of allProfiles) {
        if (!mergedIds.has(profile.id)) {
          mergedCompetitors.push(profile);
        }
      }

      const completedReport = {
        ...report,
        competitors: mergedCompetitors,
        opportunity,
        status: "complete",
        completedAt: new Date().toISOString(),
      };

      await marketResearchRepository.saveReport(sessionId, completedReport);
      await subscriptionService.chargeCredits(task.ownerId, {
        amount: 1,
        eventKey: `market-research:${sessionId}:${billingRunId || "default"}:summary`,
        reason: "market-research-summary",
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
              summary: {
                charged: true,
                amount: 1,
                chargedAt: Date.now(),
              },
            },
          },
          reportSession.ownerId,
        );
      }

      await marketResearchRepository.markSessionComplete(sessionId, mergedCompetitors.length);

      taskEventPublisher.publish(APP_EVENTS.MARKET_RESEARCH_REPORT_READY, {
        ownerId: task.ownerId,
        sessionId,
        taskId: task.id,
      });
    } catch (error) {
      logger.error("Failed to assemble market research report", {
        component: "MarketResearchSummary",
        sessionId,
        taskId: task.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };

  return buildMarketResearchHandler(
    taskLogger,
    initialMessage,
    "Preparing market summary...",
    onComplete,
    { onStart },
  );
}
