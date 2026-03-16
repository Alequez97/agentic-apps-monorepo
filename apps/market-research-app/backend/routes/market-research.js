import { Router } from "express";
import * as logger from "../utils/logger.js";
import {
  upsertSession,
  getSession,
  getMarketResearchReport,
  getCompetitorProfile,
  listSessions,
  claimSession,
} from "../persistence/market-research.js";
import { queueMarketResearchInitialTask } from "../tasks/queue/market-research-initial.js";
import { getSubscriptionPlanDetails } from "../services/subscription.js";
import { softAuth, requireAuth } from "../middleware/auth.js";

export function createMarketResearchRouter(orchestrator) {
  const router = Router();

  // GET /api/market-research
  // List analysis sessions as history entries.
  // Optional ?sessionId= query param to filter to a specific session.
  // When authenticated, only return sessions owned by the authenticated user.
  router.get("/", softAuth, async (req, res) => {
    const { sessionId } = req.query;
    try {
      const sessions = await listSessions();
      let filtered = sessionId
        ? sessions.filter((s) => s.sessionId === sessionId)
        : sessions;

      if (req.userId) {
        filtered = filtered.filter((s) => s.ownerId === req.userId);
      }

      const history = filtered
        .map((s) => ({
          id: s.sessionId,
          idea: s.idea,
          completedAt: s.state?.completedAt ?? s.createdAt,
          competitorCount: s.state?.competitorCount ?? 0,
          status: s.state?.status ?? "analyzing",
        }))
        .sort((a, b) => b.completedAt - a.completedAt);

      return res.json({ history });
    } catch (error) {
      logger.error("Failed to list market research history", {
        error: error.message,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to load history" });
    }
  });

  // PUT /api/market-research/:sessionId
  // Save (or overwrite) an analysis session — called when user logs in
  router.put("/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    const { idea, state } = req.body;

    if (!idea || typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ error: "idea is required" });
    }
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "state object is required" });
    }

    try {
      const session = await upsertSession(sessionId, idea.trim(), state);
      return res.json({ session });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid sessionId format" });
      }
      logger.error("Failed to save market research session", {
        error: error.message,
        sessionId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to save session" });
    }
  });

  // GET /api/market-research/:sessionId
  // Retrieve a stored session by ID
  router.get("/:sessionId", async (req, res) => {
    const { sessionId } = req.params;

    try {
      const session = await getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found or expired" });
      }
      return res.json({ session });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid sessionId format" });
      }
      logger.error("Failed to get market research session", {
        error: error.message,
        sessionId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to load session" });
    }
  });

  // POST /api/market-research/:sessionId/claim
  // Claim an anonymous session for the authenticated user.
  router.post("/:sessionId/claim", requireAuth, async (req, res) => {
    const { sessionId } = req.params;

    try {
      const claimed = await claimSession(sessionId, req.userId);
      if (!claimed) {
        return res.status(404).json({ error: "Session not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid sessionId format" });
      }
      logger.error("Failed to claim session", {
        error: error.message,
        sessionId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to claim session" });
    }
  });

  // POST /api/market-research/:sessionId/analyze
  // Queue an AI market research task for this session
  router.post("/:sessionId/analyze", async (req, res) => {
    const { sessionId } = req.params;
    const { idea, regions } = req.body;

    if (!idea || typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ error: "idea is required" });
    }

    const normalizedRegions =
      Array.isArray(regions) && regions.length > 0 ? regions : null;

    const plan = await getSubscriptionPlanDetails(req.userId ?? null);
    const numCompetitors = plan.numCompetitors;

    try {
      await upsertSession(sessionId, idea.trim(), {
        status: "analyzing",
        numCompetitors,
      });
    } catch (persistError) {
      logger.warn("Failed to persist session before queuing task", {
        error: persistError.message,
        sessionId,
        component: "MarketResearchRoutes",
      });
    }

    try {
      const task = await queueMarketResearchInitialTask(orchestrator, {
        sessionId,
        idea: idea.trim(),
        numCompetitors,
        regions: normalizedRegions,
      });

      if (task?.success === false) {
        return res.status(400).json({
          error: task.error || "Failed to queue market research task",
          code: task.code,
        });
      }

      logger.info("Market research task queued via API", {
        taskId: task.id,
        sessionId,
        component: "MarketResearchRoutes",
      });

      return res.status(201).json({ task });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid sessionId format" });
      }
      logger.error("Failed to queue market research task", {
        error: error.message,
        sessionId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to start analysis" });
    }
  });

  // GET /api/market-research/:sessionId/competitors/:competitorId
  // Retrieve one competitor's detailed profile (written by the agent)
  router.get("/:sessionId/competitors/:competitorId", async (req, res) => {
    const { sessionId, competitorId } = req.params;

    try {
      const profile = await getCompetitorProfile(sessionId, competitorId);
      if (!profile) {
        return res.status(404).json({ error: "Competitor profile not found" });
      }
      return res.json({ competitor: profile });
    } catch (error) {
      if (
        error.message === "Invalid sessionId format" ||
        error.message === "Invalid competitorId format"
      ) {
        return res.status(400).json({ error: error.message });
      }
      logger.error("Failed to load competitor profile", {
        error: error.message,
        sessionId,
        competitorId,
        component: "MarketResearchRoutes",
      });
      return res
        .status(500)
        .json({ error: "Failed to load competitor profile" });
    }
  });

  // GET /api/market-research/:sessionId/report
  // Retrieve the AI-generated report for a session (written by the agent)
  router.get("/:sessionId/report", async (req, res) => {
    const { sessionId } = req.params;

    try {
      const report = await getMarketResearchReport(sessionId);
      if (!report) {
        return res.status(404).json({
          error: "Report not found",
          message:
            "Analysis may still be in progress or has not been started",
        });
      }
      return res.json({ report });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid sessionId format" });
      }
      logger.error("Failed to load market research report", {
        error: error.message,
        sessionId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to load report" });
    }
  });

  return router;
}
