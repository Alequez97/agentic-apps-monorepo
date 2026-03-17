import { APP_EVENTS } from "../../constants/app-events.js";
import * as logger from "../../utils/logger.js";
import { buildMarketResearchHandler } from "./market-research-handler-common.js";

export function marketResearchCompetitorHandler(
  task,
  taskLogger,
  agent,
  { taskEventPublisher, marketResearchRepository },
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
  ]
    .filter(Boolean)
    .join("\n");

  const onComplete = async () => {
    try {
      const competitor = await marketResearchRepository.getCompetitorProfile(
        sessionId,
        competitorId,
      );
      if (!competitor) {
        throw new Error("Competitor profile is empty or invalid");
      }

      taskEventPublisher.publish(APP_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED, {
        ownerId: task.ownerId,
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
