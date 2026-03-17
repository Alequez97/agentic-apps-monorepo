import mongoose from "mongoose";
import * as logger from "../../../utils/logger.js";

const connectionCache = new Map();

function assertValidUserId(userId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error("Invalid userId format");
  }
}

function createConnectionKey(uri, dbName) {
  return `${uri}::${dbName}`;
}

async function getMongoConnection({ uri, dbName }) {
  if (!uri || !dbName) {
    throw new Error("Mongo subscription repository requires uri and dbName");
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

function getSubscriptionModel(connection) {
  if (connection.models.Subscription) {
    return connection.models.Subscription;
  }

  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, unique: true, index: true },
      plan: { type: String, default: "free" },
      status: { type: String, default: "active" },
      creditsUsed: { type: Number, default: 0 },
      createdAt: { type: Number, required: true },
      updatedAt: { type: Number, required: true },
    },
    {
      collection: "subscriptions",
      minimize: false,
      versionKey: false,
    },
  );

  return connection.model("Subscription", schema);
}

async function ensureCollection(Model) {
  try {
    await Model.createCollection();
  } catch (error) {
    if (error?.codeName !== "NamespaceExists") {
      throw error;
    }
  }
}

function buildSubscriptionUpsertUpdate(userId, updates, now) {
  return {
    $set: {
      ...(updates.plan !== undefined ? { plan: updates.plan } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.creditsUsed !== undefined
        ? { creditsUsed: updates.creditsUsed }
        : {}),
      updatedAt: now,
    },
    $setOnInsert: {
      userId,
      ...(updates.plan === undefined ? { plan: "free" } : {}),
      ...(updates.status === undefined ? { status: "active" } : {}),
      ...(updates.creditsUsed === undefined ? { creditsUsed: 0 } : {}),
      createdAt: now,
    },
  };
}

export async function createMongoSubscriptionRepository({ uri, dbName }) {
  const connection = await getMongoConnection({ uri, dbName });
  const Subscription = getSubscriptionModel(connection);
  await ensureCollection(Subscription);
  await Subscription.syncIndexes();

  return {
    assertValidUserId,

    async getSubscription(userId) {
      assertValidUserId(userId);
      return Subscription.findOne({ userId }).lean();
    },

    async upsertSubscription(userId, updates = {}) {
      assertValidUserId(userId);
      const now = Date.now();

      const subscription = await Subscription.findOneAndUpdate(
        { userId },
        buildSubscriptionUpsertUpdate(userId, updates, now),
        { upsert: true, new: true },
      ).lean();

      logger.info("Subscription upserted", {
        userId,
        component: "MongoSubscriptionRepository",
      });

      return subscription;
    },
  };
}
