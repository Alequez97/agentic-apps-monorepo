import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import * as logger from "../utils/logger.js";
import { tryReadJsonFile } from "./utils.js";

const MARKET_RESEARCH_DIR = path.join(config.dataDir, "market-research");

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

export function getMarketResearchSessionDir(sessionId) {
  assertValidSessionId(sessionId);
  return path.join(MARKET_RESEARCH_DIR, sessionId);
}

export function getMarketResearchCompetitorTasksPath(sessionId) {
  return path.join(
    getMarketResearchSessionDir(sessionId),
    "competitor-tasks.json",
  );
}

export function getMarketResearchCompetitorsDir(sessionId) {
  return path.join(getMarketResearchSessionDir(sessionId), "competitors");
}

export function getMarketResearchReportPath(sessionId) {
  return path.join(getMarketResearchSessionDir(sessionId), "report.json");
}

export function getMarketResearchOpportunityPath(sessionId) {
  return path.join(getMarketResearchSessionDir(sessionId), "opportunity.json");
}

export function getMarketResearchCompetitorProfilePath(
  sessionId,
  competitorId,
) {
  assertValidCompetitorId(competitorId);
  return path.join(
    getMarketResearchCompetitorsDir(sessionId),
    `${competitorId}.json`,
  );
}

function sessionPath(sessionId) {
  return path.join(getMarketResearchSessionDir(sessionId), "session.json");
}

async function ensureSessionDir(sessionId) {
  await fs.mkdir(getMarketResearchSessionDir(sessionId), { recursive: true });
}

export async function upsertSession(sessionId, idea, state) {
  await ensureSessionDir(sessionId);

  const filePath = sessionPath(sessionId);
  const now = Date.now();

  let createdAt = now;
  let ownerId = null;
  try {
    const existing = await tryReadJsonFile(filePath, sessionId);
    if (existing?.createdAt) createdAt = existing.createdAt;
    if (existing?.ownerId) ownerId = existing.ownerId;
  } catch {
    // New session
  }

  const session = {
    sessionId,
    ownerId,
    idea,
    createdAt,
    lastAccessedAt: now,
    state,
  };

  await fs.writeFile(filePath, JSON.stringify(session, null, 2));

  logger.info("Market research session saved", {
    sessionId,
    component: "MarketResearchPersistence",
  });

  return session;
}

export async function getSession(sessionId) {
  const filePath = sessionPath(sessionId);

  let session;
  try {
    session = await tryReadJsonFile(filePath, sessionId);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }

  if (!session) return null;

  session.lastAccessedAt = Date.now();
  await fs.writeFile(filePath, JSON.stringify(session, null, 2));

  return session;
}

export async function deleteSession(sessionId) {
  const filePath = sessionPath(sessionId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function markSessionComplete(sessionId, competitorCount) {
  const filePath = sessionPath(sessionId);

  let session;
  try {
    session = await tryReadJsonFile(filePath, sessionId);
  } catch {
    return;
  }

  if (!session) return;

  const now = Date.now();
  const updated = {
    ...session,
    lastAccessedAt: now,
    state: {
      ...(session.state || {}),
      status: "complete",
      competitorCount,
      completedAt: now,
    },
  };

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

  logger.info("Market research session marked complete", {
    sessionId,
    competitorCount,
    component: "MarketResearchPersistence",
  });
}

export async function listSessions() {
  let entries;
  try {
    entries = await fs.readdir(MARKET_RESEARCH_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const sessions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const filePath = path.join(MARKET_RESEARCH_DIR, entry.name, "session.json");
    try {
      const session = await tryReadJsonFile(filePath, entry.name);
      if (session) sessions.push(session);
    } catch {
      // Skip unreadable files
    }
  }

  return sessions;
}

export async function claimSession(sessionId, userId) {
  const filePath = sessionPath(sessionId);

  let session;
  try {
    session = await tryReadJsonFile(filePath, sessionId);
  } catch {
    return false;
  }

  if (!session) return false;

  const updated = { ...session, ownerId: userId, lastAccessedAt: Date.now() };
  await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

  logger.info("Market research session claimed", {
    sessionId,
    userId,
    component: "MarketResearchPersistence",
  });

  return true;
}

export async function getCompetitorProfile(sessionId, competitorId) {
  const profilePath = getMarketResearchCompetitorProfilePath(
    sessionId,
    competitorId,
  );

  try {
    return await tryReadJsonFile(profilePath, competitorId);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function getCompetitorProfiles(sessionId, competitorIds) {
  const profiles = [];

  for (const competitorId of competitorIds) {
    try {
      const profile = await getCompetitorProfile(sessionId, competitorId);
      if (profile) {
        profiles.push(profile);
      }
    } catch (error) {
      logger.warn("Could not read competitor output", {
        component: "MarketResearchPersistence",
        sessionId,
        competitorId,
        error: error.message,
      });
    }
  }

  return profiles;
}

export async function getMarketResearchReport(sessionId) {
  const reportPath = getMarketResearchReportPath(sessionId);

  try {
    return await tryReadJsonFile(reportPath, sessionId);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
