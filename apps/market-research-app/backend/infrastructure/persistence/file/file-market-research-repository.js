import fs from "fs/promises";
import path from "path";
import config from "../../../config.js";
import * as logger from "../../../utils/logger.js";
import { tryReadJsonFile } from "./file-persistence-utils.js";

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

export function createFileMarketResearchRepository({
  dataDir = config.dataDir,
} = {}) {
  const marketResearchDir = path.join(dataDir, "market-research");

  function getSessionDir(sessionId) {
    assertValidSessionId(sessionId);
    return path.join(marketResearchDir, sessionId);
  }

  function getSessionPath(sessionId) {
    return path.join(getSessionDir(sessionId), "session.json");
  }

  function getCompetitorTasksPath(sessionId) {
    return path.join(getSessionDir(sessionId), "competitor-tasks.json");
  }

  function getCompetitorsDir(sessionId) {
    return path.join(getSessionDir(sessionId), "competitors");
  }

  function getReportPath(sessionId) {
    return path.join(getSessionDir(sessionId), "report.json");
  }

  function getOpportunityPath(sessionId) {
    return path.join(getSessionDir(sessionId), "opportunity.json");
  }

  function getCompetitorProfilePath(sessionId, competitorId) {
    assertValidCompetitorId(competitorId);
    return path.join(getCompetitorsDir(sessionId), `${competitorId}.json`);
  }

  async function ensureSessionDir(sessionId) {
    await fs.mkdir(getSessionDir(sessionId), { recursive: true });
  }

  async function readJsonOrNull(filePath, label) {
    try {
      return await tryReadJsonFile(filePath, label);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
    return value;
  }

  return {
    assertValidSessionId,
    assertValidCompetitorId,

    async upsertSession(sessionId, idea, state, nextOwnerId = null) {
      await ensureSessionDir(sessionId);

      const filePath = getSessionPath(sessionId);
      const now = Date.now();
      const existing = await readJsonOrNull(filePath, sessionId);

      const session = {
        sessionId,
        ownerId: existing?.ownerId || nextOwnerId,
        idea,
        createdAt: existing?.createdAt || now,
        lastAccessedAt: now,
        state,
      };

      await writeJson(filePath, session);

      logger.info("Market research session saved", {
        sessionId,
        component: "MarketResearchRepository",
      });

      return session;
    },

    async getSession(sessionId) {
      const filePath = getSessionPath(sessionId);
      const session = await readJsonOrNull(filePath, sessionId);
      if (!session) {
        return null;
      }

      session.lastAccessedAt = Date.now();
      await writeJson(filePath, session);
      return session;
    },

    async deleteSession(sessionId) {
      const sessionDir = getSessionDir(sessionId);
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
        return true;
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        throw error;
      }
    },

    async markSessionComplete(sessionId, competitorCount) {
      const session = await readJsonOrNull(getSessionPath(sessionId), sessionId);
      if (!session) {
        return;
      }

      const now = Date.now();
      await writeJson(getSessionPath(sessionId), {
        ...session,
        lastAccessedAt: now,
        state: {
          ...(session.state || {}),
          status: "complete",
          competitorCount,
          completedAt: now,
        },
      });

      logger.info("Market research session marked complete", {
        sessionId,
        competitorCount,
        component: "MarketResearchRepository",
      });
    },

    async listSessions() {
      let entries;
      try {
        entries = await fs.readdir(marketResearchDir, { withFileTypes: true });
      } catch {
        return [];
      }

      const sessions = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const session = await readJsonOrNull(
          path.join(marketResearchDir, entry.name, "session.json"),
          entry.name,
        );
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    },

    async getCompetitorTasks(sessionId) {
      return readJsonOrNull(
        getCompetitorTasksPath(sessionId),
        `${sessionId} competitor tasks`,
      );
    },

    async saveCompetitorTasks(sessionId, tasks) {
      await ensureSessionDir(sessionId);
      return writeJson(getCompetitorTasksPath(sessionId), tasks);
    },

    async getCompetitorProfile(sessionId, competitorId) {
      return readJsonOrNull(
        getCompetitorProfilePath(sessionId, competitorId),
        competitorId,
      );
    },

    async saveCompetitorProfile(sessionId, competitorId, profile) {
      await ensureSessionDir(sessionId);
      return writeJson(getCompetitorProfilePath(sessionId, competitorId), profile);
    },

    async getCompetitorProfiles(sessionId, competitorIds) {
      const profiles = [];

      for (const competitorId of competitorIds) {
        try {
          const profile = await this.getCompetitorProfile(sessionId, competitorId);
          if (profile) {
            profiles.push(profile);
          }
        } catch (error) {
          logger.warn("Could not read competitor output", {
            component: "MarketResearchRepository",
            sessionId,
            competitorId,
            error: error.message,
          });
        }
      }

      return profiles;
    },

    async getReport(sessionId) {
      return readJsonOrNull(getReportPath(sessionId), `${sessionId} report`);
    },

    async saveReport(sessionId, report) {
      await ensureSessionDir(sessionId);
      return writeJson(getReportPath(sessionId), report);
    },

    async getOpportunity(sessionId) {
      return readJsonOrNull(
        getOpportunityPath(sessionId),
        `${sessionId} opportunity`,
      );
    },

    async saveOpportunity(sessionId, opportunity) {
      await ensureSessionDir(sessionId);
      return writeJson(getOpportunityPath(sessionId), opportunity);
    },
  };
}

export const marketResearchRepository = createFileMarketResearchRepository();
