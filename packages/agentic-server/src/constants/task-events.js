/**
 * Internal EventEmitter event name constants for TaskOrchestrator.
 * The app bridges these to its own transport (Socket.IO, stdout, etc.).
 */
export const TASK_EVENTS = {
  /** Task file written to pending folder. Payload: { task } */
  QUEUED: "task:queued",
  /** Task picked up by queue processor. Payload: { task } */
  STARTED: "task:started",
  /** LLM tool call in progress. Payload: { taskId, type, params, stage, message, publicLogText, kind } */
  PROGRESS: "task:progress",
  /** Task finished successfully. Payload: { task } */
  COMPLETED: "task:completed",
  /** Task finished with error. Payload: { task, error, code } */
  FAILED: "task:failed",
  /** Task cancelled by user. Payload: { task } */
  CANCELED: "task:canceled",
};
