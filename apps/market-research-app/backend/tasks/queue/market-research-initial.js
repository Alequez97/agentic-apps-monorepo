import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "@jfs/agentic-server";
import * as logger from "../../utils/logger.js";
import { generateTaskId } from "../utils.js";
import config from "../../config.js";

/**
 * Queue a market research initial task.
 * @param {Object} deps
 * @param {Object} deps.queueStore
 * @param {Object} deps.taskProgressStore
 * @param {Object} params
 * @param {string} params.ownerId
 * @param {string} params.sessionId
 * @param {string} params.idea
 * @param {number} [params.numCompetitors]
 * @param {string[]|null} [params.regions]
 * @returns {Promise<Object>} The created task, or { success: false, error, code }
 */
export async function queueMarketResearchInitialTask(
  { queueStore, taskProgressStore },
  { ownerId, sessionId, idea, numCompetitors, regions, billingRunId } = {},
) {
  if (!ownerId || !sessionId || !idea) {
    return {
      success: false,
      error: "ownerId, sessionId, and idea are required",
    };
  }

  const taskConfig = config.tasks[TASK_TYPES.MARKET_RESEARCH_INITIAL];
  if (!taskConfig) {
    return {
      success: false,
      error: `No configuration found for task type: ${TASK_TYPES.MARKET_RESEARCH_INITIAL}`,
    };
  }

  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_INITIAL);

  const task = {
    id: taskId,
    ownerId,
    type: TASK_TYPES.MARKET_RESEARCH_INITIAL,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    params: {
      sessionId,
      idea,
      numCompetitors,
      regions: regions ?? null,
      billingRunId: billingRunId ?? null,
    },
    agentConfig: {
      agent: taskConfig.agent,
      model: taskConfig.model,
      maxTokens: taskConfig.maxTokens,
      maxIterations: taskConfig.maxIterations ?? 30,
      reasoningEffort: taskConfig.reasoningEffort,
    },
    systemInstructionFile: "market-research-initial.md",
  };

  await taskProgressStore.initialize(taskId);
  await queueStore.enqueueTask(task);

  logger.info("Queued market research initial task", {
    component: "MarketResearchInitialQueue",
    taskId,
    sessionId,
    ownerId,
  });

  return task;
}
