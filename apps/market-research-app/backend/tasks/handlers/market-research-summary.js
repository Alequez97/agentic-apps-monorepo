import fs from "fs/promises";
import { PROGRESS_STAGES } from "@jfs/llm-core";
import { tryReadJsonFile } from "@jfs/agentic-server";
import { APP_EVENTS } from "../../constants/app-events.js";
import * as marketResearchPersistence from "../../persistence/market-research.js";
import * as logger from "../../utils/logger.js";
import { buildMarketResearchHandler } from "./market-research-handler-common.js";

export async function marketResearchSummaryHandler(
  task,
  taskLogger,
  agent,
  { taskEventPublisher },
) {
  const { sessionId, idea } = task.params || {};

  const competitorTasks = await tryReadJsonFile(
    marketResearchPersistence.getMarketResearchCompetitorTasksPath(sessionId),
    `${sessionId} competitor tasks`,
  );
  if (!Array.isArray(competitorTasks) || competitorTasks.length === 0) {
    throw new Error("competitor-tasks.json is empty or invalid");
  }

  const competitors = await marketResearchPersistence.getCompetitorProfiles(
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
    "",
    `Write the result to: market-research/${sessionId}/opportunity.json`,
  ].join("\n");

  const onStart = () => {
    taskLogger.progress("Summarizing market opportunity...", {
      stage: PROGRESS_STAGES.ANALYZING,
    });
  };

  const onComplete = async () => {
    try {
      const [report, opportunity] = await Promise.all([
        tryReadJsonFile(
          marketResearchPersistence.getMarketResearchReportPath(sessionId),
          `${sessionId} report`,
        ),
        tryReadJsonFile(
          marketResearchPersistence.getMarketResearchOpportunityPath(sessionId),
          `${sessionId} opportunity`,
        ),
      ]);

      if (!report) throw new Error("report.json is empty or invalid");
      if (!opportunity) throw new Error("opportunity.json is empty or invalid");

      const competitorMap = new Map(
        competitors.map((competitor) => [competitor.id, competitor]),
      );

      const mergedCompetitors = (report.competitors || []).map((stub) => {
        const full = competitorMap.get(stub.id);
        return full ? { ...stub, ...full } : stub;
      });

      const mergedIds = new Set(
        mergedCompetitors.map((competitor) => competitor.id),
      );
      for (const competitor of competitors) {
        if (!mergedIds.has(competitor.id)) {
          mergedCompetitors.push(competitor);
        }
      }

      const completedReport = {
        ...report,
        competitors: mergedCompetitors,
        opportunity,
        status: "complete",
        completedAt: new Date().toISOString(),
      };

      await fs.mkdir(
        marketResearchPersistence.getMarketResearchSessionDir(sessionId),
        { recursive: true },
      );
      await fs.writeFile(
        marketResearchPersistence.getMarketResearchReportPath(sessionId),
        JSON.stringify(completedReport, null, 2),
        "utf-8",
      );

      await marketResearchPersistence.markSessionComplete(
        sessionId,
        mergedCompetitors.length,
      );

      taskEventPublisher.publish(APP_EVENTS.MARKET_RESEARCH_REPORT_READY, {
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
