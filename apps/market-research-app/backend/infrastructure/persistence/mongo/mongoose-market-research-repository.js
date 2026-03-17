import mongoose from "mongoose";
import * as logger from "../../../utils/logger.js";

const connectionCache = new Map();

function assertValidSessionId(sessionId) {
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) {
    throw new Error("Invalid sessionId format");
  }
}

function assertValidCompetitorId(competitorId) {
  if (!/^[a-z0-9-]+$/.test(competitorId)) {
    throw new Error("Invalid competitorId format");
  }
}

function createConnectionKey(uri, dbName) {
  return `${uri}::${dbName}`;
}

async function getMongoConnection({ uri, dbName }) {
  if (!uri || !dbName) {
    throw new Error(
      "Mongo market research repository requires uri and dbName",
    );
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

function getModels(connection) {
  const Session =
    connection.models.MarketResearchSession ||
    connection.model(
      "MarketResearchSession",
      new mongoose.Schema(
        {
          sessionId: { type: String, required: true, unique: true, index: true },
          ownerId: { type: String, default: null, index: true },
          idea: { type: String, required: true },
          createdAt: { type: Number, required: true, index: true },
          lastAccessedAt: { type: Number, required: true, index: true },
          state: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        {
          collection: "sessions",
          minimize: false,
          versionKey: false,
        },
      ),
    );

  const Report =
    connection.models.MarketResearchReport ||
    connection.model(
      "MarketResearchReport",
      new mongoose.Schema(
        {
          sessionId: { type: String, required: true, index: true },
          kind: { type: String, required: true },
          payload: { type: mongoose.Schema.Types.Mixed, required: true },
          createdAt: { type: Number, required: true },
          updatedAt: { type: Number, required: true },
        },
        {
          collection: "reports",
          minimize: false,
          versionKey: false,
        },
      ).index({ sessionId: 1, kind: 1 }, { unique: true }),
    );

  const Competitor =
    connection.models.MarketResearchCompetitor ||
    connection.model(
      "MarketResearchCompetitor",
      new mongoose.Schema(
        {
          sessionId: { type: String, required: true, index: true },
          competitorId: { type: String, required: true },
          payload: { type: mongoose.Schema.Types.Mixed, required: true },
          createdAt: { type: Number, required: true },
          updatedAt: { type: Number, required: true },
        },
        {
          collection: "competitors",
          minimize: false,
          versionKey: false,
        },
      ).index({ sessionId: 1, competitorId: 1 }, { unique: true }),
    );

  return { Session, Report, Competitor };
}

async function upsertReport(Report, sessionId, kind, payload) {
  const now = Date.now();
  await Report.findOneAndUpdate(
    { sessionId, kind },
    {
      $set: { payload, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true },
  );

  return payload;
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

export async function createMongoMarketResearchRepository({ uri, dbName }) {
  const connection = await getMongoConnection({ uri, dbName });
  const { Session, Report, Competitor } = getModels(connection);

  await Promise.all([
    ensureCollection(Session),
    ensureCollection(Report),
    ensureCollection(Competitor),
    Session.syncIndexes(),
    Report.syncIndexes(),
    Competitor.syncIndexes(),
  ]);

  return {
    assertValidSessionId,
    assertValidCompetitorId,

    async upsertSession(sessionId, idea, state, nextOwnerId = null) {
      assertValidSessionId(sessionId);

      const now = Date.now();
      const session = await Session.findOneAndUpdate(
        { sessionId },
        {
          $set: {
            idea,
            state,
            lastAccessedAt: now,
          },
          $setOnInsert: {
            sessionId,
            ownerId: nextOwnerId,
            createdAt: now,
          },
        },
        { upsert: true, new: true },
      ).lean();

      logger.info("Market research session saved", {
        sessionId,
        component: "MongoMarketResearchRepository",
      });

      return session;
    },

    async getSession(sessionId) {
      assertValidSessionId(sessionId);

      const now = Date.now();
      const session = await Session.findOneAndUpdate(
        { sessionId },
        { $set: { lastAccessedAt: now } },
        { new: true },
      ).lean();

      return session;
    },

    async deleteSession(sessionId) {
      assertValidSessionId(sessionId);

      const [{ deletedCount }] = await Promise.all([
        Session.deleteOne({ sessionId }),
        Report.deleteMany({ sessionId }),
        Competitor.deleteMany({ sessionId }),
      ]);

      return deletedCount > 0;
    },

    async markSessionComplete(sessionId, competitorCount) {
      assertValidSessionId(sessionId);

      const now = Date.now();
      await Session.updateOne(
        { sessionId },
        {
          $set: {
            lastAccessedAt: now,
            "state.status": "complete",
            "state.competitorCount": competitorCount,
            "state.completedAt": now,
          },
        },
      );

      logger.info("Market research session marked complete", {
        sessionId,
        competitorCount,
        component: "MongoMarketResearchRepository",
      });
    },

    async listSessions() {
      return Session.find({}).sort({ createdAt: -1 }).lean();
    },

    async getCompetitorTasks(sessionId) {
      assertValidSessionId(sessionId);
      const record = await Report.findOne({
        sessionId,
        kind: "competitor_tasks",
      }).lean();
      return record?.payload || null;
    },

    async saveCompetitorTasks(sessionId, tasks) {
      assertValidSessionId(sessionId);
      return upsertReport(Report, sessionId, "competitor_tasks", tasks);
    },

    async getCompetitorProfile(sessionId, competitorId) {
      assertValidSessionId(sessionId);
      assertValidCompetitorId(competitorId);

      const record = await Competitor.findOne({ sessionId, competitorId }).lean();
      return record?.payload || null;
    },

    async saveCompetitorProfile(sessionId, competitorId, profile) {
      assertValidSessionId(sessionId);
      assertValidCompetitorId(competitorId);

      const now = Date.now();
      await Competitor.findOneAndUpdate(
        { sessionId, competitorId },
        {
          $set: { payload: profile, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true, new: true },
      );

      return profile;
    },

    async getCompetitorProfiles(sessionId, competitorIds) {
      assertValidSessionId(sessionId);

      const sanitizedIds = competitorIds.filter(Boolean);
      if (sanitizedIds.length === 0) {
        return [];
      }

      const records = await Competitor.find({
        sessionId,
        competitorId: { $in: sanitizedIds },
      }).lean();

      const byId = new Map(
        records.map((record) => [record.competitorId, record.payload]),
      );
      return sanitizedIds.map((id) => byId.get(id)).filter(Boolean);
    },

    async getReport(sessionId) {
      assertValidSessionId(sessionId);
      const record = await Report.findOne({ sessionId, kind: "report" }).lean();
      return record?.payload || null;
    },

    async saveReport(sessionId, report) {
      assertValidSessionId(sessionId);
      return upsertReport(Report, sessionId, "report", report);
    },

    async getOpportunity(sessionId) {
      assertValidSessionId(sessionId);
      const record = await Report.findOne({
        sessionId,
        kind: "opportunity",
      }).lean();
      return record?.payload || null;
    },

    async saveOpportunity(sessionId, opportunity) {
      assertValidSessionId(sessionId);
      return upsertReport(Report, sessionId, "opportunity", opportunity);
    },
  };
}
