import * as logger from "./logger.js";

const TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const INTERVAL_MS = 60 * 60 * 1000; // run every hour

let cleanupInterval = null;

export async function cleanupExpiredSessions({ marketResearchRepository }) {
  const sessions = await marketResearchRepository.listSessions();
  if (sessions.length === 0) return;

  const cutoff = Date.now() - TTL_MS;
  let removed = 0;

  for (const session of sessions) {
    if (session.lastAccessedAt < cutoff) {
      await marketResearchRepository.deleteSession(session.sessionId);
      removed++;
      logger.debug("Expired market research session deleted", {
        sessionId: session.sessionId,
        lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
        component: "MarketResearchCleanup",
      });
    }
  }

  if (removed > 0) {
    logger.info(`Cleaned up ${removed} expired market research session(s)`, {
      component: "MarketResearchCleanup",
    });
  }
}

export function startCleanupJob({ marketResearchRepository }) {
  if (cleanupInterval) return;

  cleanupExpiredSessions({ marketResearchRepository }).catch((err) => {
    logger.error("Market research cleanup error on startup", {
      error: err.message,
      component: "MarketResearchCleanup",
    });
  });

  cleanupInterval = setInterval(() => {
    cleanupExpiredSessions({ marketResearchRepository }).catch((err) => {
      logger.error("Market research cleanup error", {
        error: err.message,
        component: "MarketResearchCleanup",
      });
    });
  }, INTERVAL_MS);

  logger.info("Market research cleanup job started (interval: 1h, TTL: 2d)", {
    component: "MarketResearchCleanup",
  });
}

export function stopCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
