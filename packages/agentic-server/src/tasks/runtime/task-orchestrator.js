import { TASK_EVENTS } from "../constants/task-events.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { TASK_STATUS } from "../constants/task-status.js";
import * as logger from "../../utils/logger.js";

export class TaskOrchestrator {
  constructor({
    resolveTaskHandler,
    queueStore,
    taskRunner,
    taskProgressStore,
    taskEventPublisher,
  }) {
    if (typeof resolveTaskHandler !== "function") {
      throw new Error("TaskOrchestrator requires resolveTaskHandler(task)");
    }
    if (!queueStore) {
      throw new Error("TaskOrchestrator requires queueStore");
    }
    if (!taskRunner) {
      throw new Error("TaskOrchestrator requires taskRunner");
    }
    if (!taskProgressStore) {
      throw new Error("TaskOrchestrator requires taskProgressStore");
    }
    if (!taskEventPublisher) {
      throw new Error("TaskOrchestrator requires taskEventPublisher");
    }

    this.resolveTaskHandler = resolveTaskHandler;
    this.queueStore = queueStore;
    this.taskRunner = taskRunner;
    this.taskProgressStore = taskProgressStore;
    this.taskEventPublisher = taskEventPublisher;

    this._runningControllers = new Map();
  }

  publishTaskEvent(eventName, payload) {
    return this.taskEventPublisher.publish(eventName, payload);
  }

  async getTask(taskId) {
    return this.queueStore.readTask(taskId);
  }

  async getTasks(filters = {}) {
    return this.queueStore.listTasks(filters);
  }

  async getPendingTasks() {
    return this.queueStore.listPending();
  }

  async enqueueTask(task) {
    await this.queueStore.enqueueTask(task);
    this.publishTaskEvent(TASK_EVENTS.QUEUED, { task });
    return task;
  }

  async executeTask(taskId) {
    const task = await this.queueStore.readTask(taskId);

    if (!task) {
      return {
        success: false,
        code: TASK_ERROR_CODES.NOT_FOUND,
        error: `Task ${taskId} not found`,
        taskId,
      };
    }

    if (
      task.status !== TASK_STATUS.PENDING &&
      task.status !== TASK_STATUS.RUNNING
    ) {
      return {
        success: false,
        code: TASK_ERROR_CODES.INVALID_STATUS,
        error: `Task ${taskId} is not pending (status: ${task.status})`,
        taskId,
      };
    }

    if (task.status === TASK_STATUS.PENDING) {
      await this.queueStore.moveToRunning(taskId);
    }

    this.publishTaskEvent(TASK_EVENTS.STARTED, { task });

    if (!this.taskRunner.isAvailable()) {
      const error = "No LLM API keys configured";
      await this.queueStore.moveToFailed(taskId, error);
      this.publishTaskEvent(TASK_EVENTS.FAILED, {
        task,
        error,
        code: TASK_ERROR_CODES.NOT_FOUND,
      });
      return {
        success: false,
        code: TASK_ERROR_CODES.NOT_FOUND,
        error,
        taskId,
      };
    }

    const controller = new AbortController();
    this._runningControllers.set(taskId, controller);

    const buildHandler = (t, taskLogger, agent) => {
      const factory = this.resolveTaskHandler?.(t);
      if (!factory) {
        throw new Error(`No handler registered for task type: ${t.type}`);
      }
      return factory(t, taskLogger, agent);
    };

    const publishTaskEvent = this.publishTaskEvent.bind(this);

    let result;
    try {
      result = await this.taskRunner.execute(
        task,
        buildHandler,
        publishTaskEvent,
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        await this.taskProgressStore.clear(taskId);
        return { success: false, cancelled: true, taskId };
      }

      const executionError = error?.message || "Task execution failed";
      await this.queueStore.moveToFailed(taskId, executionError);
      this.publishTaskEvent(TASK_EVENTS.FAILED, {
        task,
        error: executionError,
        code: null,
        timestamp: new Date().toISOString(),
      });
      return { success: false, error: executionError, taskId };
    } finally {
      this._runningControllers.delete(taskId);
    }

    if (result.success) {
      await this.queueStore.moveToCompleted(taskId);
      await this.taskProgressStore.clear(taskId);
      this.publishTaskEvent(TASK_EVENTS.COMPLETED, {
        task: { ...task, status: TASK_STATUS.COMPLETED },
        timestamp: new Date().toISOString(),
      });
    } else if (result.cancelled) {
      await this.taskProgressStore.clear(taskId);
      return result;
    } else {
      await this.queueStore.moveToFailed(taskId, result.error || "Task execution failed");
      this.publishTaskEvent(TASK_EVENTS.FAILED, {
        task,
        error: result.error || "Task execution failed",
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  async deleteTask(taskId) {
    const controller = this._runningControllers.get(taskId);
    if (controller) {
      controller.abort();
      this._runningControllers.delete(taskId);
      logger.info(`Aborted running agent for task ${taskId}`, {
        component: "TaskOrchestrator",
      });
    }
    return this.queueStore.deleteTask(taskId);
  }

  async cancelTask(taskId) {
    const controller = this._runningControllers.get(taskId);
    if (controller) {
      controller.abort();
      this._runningControllers.delete(taskId);
      logger.info(`Aborted running agent for task ${taskId}`, {
        component: "TaskOrchestrator",
      });
    }

    const result = await this.queueStore.moveToCanceled(taskId);
    if (!result.success) return result;

    this.publishTaskEvent(TASK_EVENTS.CANCELED, {
      task: result.task,
      timestamp: new Date().toISOString(),
    });
    logger.info(`Task ${taskId} canceled by user`, {
      component: "TaskOrchestrator",
    });

    return { success: true, task: result.task };
  }

  async restartTask(taskId) {
    const result = await this.queueStore.restartTask(taskId);
    if (!result.success) return result;

    logger.info(`Task ${taskId} restarted and moved back to pending`, {
      component: "TaskOrchestrator",
    });

    return { success: true, task: result.task };
  }

  async recoverOrphanedTasks() {
    try {
      const runningTasks = await this.queueStore.listRunning();
      if (runningTasks.length === 0) {
        logger.info("No orphaned running tasks to recover", {
          component: "TaskOrchestrator",
        });
        return { recovered: 0, tasks: [] };
      }

      logger.info(
        `Recovering ${runningTasks.length} orphaned running task(s)`,
        { component: "TaskOrchestrator" },
      );

      const recoveredIds = [];
      for (const task of runningTasks) {
        try {
          await this.queueStore.requeueRunningTask(task.id);
          logger.info(`Recovered task: ${task.id} (type: ${task.type})`, {
            component: "TaskOrchestrator",
          });
          recoveredIds.push(task.id);
        } catch (error) {
          logger.error(`Failed to recover task ${task.id}`, {
            error,
            component: "TaskOrchestrator",
          });
        }
      }

      return { recovered: recoveredIds.length, tasks: recoveredIds };
    } catch (error) {
      logger.error("Failed to recover orphaned tasks", {
        error,
        component: "TaskOrchestrator",
      });
      return { recovered: 0, tasks: [], error: error.message };
    }
  }
}
