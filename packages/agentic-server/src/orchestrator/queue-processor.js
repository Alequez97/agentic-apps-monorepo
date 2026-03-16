import * as tasksPersistence from "../persistence/tasks.js";
import { TASK_STATUS } from "../constants/task-status.js";
import * as logger from "../utils/logger.js";

const POLL_INTERVAL_MS = 2000;
const MAX_CONCURRENT = 5;

/**
 * Create a queue processor that polls for pending tasks and dispatches them to
 * the given `TaskOrchestrator`.
 *
 * @param {import("./task.js").TaskOrchestrator} orchestrator
 * @returns {{ start: () => void, stop: () => void }}
 */
export function createQueueProcessor(orchestrator) {
  let pollTimer = null;
  let active = false;

  async function areDependenciesMet(task) {
    if (!Array.isArray(task.dependsOn) || task.dependsOn.length === 0) {
      return true;
    }
    for (const depId of task.dependsOn) {
      const dep = await tasksPersistence.readTask(orchestrator.queueDir, depId);
      if (!dep) return false;
      if (
        dep.status !== TASK_STATUS.COMPLETED &&
        dep.status !== TASK_STATUS.FAILED
      ) {
        return false;
      }
    }
    return true;
  }

  function schedulePoll() {
    if (!active) return;
    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  }

  async function poll() {
    try {
      const running = await tasksPersistence.listRunning(orchestrator.queueDir);
      const slots = MAX_CONCURRENT - running.length;

      if (slots > 0) {
        const pending = await tasksPersistence.listPending(
          orchestrator.queueDir,
        );
        const toProcess = pending.slice(0, slots);

        for (const task of toProcess) {
          if (!(await areDependenciesMet(task))) continue;

          try {
            await tasksPersistence.moveToRunning(
              orchestrator.queueDir,
              task.id,
            );
          } catch (error) {
            logger.error(
              `Queue processor: failed to claim task ${task.id}, skipping`,
              { error, component: "QueueProcessor", taskId: task.id },
            );
            continue;
          }

          logger.info(
            `Queue processor: dispatching task ${task.id} (type: ${task.type})`,
            {
              component: "QueueProcessor",
              taskId: task.id,
              type: task.type,
            },
          );

          orchestrator.executeTask(task.id).catch((error) => {
            logger.error(
              `Queue processor: task ${task.id} threw unexpectedly`,
              { error, component: "QueueProcessor", taskId: task.id },
            );
          });
        }
      }
    } catch (error) {
      logger.error("Queue processor poll error", {
        error,
        component: "QueueProcessor",
      });
    }

    schedulePoll();
  }

  function start() {
    if (active) return;
    active = true;
    logger.info("Queue processor started", {
      component: "QueueProcessor",
      pollIntervalMs: POLL_INTERVAL_MS,
      maxConcurrent: MAX_CONCURRENT,
    });
    schedulePoll();
  }

  function stop() {
    active = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    logger.info("Queue processor stopped", { component: "QueueProcessor" });
  }

  return { start, stop };
}
