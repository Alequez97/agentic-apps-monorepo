import { TASK_STATUS } from "../constants/task-status.js";
import * as logger from "../../utils/logger.js";

const POLL_INTERVAL_MS = 2000;
const MAX_CONCURRENT = 5;

export function createQueueWorker({ queueStore, taskOrchestrator }) {
  let pollTimer = null;
  let active = false;

  async function areDependenciesMet(task) {
    if (!Array.isArray(task.dependsOn) || task.dependsOn.length === 0) {
      return true;
    }
    for (const depId of task.dependsOn) {
      const dep = await queueStore.readTask(depId);
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
      const running = await queueStore.listRunning();
      const slots = MAX_CONCURRENT - running.length;

      if (slots > 0) {
        const pending = await queueStore.listPending();
        const toProcess = pending.slice(0, slots);

        for (const task of toProcess) {
          if (!(await areDependenciesMet(task))) continue;

          try {
            await queueStore.moveToRunning(task.id);
          } catch (error) {
            logger.error(`Queue worker: failed to claim task ${task.id}`, {
              error,
              component: "QueueWorker",
              taskId: task.id,
            });
            continue;
          }

          logger.info(`Queue worker: dispatching task ${task.id}`, {
            component: "QueueWorker",
            taskId: task.id,
            type: task.type,
          });

          taskOrchestrator.executeTask(task.id).catch((error) => {
            logger.error(`Queue worker: task ${task.id} threw unexpectedly`, {
              error,
              component: "QueueWorker",
              taskId: task.id,
            });
          });
        }
      }
    } catch (error) {
      logger.error("Queue worker poll error", {
        error,
        component: "QueueWorker",
      });
    }

    schedulePoll();
  }

  function start() {
    if (active) return;
    active = true;
    logger.info("Queue worker started", {
      component: "QueueWorker",
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
    logger.info("Queue worker stopped", { component: "QueueWorker" });
  }

  return { start, stop };
}

export const createQueueProcessor = createQueueWorker;
