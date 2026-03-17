import fs from "fs/promises";
import path from "path";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { tryReadJsonFile } from "../../../persistence/utils.js";
import { TASK_STATUS, TASK_FOLDERS } from "../../constants/task-status.js";
import * as logger from "../../../utils/logger.js";

function taskPath(queueDir, folder, taskId) {
  return path.join(queueDir, "tasks", folder, `${taskId}.json`);
}

async function readTask(queueDir, taskId) {
  const folders = Object.values(TASK_FOLDERS);
  for (const folder of folders) {
    try {
      const task = await tryReadJsonFile(
        taskPath(queueDir, folder, taskId),
        `task ${taskId}`,
      );
      if (task) return task;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function enqueueTask(queueDir, task) {
  if (!task.logFile) {
    task.logFile = `logs/${task.id}.log`;
  }
  const filePath = taskPath(queueDir, TASK_FOLDERS.PENDING, task.id);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(task, null, 2), "utf-8");
}

async function listTasksInFolder(queueDir, folder) {
  try {
    const tasksDir = path.join(queueDir, "tasks", folder);
    const files = await fs.readdir(tasksDir);
    const tasks = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (file) => {
          const content = await fs.readFile(path.join(tasksDir, file), "utf-8");
          return JSON.parse(content);
        }),
    );
    return tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function listPending(queueDir) {
  return listTasksInFolder(queueDir, TASK_FOLDERS.PENDING);
}

async function listRunning(queueDir) {
  return listTasksInFolder(queueDir, TASK_FOLDERS.RUNNING);
}

async function listTasks(queueDir, filters = {}) {
  const { dateFrom, dateTo, status } = filters;
  const foldersToSearch =
    status && status.length > 0
      ? status.map((s) => TASK_FOLDERS[s.toUpperCase()])
      : Object.values(TASK_FOLDERS);

  const allTasks = await Promise.all(
    foldersToSearch.map((folder) => listTasksInFolder(queueDir, folder)),
  );
  let tasks = allTasks.flat();

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    tasks = tasks.filter((t) => new Date(t.createdAt) >= fromDate);
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    tasks = tasks.filter((t) => new Date(t.createdAt) <= toDate);
  }

  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function moveToRunning(queueDir, taskId) {
  const pendingFilePath = taskPath(queueDir, TASK_FOLDERS.PENDING, taskId);
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);

  const content = await fs.readFile(pendingFilePath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.RUNNING;
  task.startedAt = new Date().toISOString();

  await fs.mkdir(path.dirname(runningFilePath), { recursive: true });
  await fs.writeFile(runningFilePath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(pendingFilePath);

  return task;
}

async function moveToCompleted(queueDir, taskId) {
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);
  const completedFilePath = taskPath(queueDir, TASK_FOLDERS.COMPLETED, taskId);

  const content = await fs.readFile(runningFilePath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.COMPLETED;
  task.completedAt = new Date().toISOString();

  await fs.mkdir(path.dirname(completedFilePath), { recursive: true });
  await fs.writeFile(completedFilePath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(runningFilePath);

  return task;
}

async function moveToFailed(queueDir, taskId, error) {
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);
  const pendingFilePath = taskPath(queueDir, TASK_FOLDERS.PENDING, taskId);
  const failedFilePath = taskPath(queueDir, TASK_FOLDERS.FAILED, taskId);

  await fs.mkdir(path.dirname(failedFilePath), { recursive: true });

  let sourcePath = runningFilePath;
  try {
    await fs.access(runningFilePath);
  } catch {
    sourcePath = pendingFilePath;
  }

  const content = await fs.readFile(sourcePath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.FAILED;
  task.failedAt = new Date().toISOString();
  task.error = error || "Task execution failed";

  await fs.writeFile(failedFilePath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(sourcePath);

  return task;
}

async function moveToCanceled(queueDir, taskId) {
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);
  const pendingFilePath = taskPath(queueDir, TASK_FOLDERS.PENDING, taskId);
  const canceledFilePath = taskPath(queueDir, TASK_FOLDERS.CANCELED, taskId);

  let sourcePath = null;
  let task = null;

  for (const p of [runningFilePath, pendingFilePath]) {
    try {
      const content = await fs.readFile(p, "utf-8");
      task = JSON.parse(content);
      sourcePath = p;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (!task) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found or cannot be canceled`,
    };
  }

  task.status = TASK_STATUS.CANCELED;
  task.canceledAt = new Date().toISOString();

  await fs.mkdir(path.dirname(canceledFilePath), { recursive: true });
  await fs.writeFile(canceledFilePath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(sourcePath);

  return { success: true, task };
}

async function requeueRunningTask(queueDir, taskId) {
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);
  const pendingFilePath = taskPath(queueDir, TASK_FOLDERS.PENDING, taskId);

  const content = await fs.readFile(runningFilePath, "utf-8");
  const task = JSON.parse(content);
  task.status = TASK_STATUS.PENDING;
  delete task.startedAt;

  await fs.mkdir(path.dirname(pendingFilePath), { recursive: true });
  await fs.writeFile(pendingFilePath, JSON.stringify(task, null, 2), "utf-8");
  await fs.unlink(runningFilePath);

  return task;
}

async function restartTask(queueDir, taskId) {
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);
  const completedFilePath = taskPath(queueDir, TASK_FOLDERS.COMPLETED, taskId);
  const pendingFilePath = taskPath(queueDir, TASK_FOLDERS.PENDING, taskId);
  const failedFilePath = taskPath(queueDir, TASK_FOLDERS.FAILED, taskId);
  const canceledFilePath = taskPath(queueDir, TASK_FOLDERS.CANCELED, taskId);

  try {
    await fs.access(runningFilePath);
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: "Cannot restart a task that is currently running",
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  try {
    await fs.access(completedFilePath);
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: "Cannot restart a completed task",
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  let sourcePath = null;
  let task = null;

  for (const p of [pendingFilePath, failedFilePath, canceledFilePath]) {
    try {
      const content = await fs.readFile(p, "utf-8");
      task = JSON.parse(content);
      sourcePath = p;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (!task) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found or cannot be restarted`,
    };
  }

  task.status = TASK_STATUS.PENDING;
  delete task.startedAt;
  delete task.completedAt;
  delete task.failedAt;
  delete task.canceledAt;
  delete task.error;

  await fs.mkdir(path.dirname(pendingFilePath), { recursive: true });
  await fs.writeFile(pendingFilePath, JSON.stringify(task, null, 2), "utf-8");

  if (sourcePath !== pendingFilePath) {
    await fs.unlink(sourcePath);
  }

  return { success: true, task };
}

async function deleteTask(queueDir, taskId) {
  const completedFilePath = taskPath(queueDir, TASK_FOLDERS.COMPLETED, taskId);
  const pendingFilePath = taskPath(queueDir, TASK_FOLDERS.PENDING, taskId);
  const runningFilePath = taskPath(queueDir, TASK_FOLDERS.RUNNING, taskId);
  const failedFilePath = taskPath(queueDir, TASK_FOLDERS.FAILED, taskId);
  const canceledFilePath = taskPath(queueDir, TASK_FOLDERS.CANCELED, taskId);

  try {
    await fs.access(completedFilePath);
    return {
      success: false,
      code: TASK_ERROR_CODES.INVALID_STATUS,
      error: "Cannot delete a completed task",
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const deletablePaths = [
    pendingFilePath,
    runningFilePath,
    failedFilePath,
    canceledFilePath,
  ];

  let task = null;
  for (const p of deletablePaths) {
    try {
      const content = await fs.readFile(p, "utf-8");
      task = JSON.parse(content);
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (task && task.logFile) {
    const logPath = path.join(queueDir, task.logFile);
    try {
      await fs.unlink(logPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.error(`Failed to delete log file ${task.logFile}`, {
          error,
          component: "FileQueueStore",
        });
      }
    }
  }

  let deleted = false;
  for (const p of deletablePaths) {
    try {
      await fs.unlink(p);
      deleted = true;
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  if (!deleted) {
    return {
      success: false,
      code: TASK_ERROR_CODES.NOT_FOUND,
      error: `Task ${taskId} not found or already completed`,
    };
  }

  return { success: true };
}

export function createFileQueueStore({ queueDir }) {
  return {
    readTask: (taskId) => readTask(queueDir, taskId),
    enqueueTask: (task) => enqueueTask(queueDir, task),
    listPending: () => listPending(queueDir),
    listRunning: () => listRunning(queueDir),
    listTasks: (filters) => listTasks(queueDir, filters),
    moveToRunning: (taskId) => moveToRunning(queueDir, taskId),
    moveToCompleted: (taskId) => moveToCompleted(queueDir, taskId),
    moveToFailed: (taskId, error) => moveToFailed(queueDir, taskId, error),
    moveToCanceled: (taskId) => moveToCanceled(queueDir, taskId),
    requeueRunningTask: (taskId) => requeueRunningTask(queueDir, taskId),
    restartTask: (taskId) => restartTask(queueDir, taskId),
    deleteTask: (taskId) => deleteTask(queueDir, taskId),
  };
}

export {
  readTask,
  enqueueTask,
  listPending,
  listRunning,
  listTasks,
  moveToRunning,
  moveToCompleted,
  moveToFailed,
  moveToCanceled,
  requeueRunningTask,
  restartTask,
  deleteTask,
};
