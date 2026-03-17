import mongoose from "mongoose";
import { TASK_ERROR_CODES } from "../../constants/task-error-codes.js";
import { TASK_STATUS } from "../../constants/task-status.js";

const connectionCache = new Map();

function normalizeLeaseDurationMs(leaseDurationMs) {
  return leaseDurationMs > 0 ? leaseDurationMs : 30000;
}

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
      ownerId: { type: String, default: null, index: true },
      startedAt: String,
      completedAt: String,
      failedAt: String,
      canceledAt: String,
      leaseOwner: { type: String, default: null, index: true },
      leaseExpiresAt: { type: String, default: null, index: true },
      lastHeartbeatAt: { type: String, default: null },
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
  schema.index({ ownerId: 1, createdAt: -1 });
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
      if (filters.ownerId) {
        query.ownerId = filters.ownerId;
      }

      return QueueTask.find(query).sort({ createdAt: -1 }).lean();
    },

    async claimTask(taskId, options = {}) {
      const { leaseOwner = null, leaseDurationMs = 0 } = options;
      const now = new Date();
      const task = await QueueTask.findOneAndUpdate(
        { id: taskId, status: TASK_STATUS.PENDING },
        {
          $set: {
            status: TASK_STATUS.RUNNING,
            startedAt: now.toISOString(),
            leaseOwner,
            leaseExpiresAt: new Date(
              now.getTime() + normalizeLeaseDurationMs(leaseDurationMs),
            ).toISOString(),
            lastHeartbeatAt: now.toISOString(),
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
            leaseOwner: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: null,
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
            leaseOwner: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: null,
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
            leaseOwner: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: null,
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
          $set: {
            status: TASK_STATUS.PENDING,
            leaseOwner: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: null,
          },
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
            leaseOwner: 1,
            leaseExpiresAt: 1,
            lastHeartbeatAt: 1,
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

    async renewLease(taskId, leaseOwner, leaseDurationMs = 0) {
      const now = new Date();
      const task = await QueueTask.findOneAndUpdate(
        {
          id: taskId,
          status: TASK_STATUS.RUNNING,
          $or: [{ leaseOwner }, { leaseOwner: null }],
        },
        {
          $set: {
            leaseOwner,
            leaseExpiresAt: new Date(
              now.getTime() + normalizeLeaseDurationMs(leaseDurationMs),
            ).toISOString(),
            lastHeartbeatAt: now.toISOString(),
          },
        },
        { new: true },
      ).lean(false);

      if (!task) {
        throw new Error(`Task ${taskId} is not running or is leased elsewhere`);
      }

      return mapTask(task);
    },

    async releaseLease(taskId, leaseOwner = null) {
      const query = {
        id: taskId,
        status: TASK_STATUS.RUNNING,
      };
      if (leaseOwner) {
        query.$or = [{ leaseOwner }, { leaseOwner: null }];
      }

      const task = await QueueTask.findOneAndUpdate(
        query,
        {
          $set: {
            leaseOwner: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: null,
          },
        },
        { new: true },
      ).lean(false);

      return mapTask(task);
    },

    async requeueExpiredTasks(now = new Date()) {
      const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
      const expiredTasks = await QueueTask.find({
        status: TASK_STATUS.RUNNING,
        $or: [
          { leaseOwner: null },
          { leaseExpiresAt: null },
          { leaseExpiresAt: { $lte: nowIso } },
        ],
      })
        .select({ id: 1 })
        .lean();

      if (expiredTasks.length === 0) {
        return { recovered: 0, tasks: [] };
      }

      const taskIds = expiredTasks.map((task) => task.id);
      await QueueTask.updateMany(
        { id: { $in: taskIds } },
        {
          $set: {
            status: TASK_STATUS.PENDING,
            leaseOwner: null,
            leaseExpiresAt: null,
            lastHeartbeatAt: null,
          },
          $unset: { startedAt: 1 },
        },
      );

      return { recovered: taskIds.length, tasks: taskIds };
    },
  };
}
