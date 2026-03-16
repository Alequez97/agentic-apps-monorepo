import { EventEmitter } from "events";
import * as tasksPersistence from "../persistence/tasks.js";
import { LLMApiExecutor } from "../executor/llm-api.js";
import { deleteProgressFile } from "../executor/task-progress.js";
import { TASK_EVENTS } from "../constants/task-events.js";
import { TASK_ERROR_CODES } from "../constants/task-error-codes.js";
import { TASK_STATUS } from "../constants/task-status.js";
import { AGENTS } from "@jfs/llm-core";
import * as logger from "../utils/logger.js";

/**
 * Task orchestrator and lifecycle manager.
 *
 * Extends EventEmitter — the consuming app subscribes to TASK_EVENTS and bridges
 * them to whatever transport it uses (Socket.IO, stdout, etc.).
 *
 * Constructor options:
 * @param {Object} opts
 * @param {Object} opts.registry - Map of task type → async handler factory fn(task, taskLogger, agent)
 * @param {string} opts.queueDir - Absolute path to the analysis root (contains tasks/, logs/, temp/)
 * @param {Object} opts.apiKeys - { anthropic?, openai?, deepseek?, openrouter? }
 * @param {string} opts.workingDirectory - Absolute path to the project root the agent will read/write
 * @param {string} [opts.allowedOutputPrefix=".code-analysis"] - FileToolExecutor write boundary prefix
 */
export class TaskOrchestrator extends EventEmitter {
  constructor({
    registry,
    queueDir,
    apiKeys,
    workingDirectory,
    allowedOutputPrefix = ".code-analysis",
  }) {
    super();

    this.registry = registry;
    this.queueDir = queueDir;
    this.workingDirectory = workingDirectory;
    this.allowedOutputPrefix = allowedOutputPrefix;

    this._runningControllers = new Map();

    this._executor = new LLMApiExecutor({
      apiKeys,
      workingDirectory,
      allowedOutputPrefix,
      logsDir: `${queueDir}/logs`,
    });
  }

  // -------------------------------------------------------------------------
  // Public query methods
  // -------------------------------------------------------------------------

  async getTask(taskId) {
    return tasksPersistence.readTask(this.queueDir, taskId);
  }

  async getTasks(filters = {}) {
    return tasksPersistence.listTasks(this.queueDir, filters);
  }

  async getPendingTasks() {
    return tasksPersistence.listPending(this.queueDir);
  }

  // -------------------------------------------------------------------------
  // Task lifecycle
  // -------------------------------------------------------------------------

  /**
   * Enqueue a task and emit TASK_EVENTS.QUEUED.
   * @param {Object} task - Task object to enqueue
   * @returns {Promise<Object>} The enqueued task (with logFile stamped)
   */
  async enqueueTask(task) {
    await tasksPersistence.enqueueTask(this.queueDir, task);
    this.emit(TASK_EVENTS.QUEUED, { task });
    return task;
  }

  /**
   * Execute a task. Called by the queue processor after it claims a pending task.
   * @param {string} taskId
   */
  async executeTask(taskId) {
    const task = await tasksPersistence.readTask(this.queueDir, taskId);

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
      await tasksPersistence.moveToRunning(this.queueDir, taskId);
    }

    this.emit(TASK_EVENTS.STARTED, { task });

    if (!this._executor.isAvailable()) {
      const error = "No LLM API keys configured";
      await tasksPersistence.moveToFailed(this.queueDir, taskId, error);
      this.emit(TASK_EVENTS.FAILED, {
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
      const factory = this.registry?.[t.type];
      if (!factory) {
        throw new Error(`No handler registered for task type: ${t.type}`);
      }
      return factory(t, taskLogger, agent);
    };

    const emitEvent = this.emit.bind(this);

    let result;
    try {
      result = await this._executor.execute(
        task,
        buildHandler,
        emitEvent,
        controller.signal,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        await deleteProgressFile(this.queueDir, taskId);
        return { success: false, cancelled: true, taskId };
      }

      const executionError = error?.message || "Task execution failed";
      await tasksPersistence.moveToFailed(
        this.queueDir,
        taskId,
        executionError,
      );
      this.emit(TASK_EVENTS.FAILED, {
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
      await tasksPersistence.moveToCompleted(this.queueDir, taskId);
      await deleteProgressFile(this.queueDir, taskId);
      this.emit(TASK_EVENTS.COMPLETED, {
        task: { ...task, status: TASK_STATUS.COMPLETED },
        timestamp: new Date().toISOString(),
      });
    } else if (result.cancelled) {
      await deleteProgressFile(this.queueDir, taskId);
      return result;
    } else {
      await tasksPersistence.moveToFailed(
        this.queueDir,
        taskId,
        result.error || "Task execution failed",
      );
      this.emit(TASK_EVENTS.FAILED, {
        task,
        error: result.error || "Task execution failed",
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  /**
   * Delete a task and abort any running agent for it.
   * Cannot delete completed tasks.
   */
  async deleteTask(taskId) {
    const controller = this._runningControllers.get(taskId);
    if (controller) {
      controller.abort();
      this._runningControllers.delete(taskId);
      logger.info(`Aborted running agent for task ${taskId}`, {
        component: "TaskOrchestrator",
      });
    }
    return tasksPersistence.deleteTask(this.queueDir, taskId);
  }

  /**
   * Cancel a task and abort any running agent for it.
   * Moves to canceled folder, does NOT delete.
   */
  async cancelTask(taskId) {
    const controller = this._runningControllers.get(taskId);
    if (controller) {
      controller.abort();
      this._runningControllers.delete(taskId);
      logger.info(`Aborted running agent for task ${taskId}`, {
        component: "TaskOrchestrator",
      });
    }

    const result = await tasksPersistence.moveToCanceled(this.queueDir, taskId);
    if (!result.success) return result;

    this.emit(TASK_EVENTS.CANCELED, {
      task: result.task,
      timestamp: new Date().toISOString(),
    });
    logger.info(`Task ${taskId} canceled by user`, {
      component: "TaskOrchestrator",
    });

    return { success: true, task: result.task };
  }

  /**
   * Restart a failed, pending, or canceled task by moving it back to pending.
   */
  async restartTask(taskId) {
    const result = await tasksPersistence.restartTask(this.queueDir, taskId);
    if (!result.success) return result;

    logger.info(`Task ${taskId} restarted and moved back to pending`, {
      component: "TaskOrchestrator",
    });

    return { success: true, task: result.task };
  }

  /**
   * Recover orphaned tasks on server startup (running → pending).
   */
  async recoverOrphanedTasks() {
    try {
      const runningTasks = await tasksPersistence.listRunning(this.queueDir);
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
          await tasksPersistence.requeueRunningTask(this.queueDir, task.id);
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
