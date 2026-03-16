// Task engine
export { TaskOrchestrator } from "./orchestrator/task.js";
export { createQueueProcessor } from "./orchestrator/queue-processor.js";

// Task execution
export { LLMApiExecutor } from "./executor/llm-api.js";
export { buildTaskHandler } from "./handler-builder/task-handler-builder.js";
export {
  setupTaskLogger,
  logTaskHeader,
  logTaskSuccess,
  logTaskError,
} from "./executor/task-logger.js";
export {
  getProgressFileRelativePath,
  ensureProgressDirectory,
  deleteProgressFile,
} from "./executor/task-progress.js";

// Persistence
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
} from "./persistence/tasks.js";
export { readLog } from "./persistence/logs.js";
export { tryReadJsonFile, appendRevision } from "./persistence/utils.js";

// Logger
export * as logger from "./utils/logger.js";
export { getProviderFromModel } from "./utils/model-utils.js";

// Constants
export { TASK_STATUS, TASK_FOLDERS } from "./constants/task-status.js";
export { TASK_ERROR_CODES } from "./constants/task-error-codes.js";
export { TASK_EVENTS } from "./constants/task-events.js";
