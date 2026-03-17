import mongoose from "mongoose";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { TASK_STATUS } from "../../constants/task-status.js";

const connectionCache = new Map();

function createConnectionKey(uri, dbName) {
  return `${uri}::${dbName}`;
}

async function getMongoConnection({ uri, dbName }) {
  if (!uri || !dbName) {
    throw new Error("Mongo queue store requires uri and dbName");
  }

  const key = createConnectionKey(uri, dbName);
  if (!connectionCache.has(key)) {
    const connection = mongoose.createConnection(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });

    connectionCache.set(
      key,
      connection.asPromise().then(() => connection),
    );
  }

  return connectionCache.get(key);
}

function getQueueTaskModel(connection) {
  if (connection.models.QueueTask) {
    return connection.models.QueueTask;
  }

  const schema = new mongoose.Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      type: { type: String, required: true, index: true },
      status: { type: String, required: true, index: true },
      createdAt: { type: String, required: true, index: true },
      startedAt: String,
      completedAt: String,
      failedAt: String,
      canceledAt: String,
      dependsOn: { type: [String], default: [] },
      params: { type: mongoose.Schema.Types.Mixed, default: {} },
      agentConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
      systemInstructionFile: String,
      logFile: String,
      error: mongoose.Schema.Types.Mixed,
    },
    {
      collection: "queue_tasks",
      minimize: false,
      versionKey: false,
    },
  );

  schema.index({ status: 1, createdAt: 1 });
  schema.index({ "params.sessionId": 1, createdAt: -1 });

  return connection.model("QueueTask", schema);
}

function mapTask(document) {
  return document ? document.toObject() : null;
}

export async function createMongoQueueStore({ uri, dbName }) {
  const connection = await getMongoConnection({ uri, dbName });
  const QueueTask = getQueueTaskModel(connection);
  await QueueTask.syncIndexes();

  return {
    async readTask(taskId) {
      return mapTask(await QueueTask.findOne({ id: taskId }).lean(false));
    },

    async enqueueTask(task) {
      const created = await QueueTask.create(task);
      return mapTask(created);
    },

    async listPending() {
      return QueueTask.find({ status: TASK_STATUS.PENDING })
        .sort({ createdAt: 1 })
        .lean();
    },

    async listRunning() {
      return QueueTask.find({ status: TASK_STATUS.RUNNING })
        .sort({ createdAt: 1 })
        .lean();
    },

    async listTasks(filters = {}) {
      const query = {};

      if (Array.isArray(filters.status) && filters.status.length > 0) {
        query.status = { $in: filters.status };
      }
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom).toISOString();
        }
        if (filters.dateTo) {
          query.createdAt.$lte = new Date(filters.dateTo).toISOString();
        }
      }

      return QueueTask.find(query).sort({ createdAt: -1 }).lean();
    },

    async claimTask(taskId) {
      const task = await QueueTask.findOneAndUpdate(
        { id: taskId, status: TASK_STATUS.PENDING },
        {
          $set: {
            status: TASK_STATUS.RUNNING,
            startedAt: new Date().toISOString(),
          },
        },
        { new: true },
      ).lean(false);

      if (!task) {
        throw new Error(`Task ${taskId} is not pending or was not found`);
      }

      return mapTask(task);
    },

    async completeTask(taskId) {
      const task = await QueueTask.findOneAndUpdate(
        { id: taskId, status: TASK_STATUS.RUNNING },
        {
          $set: {
            status: TASK_STATUS.COMPLETED,
            completedAt: new Date().toISOString(),
          },
        },
        { new: true },
      ).lean(false);

      if (!task) {
        throw new Error(`Task ${taskId} is not running or was not found`);
      }

      return mapTask(task);
    },

    async failTask(taskId, error) {
      const task = await QueueTask.findOneAndUpdate(
        {
          id: taskId,
          status: { $in: [TASK_STATUS.RUNNING, TASK_STATUS.PENDING] },
        },
        {
          $set: {
            status: TASK_STATUS.FAILED,
            failedAt: new Date().toISOString(),
            error: error || "Task execution failed",
          },
        },
        { new: true },
      ).lean(false);

      if (!task) {
        throw new Error(`Task ${taskId} was not found`);
      }

      return mapTask(task);
    },

    async cancelTask(taskId) {
      const task = await QueueTask.findOneAndUpdate(
        {
          id: taskId,
          status: { $in: [TASK_STATUS.RUNNING, TASK_STATUS.PENDING] },
        },
        {
          $set: {
            status: TASK_STATUS.CANCELED,
            canceledAt: new Date().toISOString(),
          },
        },
        { new: true },
      ).lean(false);

      if (!task) {
        return {
          success: false,
          code: TASK_ERROR_CODES.NOT_FOUND,
          error: `Task ${taskId} not found or cannot be canceled`,
        };
      }

      return { success: true, task: mapTask(task) };
    },

    async requeueTask(taskId) {
      const task = await QueueTask.findOneAndUpdate(
        { id: taskId, status: TASK_STATUS.RUNNING },
        {
          $set: { status: TASK_STATUS.PENDING },
          $unset: { startedAt: 1 },
        },
        { new: true },
      ).lean(false);

      if (!task) {
        throw new Error(`Task ${taskId} is not running or was not found`);
      }

      return mapTask(task);
    },

    async restartTask(taskId) {
      const existing = await QueueTask.findOne({ id: taskId }).lean();
      if (!existing) {
        return {
          success: false,
          code: TASK_ERROR_CODES.NOT_FOUND,
          error: `Task ${taskId} not found or cannot be restarted`,
        };
      }

      if (existing.status === TASK_STATUS.RUNNING) {
        return {
          success: false,
          code: TASK_ERROR_CODES.INVALID_STATUS,
          error: "Cannot restart a task that is currently running",
        };
      }

      if (existing.status === TASK_STATUS.COMPLETED) {
        return {
          success: false,
          code: TASK_ERROR_CODES.INVALID_STATUS,
          error: "Cannot restart a completed task",
        };
      }

      const task = await QueueTask.findOneAndUpdate(
        { id: taskId },
        {
          $set: { status: TASK_STATUS.PENDING },
          $unset: {
            startedAt: 1,
            completedAt: 1,
            failedAt: 1,
            canceledAt: 1,
            error: 1,
          },
        },
        { new: true },
      ).lean(false);

      return { success: true, task: mapTask(task) };
    },

    async deleteTask(taskId) {
      const existing = await QueueTask.findOne({ id: taskId }).lean();
      if (!existing) {
        return {
          success: false,
          code: TASK_ERROR_CODES.NOT_FOUND,
          error: `Task ${taskId} not found or already completed`,
        };
      }

      if (existing.status === TASK_STATUS.COMPLETED) {
        return {
          success: false,
          code: TASK_ERROR_CODES.INVALID_STATUS,
          error: "Cannot delete a completed task",
        };
      }

      await QueueTask.deleteOne({ id: taskId });
      return { success: true };
    },
  };
}
