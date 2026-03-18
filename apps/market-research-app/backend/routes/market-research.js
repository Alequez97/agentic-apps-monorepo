import { Router } from "express";
import * as logger from "../utils/logger.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { TASK_TYPES } from "../constants/task-types.js";
import {
  analyzeReportBodySchema,
  competitorParamsSchema,
  listHistoryQuerySchema,
  reportIdParamsSchema,
  upsertSessionBodySchema,
} from "../validation/market-research.js";

async function requireOwnedReport(req, res, reportId, marketResearchRepository) {
  const reportSession = await marketResearchRepository.getSession(reportId);

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

export function createMarketResearchRouter({
  taskQueue,
  marketResearchRepository,
  subscriptionService,
  orchestrator,
}) {
  const router = Router();

  // GET /api/market-research
  // List report history entries.
  // Optional ?reportId= query param to filter to a specific report.
  router.get(
    "/",
    requireAuth,
    validateRequest({ query: listHistoryQuerySchema }),
    async (req, res) => {
    const { reportId } = req.query;
    try {
      const sessions = await marketResearchRepository.listSessions();
      let filtered = reportId
        ? sessions.filter((entry) => entry.sessionId === reportId)
        : sessions;

      filtered = filtered.filter((entry) => entry.ownerId === req.userId);

      const history = filtered
        .map((entry) => ({
          id: entry.sessionId,
          idea: entry.idea,
          completedAt:
            entry.state?.completedAt ??
            entry.state?.failedAt ??
            entry.createdAt,
          competitorCount: entry.state?.competitorCount ?? 0,
          status: entry.state?.status ?? "analyzing",
          error: entry.state?.error ?? null,
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
    },
  );

  // PUT /api/market-research/:reportId
  // Save or overwrite one report state.
  router.put(
    "/:reportId",
    requireAuth,
    validateRequest({
      params: reportIdParamsSchema,
      body: upsertSessionBodySchema,
    }),
    async (req, res) => {
    const { reportId } = req.params;
    const { idea, state } = req.body;

    try {
      const reportSession = await marketResearchRepository.upsertSession(
        reportId,
        idea,
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
    },
  );

  // GET /api/market-research/:reportId
  // Retrieve a stored report state by ID.
  router.get(
    "/:reportId",
    requireAuth,
    validateRequest({ params: reportIdParamsSchema }),
    async (req, res) => {
    const { reportId } = req.params;

    try {
      const reportSession = await requireOwnedReport(
        req,
        res,
        reportId,
        marketResearchRepository,
      );
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
    },
  );

  router.get(
    "/:reportId/status",
    requireAuth,
    validateRequest({ params: reportIdParamsSchema }),
    async (req, res) => {
      const { reportId } = req.params;

      try {
        const reportSession = await requireOwnedReport(
          req,
          res,
          reportId,
          marketResearchRepository,
        );
        if (!reportSession) return;

        const [report, competitorTasks, liveTasks] = await Promise.all([
          marketResearchRepository.getReport(reportId),
          marketResearchRepository.getCompetitorTasks(reportId),
          orchestrator.getTasks({
            ownerId: req.userId,
            status: ["pending", "running", "failed", "completed", "canceled"],
          }),
        ]);

        const filteredLiveTasks = liveTasks.filter(
          (task) =>
            task?.params?.sessionId === reportId &&
            [
              TASK_TYPES.MARKET_RESEARCH_INITIAL,
              TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
              TASK_TYPES.MARKET_RESEARCH_SUMMARY,
            ].includes(task.type),
        );

        const competitorIds = Array.from(
          new Set(
            (competitorTasks || [])
              .map((entry) => entry?.competitorId)
              .concat((report?.competitors || []).map((entry) => entry?.id))
              .filter(Boolean),
          ),
        );

        const competitors = await marketResearchRepository.getCompetitorProfiles(
          reportId,
          competitorIds,
        );

        return res.json({
          session: reportSession,
          report,
          competitorTasks: competitorTasks ?? [],
          competitors,
          tasks: filteredLiveTasks,
        });
      } catch (error) {
        if (error.message === "Invalid sessionId format") {
          return res.status(400).json({ error: "Invalid reportId format" });
        }
        logger.error("Failed to hydrate market research report state", {
          error: error.message,
          reportId,
          component: "MarketResearchRoutes",
        });
        return res.status(500).json({ error: "Failed to load report state" });
      }
    },
  );

  // POST /api/market-research/:reportId/analyze
  // Queue a market research run for this report.
  router.post(
    "/:reportId/analyze",
    requireAuth,
    validateRequest({
      params: reportIdParamsSchema,
      body: analyzeReportBodySchema,
    }),
    async (req, res) => {
    const { reportId } = req.params;
    const { idea, regions } = req.body;

    const normalizedRegions =
      Array.isArray(regions) && regions.length > 0 ? regions : null;

    const plan = await subscriptionService.getSubscriptionPlanDetails(
      req.userId,
    );
    if (!plan) {
      return res.status(403).json({ error: "No subscription plan found" });
    }
    const numCompetitors = plan.numCompetitors;

    try {
      await marketResearchRepository.upsertSession(
        reportId,
        idea,
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
        ownerId: req.userId,
        sessionId: reportId,
        idea,
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
    },
  );

  router.post(
    "/:reportId/cancel",
    requireAuth,
    validateRequest({ params: reportIdParamsSchema }),
    async (req, res) => {
      const { reportId } = req.params;

      try {
        const reportSession = await requireOwnedReport(
          req,
          res,
          reportId,
          marketResearchRepository,
        );
        if (!reportSession) return;

        const tasks = await orchestrator.getTasks({
          ownerId: req.userId,
          status: ["pending", "running"],
        });

        const reportTasks = tasks.filter(
          (task) =>
            task?.params?.sessionId === reportId &&
            [
              TASK_TYPES.MARKET_RESEARCH_INITIAL,
              TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
              TASK_TYPES.MARKET_RESEARCH_SUMMARY,
            ].includes(task.type),
        );

        const cancelResults = await Promise.all(
          reportTasks.map((task) => orchestrator.cancelTask(task.id)),
        );
        const canceledTaskIds = cancelResults
          .filter((result) => result?.success && result.task?.id)
          .map((result) => result.task.id);

        await marketResearchRepository.upsertSession(
          reportId,
          reportSession.idea,
          {
            ...(reportSession.state || {}),
            status: "canceled",
            canceledAt: Date.now(),
          },
          reportSession.ownerId,
        );

        return res.json({
          success: true,
          canceledTaskIds,
        });
      } catch (error) {
        if (error.message === "Invalid sessionId format") {
          return res.status(400).json({ error: "Invalid reportId format" });
        }
        logger.error("Failed to cancel market research task(s)", {
          error: error.message,
          reportId,
          component: "MarketResearchRoutes",
        });
        return res.status(500).json({ error: "Failed to cancel analysis" });
      }
    },
  );

  router.delete(
    "/:reportId",
    requireAuth,
    validateRequest({ params: reportIdParamsSchema }),
    async (req, res) => {
      const { reportId } = req.params;

      try {
        const reportSession = await requireOwnedReport(
          req,
          res,
          reportId,
          marketResearchRepository,
        );
        if (!reportSession) return;

        const tasks = await orchestrator.getTasks({
          ownerId: req.userId,
          status: ["pending", "running"],
        });

        const reportTasks = tasks.filter(
          (task) =>
            task?.params?.sessionId === reportId &&
            [
              TASK_TYPES.MARKET_RESEARCH_INITIAL,
              TASK_TYPES.MARKET_RESEARCH_COMPETITOR,
              TASK_TYPES.MARKET_RESEARCH_SUMMARY,
            ].includes(task.type),
        );

        await Promise.all(
          reportTasks.map((task) => orchestrator.cancelTask(task.id)),
        );

        const deleted = await marketResearchRepository.deleteSession(reportId);

        if (!deleted) {
          return res.status(404).json({ error: "Report not found or expired" });
        }

        return res.json({ success: true });
      } catch (error) {
        if (error.message === "Invalid sessionId format") {
          return res.status(400).json({ error: "Invalid reportId format" });
        }
        logger.error("Failed to delete market research report", {
          error: error.message,
          reportId,
          component: "MarketResearchRoutes",
        });
        return res.status(500).json({ error: "Failed to delete report" });
      }
    },
  );

  // GET /api/market-research/:reportId/competitors/:competitorId
  // Retrieve one competitor profile for a report.
  router.get(
    "/:reportId/competitors/:competitorId",
    requireAuth,
    validateRequest({ params: competitorParamsSchema }),
    async (req, res) => {
      const { reportId, competitorId } = req.params;

      try {
        const reportSession = await requireOwnedReport(
          req,
          res,
          reportId,
          marketResearchRepository,
        );
        if (!reportSession) return;

        const profile = await marketResearchRepository.getCompetitorProfile(
          reportId,
          competitorId,
        );
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
  router.get(
    "/:reportId/report",
    requireAuth,
    validateRequest({ params: reportIdParamsSchema }),
    async (req, res) => {
    const { reportId } = req.params;

    try {
      const reportSession = await requireOwnedReport(
        req,
        res,
        reportId,
        marketResearchRepository,
      );
      if (!reportSession) return;

      const report = await marketResearchRepository.getReport(reportId);
      const status = reportSession.state?.status ?? "analyzing";
      const isComplete =
        status === "complete" ||
        status === "completed" ||
        report?.status === "complete";

      if (!report || !isComplete) {
        return res.json({
          status,
          report: null,
          error: reportSession.state?.error ?? null,
          message:
            status === "failed"
              ? "Analysis failed before a final report was generated"
              : report
                ? "Initial report draft exists, but summary is still in progress"
              : "Analysis may still be in progress or has not been started",
        });
      }
      return res.json({
        status,
        report,
        error: reportSession.state?.error ?? null,
      });
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
    },
  );

  return router;
}
