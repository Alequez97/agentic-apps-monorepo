/**
 * Internal EventEmitter event name constants for TaskOrchestrator.
 * The app bridges these to its own transport (Socket.IO, stdout, etc.).
 */
export const TASK_EVENTS = {
  QUEUED: "task:queued",
  STARTED: "task:started",
  PROGRESS: "task:progress",
  COMPLETED: "task:completed",
  FAILED: "task:failed",
  CANCELED: "task:canceled",
};
