import { TASK_STATUS } from "../constants/task-status.js";
import { assertTaskQueueStoreContract } from "../contracts/index.js";
import * as logger from "../../utils/logger.js";

const POLL_INTERVAL_MS = 2000;
const MAX_CONCURRENT = 5;
const DEFAULT_LEASE_DURATION_MS = 30000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10000;

export function createQueueProcessor({
  queueStore,
  taskOrchestrator,
  queueProcessorId = `queue-processor-${process.pid}`,
  leaseDurationMs = DEFAULT_LEASE_DURATION_MS,
  heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
}) {
  assertTaskQueueStoreContract(queueStore);
  let pollTimer = null;
  let heartbeatTimer = null;
  let active = false;

  async function areDependenciesMet(task) {
    if (!Array.isArray(task.dependsOn) || task.dependsOn.length === 0) {
      return true;
    }
    for (const depId of task.dependsOn) {
      const dependencyTask = await queueStore.readTask(depId);
      if (!dependencyTask) return false;
      if (
        dependencyTask.status !== TASK_STATUS.COMPLETED &&
        dependencyTask.status !== TASK_STATUS.FAILED
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
      await queueStore.requeueExpiredTasks();

      const runningTasks = await queueStore.listRunning();
      const availableSlots = MAX_CONCURRENT - runningTasks.length;

      if (availableSlots > 0) {
        const pendingTasks = await queueStore.listPending();
        const tasksToProcess = pendingTasks.slice(0, availableSlots);

        for (const task of tasksToProcess) {
          if (!(await areDependenciesMet(task))) continue;

          try {
            await queueStore.claimTask(task.id, {
              leaseOwner: queueProcessorId,
              leaseDurationMs,
            });
          } catch (error) {
            logger.error(
              `Queue processor: failed to claim task ${task.id}`,
              {
                error,
                component: "QueueProcessor",
                taskId: task.id,
              },
            );
            continue;
          }

          logger.info(`Queue processor: dispatching task ${task.id}`, {
            component: "QueueProcessor",
            taskId: task.id,
            type: task.type,
          });

          taskOrchestrator
            .executeTask(task.id, { queueProcessorId, leaseDurationMs })
            .catch((error) => {
              logger.error(
                `Queue processor: task ${task.id} threw unexpectedly`,
                {
                  error,
                  component: "QueueProcessor",
                  taskId: task.id,
                },
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
      queueProcessorId,
      leaseDurationMs,
      heartbeatIntervalMs,
    });

    heartbeatTimer = setInterval(() => {
      taskOrchestrator
        .renewRunningLeases(queueProcessorId, leaseDurationMs)
        .catch((error) => {
          logger.warn("Queue processor heartbeat failed", {
            component: "QueueProcessor",
            queueProcessorId,
            error: error.message,
          });
        });
    }, heartbeatIntervalMs);

    schedulePoll();
  }

  function stop() {
    active = false;

    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    logger.info("Queue processor stopped", {
      component: "QueueProcessor",
    });
  }

  return { start, stop };
}
