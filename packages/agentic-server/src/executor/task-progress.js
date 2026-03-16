import fs from "fs/promises";
import path from "path";
import * as logger from "../utils/logger.js";

/**
 * Get the relative path (from queueDir) for a task's progress file.
 * Lives in temp/progress/ inside the analysis root so the LLM agent can write to it.
 * Deleted on successful completion or cancellation; kept on failure for debugging.
 * @param {string} taskId
 * @param {string} outputPrefix - The output directory prefix (e.g. ".market-research")
 */
export function getProgressFileRelativePath(taskId, outputPrefix) {
  return `${outputPrefix}/temp/progress/${taskId}.md`;
}

/**
 * Ensure the progress directory exists so the model can write its own progress file.
 * @param {string} queueDir - The analysis root directory
 * @param {string} taskId
 * @returns {Promise<string>} The absolute file path the model should write to
 */
export async function ensureProgressDirectory(queueDir, taskId) {
  const filePath = path.join(queueDir, "temp", "progress", `${taskId}.md`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  logger.debug(`Progress directory ready for task ${taskId}`, {
    component: "TaskProgress",
    filePath,
  });
  return filePath;
}

/**
 * Delete the progress file for a task (cleanup after success or cancellation).
 * @param {string} queueDir - The analysis root directory
 * @param {string} taskId
 */
export async function deleteProgressFile(queueDir, taskId) {
  const filePath = path.join(queueDir, "temp", "progress", `${taskId}.md`);
  try {
    await fs.unlink(filePath);
    logger.debug(`Deleted progress file for task ${taskId}`, {
      component: "TaskProgress",
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.warn(`Failed to delete progress file for task ${taskId}`, {
        error: error.message,
        component: "TaskProgress",
      });
    }
  }
}
