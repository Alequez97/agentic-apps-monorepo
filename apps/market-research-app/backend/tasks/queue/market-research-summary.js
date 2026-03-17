import { TASK_TYPES } from "../../constants/task-types.js";
import { TASK_STATUS } from "@jfs/agentic-server";
import * as logger from "../../utils/logger.js";
import { generateTaskId } from "../utils.js";
import config from "../../config.js";

/**
 * Queue a market research summary task.
 * @param {Object} deps
 * @param {Object} deps.queueStore
 * @param {Object} deps.taskProgressStore
 * @param {Object} params
 * @param {string} params.ownerId
 * @param {string} params.sessionId
 * @param {string} params.idea
 * @param {string[]} [params.dependsOn] - task IDs this task depends on
 * @returns {Promise<Object>} The created task, or { success: false, error }
 */
export async function queueMarketResearchSummaryTask(
  { queueStore, taskProgressStore },
  { ownerId, sessionId, idea, dependsOn } = {},
) {
  if (!ownerId || !sessionId || !idea) {
    return {
      success: false,
      error: "ownerId, sessionId, and idea are required",
    };
  }

  const taskConfig = config.tasks[TASK_TYPES.MARKET_RESEARCH_SUMMARY];
  if (!taskConfig) {
    return {
      success: false,
      error: `No configuration found for task type: ${TASK_TYPES.MARKET_RESEARCH_SUMMARY}`,
    };
  }

  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_SUMMARY);

  const task = {
    id: taskId,
    ownerId,
    type: TASK_TYPES.MARKET_RESEARCH_SUMMARY,
    status: TASK_STATUS.PENDING,
    createdAt: new Date().toISOString(),
    dependsOn: Array.isArray(dependsOn) ? dependsOn : [],
    params: {
      sessionId,
      idea,
    },
    agentConfig: {
      agent: taskConfig.agent,
      model: taskConfig.model,
      maxTokens: taskConfig.maxTokens,
      maxIterations: taskConfig.maxIterations ?? 5,
      reasoningEffort: taskConfig.reasoningEffort,
    },
    systemInstructionFile: "market-research-summary.md",
  };

  await taskProgressStore.initialize(taskId);
  await queueStore.enqueueTask(task);

  logger.info("Queued market research summary task", {
    component: "MarketResearchSummaryQueue",
    taskId,
    sessionId,
    dependencyCount: task.dependsOn.length,
    ownerId,
  });

  return task;
}
