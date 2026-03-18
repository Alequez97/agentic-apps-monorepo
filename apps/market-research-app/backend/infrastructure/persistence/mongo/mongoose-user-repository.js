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
    throw new Error("Mongo user repository requires uri and dbName");
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

function getUserModel(connection) {
  if (connection.models.User) {
    return connection.models.User;
  }

  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, unique: true, index: true },
      email: String,
      name: String,
      picture: String,
      createdAt: { type: Number, required: true },
      lastSeenAt: { type: Number, required: true },
      isAdmin: { type: Boolean, default: false },
    },
    {
      collection: "users",
      minimize: false,
      versionKey: false,
    },
  );

  return connection.model("User", schema);
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

export async function createMongoUserRepository({ uri, dbName }) {
  const connection = await getMongoConnection({ uri, dbName });
  const User = getUserModel(connection);
  await ensureCollection(User);
  await User.syncIndexes();

  return {
    assertValidUserId,

    async upsertUser(profile) {
      const userId = profile.sub;
      assertValidUserId(userId);

      const now = Date.now();
      const user = await User.findOneAndUpdate(
        { userId },
        {
          $set: {
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            lastSeenAt: now,
          },
          $setOnInsert: {
            userId,
            createdAt: now,
          },
        },
        { upsert: true, new: true },
      ).lean();

      logger.info("User upserted", { userId, component: "MongoUserRepository" });

      return user;
    },

    async getUser(userId) {
      assertValidUserId(userId);
      return User.findOne({ userId }).lean();
    },

    async listUsers({ limit = null, skip = 0 } = {}) {
      const q = User.find({}).sort({ lastSeenAt: -1 }).skip(skip);
      if (limit != null) q.limit(limit);
      return q.lean();
    },

    async countUsers() {
      return User.countDocuments({});
    },
  };
}
