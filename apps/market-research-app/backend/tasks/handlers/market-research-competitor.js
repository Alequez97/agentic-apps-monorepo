import { tryReadJsonFile } from "@jfs/agentic-server";
import { APP_EVENTS } from "../../constants/app-events.js";
import * as marketResearchPersistence from "../../persistence/market-research.js";
import * as logger from "../../utils/logger.js";
import { buildMarketResearchHandler } from "./market-research-handler-common.js";

export function marketResearchCompetitorHandler(
  task,
  taskLogger,
  agent,
  { taskEventPublisher },
) {
  const {
    sessionId,
    competitorId,
    competitorName,
    competitorUrl,
    competitorDescription,
  } = task.params || {};

  const initialMessage = [
    "Research the following competitor and produce a detailed profile.",
    "",
    `Competitor: ${competitorName}`,
    `Website: ${competitorUrl}`,
    competitorDescription ? `Description: ${competitorDescription}` : null,
    "",
    `Session ID: ${sessionId}`,
    `Competitor ID: ${competitorId}`,
    "",
    `Write the complete profile JSON to: market-research/${sessionId}/competitors/${competitorId}.json`,
  ]
    .filter(Boolean)
    .join("\n");

  const onComplete = async () => {
    const competitorPath =
      marketResearchPersistence.getMarketResearchCompetitorProfilePath(
        sessionId,
        competitorId,
      );

    try {
      const competitor = await tryReadJsonFile(competitorPath, competitorId);
      if (!competitor) {
        throw new Error("Competitor profile is empty or invalid");
      }

      taskEventPublisher.publish(APP_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED, {
        sessionId,
        taskId: task.id,
        competitor,
      });
    } catch (error) {
      logger.warn("Failed to emit completed competitor payload", {
        component: "MarketResearchCompetitor",
        sessionId,
        taskId: task.id,
        competitorId,
        error: error.message,
      });
    }
  };

  return buildMarketResearchHandler(
    taskLogger,
    initialMessage,
    `Researching ${competitorName}...`,
    onComplete,
  );
}
