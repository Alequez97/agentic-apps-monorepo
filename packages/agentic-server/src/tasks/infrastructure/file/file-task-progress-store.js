import fs from "fs/promises";
import path from "path";
import * as logger from "../../../utils/logger.js";

function getProgressFileRelativePath(taskId, outputPrefix) {
  return `${outputPrefix}/temp/progress/${taskId}.md`;
}

async function ensureProgressDirectory(queueDir, taskId) {
  const filePath = path.join(queueDir, "temp", "progress", `${taskId}.md`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  logger.debug(`Progress directory ready for task ${taskId}`, {
    component: "FileTaskProgressStore",
    filePath,
  });
  return filePath;
}

async function deleteProgressFile(queueDir, taskId) {
  const filePath = path.join(queueDir, "temp", "progress", `${taskId}.md`);
  try {
    await fs.unlink(filePath);
    logger.debug(`Deleted progress file for task ${taskId}`, {
      component: "FileTaskProgressStore",
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger.warn(`Failed to delete progress file for task ${taskId}`, {
        error: error.message,
        component: "FileTaskProgressStore",
      });
    }
  }
}

export function createFileTaskProgressStore({ queueDir, outputPrefix }) {
  return {
    getProgressLocation: (taskId) =>
      getProgressFileRelativePath(taskId, outputPrefix),
    initialize: (taskId) => ensureProgressDirectory(queueDir, taskId),
    clear: (taskId) => deleteProgressFile(queueDir, taskId),
  };
}

export {
  getProgressFileRelativePath as getProgressLocation,
  ensureProgressDirectory as initializeTaskProgress,
  deleteProgressFile as clearTaskProgress,
};
