import config from "../../config.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import {
  TASK_STATUS,
  getProgressFileRelativePath,
  ensureProgressDirectory,
} from "@jfs/agentic-server";
import * as logger from "../../utils/logger.js";
import { generateTaskId } from "../utils.js";

/**
 * Queue a market research initial task.
 * @param {import("@jfs/agentic-server").TaskOrchestrator} orchestrator
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.idea
 * @param {number} [params.numCompetitors]
 * @param {string[]|null} [params.regions]
 * @returns {Promise<Object>} The created task, or { success: false, error, code }
 */
export async function queueMarketResearchInitialTask(
  orchestrator,
  { sessionId, idea, numCompetitors, regions } = {},
) {
  if (!sessionId || !idea) {
    return { success: false, error: "sessionId and idea are required" };
  }

  const taskConfig = config.tasks[TASK_TYPES.MARKET_RESEARCH_INITIAL];
  if (!taskConfig) {
    return {
      success: false,
      error: `No configuration found for task type: ${TASK_TYPES.MARKET_RESEARCH_INITIAL}`,
    };
  }

  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_INITIAL);
  const progressFile = getProgressFileRelativePath(
    taskId,
    config.allowedOutputPrefix,
  );

  const task = {
    id: taskId,
    type: TASK_TYPES.MARKET_RESEARCH_INITIAL,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      sessionId,
      idea,
      numCompetitors,
      regions: regions ?? null,
    },
    agentConfig: {
      agent: taskConfig.agent,
      model: taskConfig.model,
      maxTokens: taskConfig.maxTokens,
      maxIterations: taskConfig.maxIterations ?? 30,
      reasoningEffort: taskConfig.reasoningEffort,
    },
    systemInstructionFile: "market-research-initial.md",
    outputFile: `${config.allowedOutputPrefix}/market-research/${sessionId}/report.json`,
    progressFile,
  };

  await ensureProgressDirectory(config.queueDir, taskId);
  await orchestrator.enqueueTask(task);

  logger.info("Queued market research initial task", {
    component: "MarketResearchInitialQueue",
    taskId,
    sessionId,
  });

  return task;
}
