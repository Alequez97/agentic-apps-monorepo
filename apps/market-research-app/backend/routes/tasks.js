import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as logger from "../utils/logger.js";

/**
 * Generic task routes that work across all task types.
 * This namespace handles task-level operations like retry, cancel, status check.
 */
export function createTasksRouter({ orchestrator }) {
  const router = Router();

  /**
   * GET /api/tasks/:taskId
   * Get task status and details
   */
  router.get("/:taskId", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await orchestrator.getTask(taskId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify ownership
      if (task.ownerId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json({ task });
    } catch (error) {
      logger.error("Failed to get task", {
        component: "TasksRoute",
        taskId: req.params.taskId,
        error: error.message,
      });
      res.status(500).json({ error: "Failed to retrieve task" });
    }
  });

  /**
   * POST /api/tasks/:taskId/retry
   * Restart a failed or canceled task
   */
  router.post("/:taskId/retry", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await orchestrator.getTask(taskId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify ownership
      if (task.ownerId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Verify task can be retried (must be failed or canceled)
      if (task.status !== "failed" && task.status !== "canceled") {
        return res.status(400).json({
          error: `Cannot retry task with status: ${task.status}. Only failed or canceled tasks can be retried.`,
        });
      }

      const result = await orchestrator.restartTask(taskId);

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to restart task" });
      }

      logger.info("Task restarted via API", {
        component: "TasksRoute",
        taskId,
        userId: req.userId,
        taskType: task.type,
      });

      res.json({
        message: "Task restarted successfully",
        task: result.task,
      });
    } catch (error) {
      logger.error("Failed to restart task", {
        component: "TasksRoute",
        taskId: req.params.taskId,
        error: error.message,
      });
      res.status(500).json({ error: "Failed to restart task" });
    }
  });

  /**
   * POST /api/tasks/:taskId/cancel
   * Cancel a running or pending task
   */
  router.post("/:taskId/cancel", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const task = await orchestrator.getTask(taskId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Verify ownership
      if (task.ownerId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Verify task can be canceled (must be pending or running)
      if (task.status !== "pending" && task.status !== "running") {
        return res.status(400).json({
          error: `Cannot cancel task with status: ${task.status}. Only pending or running tasks can be canceled.`,
        });
      }

      const result = await orchestrator.cancelTask(taskId);

      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to cancel task" });
      }

      logger.info("Task canceled via API", {
        component: "TasksRoute",
        taskId,
        userId: req.userId,
        taskType: task.type,
      });

      res.json({
        message: "Task canceled successfully",
        task: result.task,
      });
    } catch (error) {
      logger.error("Failed to cancel task", {
        component: "TasksRoute",
        taskId: req.params.taskId,
        error: error.message,
      });
      res.status(500).json({ error: "Failed to cancel task" });
    }
  });

  return router;
}
