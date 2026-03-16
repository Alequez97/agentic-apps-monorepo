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
 * Queue a market research summary task.
 * @param {import("@jfs/agentic-server").TaskOrchestrator} orchestrator
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.idea
 * @param {string[]} [params.dependsOn] - task IDs this task depends on
 * @returns {Promise<Object>} The created task, or { success: false, error }
 */
export async function queueMarketResearchSummaryTask(
  orchestrator,
  { sessionId, idea, dependsOn } = {},
) {
  if (!sessionId || !idea) {
    return { success: false, error: "sessionId and idea are required" };
  }

  const taskConfig = config.tasks[TASK_TYPES.MARKET_RESEARCH_SUMMARY];
  if (!taskConfig) {
    return {
      success: false,
      error: `No configuration found for task type: ${TASK_TYPES.MARKET_RESEARCH_SUMMARY}`,
    };
  }

  const taskId = generateTaskId(TASK_TYPES.MARKET_RESEARCH_SUMMARY);
  const progressFile = getProgressFileRelativePath(
    taskId,
    config.allowedOutputPrefix,
  );

  const task = {
    id: taskId,
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
    outputFile: `market-research/${sessionId}/opportunity.json`,
    progressFile,
  };

  await ensureProgressDirectory(config.queueDir, taskId);
  await orchestrator.enqueueTask(task);

  logger.info("Queued market research summary task", {
    component: "MarketResearchSummaryQueue",
    taskId,
    sessionId,
    dependencyCount: task.dependsOn.length,
  });

  return task;
}
