import config from "../../config.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "@jfs/agentic-server";
import * as logger from "../../utils/logger.js";
import { generateTaskId } from "../utils.js";

/**
 * Queue a market research competitor sub-task.
 * @param {Object} deps
 * @param {Object} deps.queueStore
 * @param {Object} deps.taskProgressStore
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.competitorId - kebab-case identifier (e.g. "stripe")
 * @param {string} params.competitorName
 * @param {string} params.competitorUrl
 * @param {string} [params.competitorDescription]
 * @param {string} [params.competitorBriefing]
 * @param {string} [params.delegatedByTaskId]
 * @returns {Promise<Object>} The created task, or { success: false, error }
 */
export async function queueMarketResearchCompetitorTask(
  { queueStore, taskProgressStore },
  {
    sessionId,
    competitorId,
    competitorName,
    competitorUrl,
    competitorDescription,
    competitorBriefing,
    delegatedByTaskId = null,
  } = {},
) {
  if (!sessionId || !competitorId || !competitorName || !competitorUrl) {
    return {
      success: false,
      error:
        "sessionId, competitorId, competitorName, and competitorUrl are required",
    };
  }

  const taskConfig = config.tasks[TASK_TYPES.MARKET_RESEARCH_COMPETITOR];
  if (!taskConfig) {
    return {
      success: false,
      error: `No configuration found for task type: ${TASK_TYPES.MARKET_RESEARCH_COMPETITOR}`,
    };
  }

  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_COMPETITOR);
  const progressFile = taskProgressStore.getProgressLocation(taskId);

  const task = {
    id: taskId,
    type: TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      sessionId,
      competitorId,
      competitorName,
      competitorUrl,
      competitorDescription: competitorDescription || "",
      ...(competitorBriefing && { competitorBriefing }),
      ...(delegatedByTaskId && { delegatedByTaskId }),
    },
    agentConfig: {
      agent: taskConfig.agent,
      model: taskConfig.model,
      maxTokens: taskConfig.maxTokens,
      maxIterations: taskConfig.maxIterations ?? 30,
      reasoningEffort: taskConfig.reasoningEffort,
    },
    systemInstructionFile: "market-research-competitor.md",
    outputFile: `${config.allowedOutputPrefix}/market-research/${sessionId}/competitors/${competitorId}.json`,
    progressFile,
  };

  await taskProgressStore.initialize(taskId);
  await queueStore.enqueueTask(task);

  logger.info("Queued market research competitor task", {
    component: "MarketResearchCompetitorQueue",
    taskId,
    sessionId,
    competitorId,
  });

  return task;
}
