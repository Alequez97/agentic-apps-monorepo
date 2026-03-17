import { Router } from "express";
import * as logger from "../utils/logger.js";
import {
  upsertSession,
  getSession,
  getMarketResearchReport,
  getCompetitorProfile,
  listSessions,
} from "../persistence/market-research.js";
import { getSubscriptionPlanDetails } from "../services/subscription.js";
import { requireAuth } from "../middleware/auth.js";

async function requireOwnedReport(req, res, reportId) {
  const reportSession = await getSession(reportId);

  if (!reportSession) {
    res.status(404).json({ error: "Report not found or expired" });
    return null;
  }

  if (reportSession.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return reportSession;
}

export function createMarketResearchRouter({ taskQueue }) {
  const router = Router();

  // GET /api/market-research
  // List report history entries.
  // Optional ?reportId= query param to filter to a specific report.
  router.get("/", requireAuth, async (req, res) => {
    const { reportId } = req.query;
    try {
      const sessions = await listSessions();
      let filtered = reportId
        ? sessions.filter((entry) => entry.sessionId === reportId)
        : sessions;

      filtered = filtered.filter((entry) => entry.ownerId === req.userId);

      const history = filtered
        .map((entry) => ({
          id: entry.sessionId,
          idea: entry.idea,
          completedAt: entry.state?.completedAt ?? entry.createdAt,
          competitorCount: entry.state?.competitorCount ?? 0,
          status: entry.state?.status ?? "analyzing",
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

  // PUT /api/market-research/:reportId
  // Save or overwrite one report state.
  router.put("/:reportId", requireAuth, async (req, res) => {
    const { reportId } = req.params;
    const { idea, state } = req.body;

    if (!idea || typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ error: "idea is required" });
    }
    if (!state || typeof state !== "object") {
      return res.status(400).json({ error: "state object is required" });
    }

    try {
      const reportSession = await upsertSession(
        reportId,
        idea.trim(),
        state,
        req.userId,
      );
      return res.json({ session: reportSession });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid reportId format" });
      }
      logger.error("Failed to save market research report state", {
        error: error.message,
        reportId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to save report state" });
    }
  });

  // GET /api/market-research/:reportId
  // Retrieve a stored report state by ID.
  router.get("/:reportId", requireAuth, async (req, res) => {
    const { reportId } = req.params;

    try {
      const reportSession = await requireOwnedReport(req, res, reportId);
      if (!reportSession) return;
      return res.json({ session: reportSession });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid reportId format" });
      }
      logger.error("Failed to get market research report state", {
        error: error.message,
        reportId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to load report state" });
    }
  });

  // POST /api/market-research/:reportId/analyze
  // Queue a market research run for this report.
  router.post("/:reportId/analyze", requireAuth, async (req, res) => {
    const { reportId } = req.params;
    const { idea, regions } = req.body;

    if (!idea || typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ error: "idea is required" });
    }

    const normalizedRegions =
      Array.isArray(regions) && regions.length > 0 ? regions : null;

    const plan = await getSubscriptionPlanDetails(req.userId);
    if (!plan) {
      return res.status(403).json({ error: "No subscription plan found" });
    }
    const numCompetitors = plan.numCompetitors;

    try {
      await upsertSession(
        reportId,
        idea.trim(),
        {
          status: "analyzing",
          numCompetitors,
        },
        req.userId,
      );
    } catch (persistError) {
      logger.warn("Failed to persist report state before queuing task", {
        error: persistError.message,
        reportId,
        component: "MarketResearchRoutes",
      });
    }

    try {
      const task = await taskQueue.queueMarketResearchInitialTask({
        sessionId: reportId,
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
        reportId,
        component: "MarketResearchRoutes",
      });

      return res.status(201).json({ task });
    } catch (error) {
      if (error.message === "Invalid sessionId format") {
        return res.status(400).json({ error: "Invalid reportId format" });
      }
      logger.error("Failed to queue market research task", {
        error: error.message,
        reportId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to start analysis" });
    }
  });

  // GET /api/market-research/:reportId/competitors/:competitorId
  // Retrieve one competitor profile for a report.
  router.get(
    "/:reportId/competitors/:competitorId",
    requireAuth,
    async (req, res) => {
      const { reportId, competitorId } = req.params;

      try {
        const reportSession = await requireOwnedReport(req, res, reportId);
        if (!reportSession) return;

        const profile = await getCompetitorProfile(reportId, competitorId);
        if (!profile) {
          return res.status(404).json({ error: "Competitor profile not found" });
        }
        return res.json({ competitor: profile });
      } catch (error) {
        if (
          error.message === "Invalid sessionId format" ||
          error.message === "Invalid competitorId format"
        ) {
          return res.status(400).json({ error: "Invalid request" });
        }
        logger.error("Failed to load competitor profile", {
          error: error.message,
          reportId,
          competitorId,
          component: "MarketResearchRoutes",
        });
        return res
          .status(500)
          .json({ error: "Failed to load competitor profile" });
      }
    },
  );

  // GET /api/market-research/:reportId/report
  // Retrieve the final generated report payload.
  router.get("/:reportId/report", requireAuth, async (req, res) => {
    const { reportId } = req.params;

    try {
      const reportSession = await requireOwnedReport(req, res, reportId);
      if (!reportSession) return;

      const report = await getMarketResearchReport(reportId);
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
        return res.status(400).json({ error: "Invalid reportId format" });
      }
      logger.error("Failed to load market research report", {
        error: error.message,
        reportId,
        component: "MarketResearchRoutes",
      });
      return res.status(500).json({ error: "Failed to load report" });
    }
  });

  return router;
}
