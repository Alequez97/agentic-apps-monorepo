import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import Joi from "joi";

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const userParamsSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required(),
});

const sessionParamsSchema = Joi.object({
  sessionId: Joi.string()
    .pattern(/^[0-9a-f-]{36}$/)
    .required(),
});

async function enrichUsersWithSubscriptions(users, subscriptionService) {
  const userIds = users.map((user) => user.userId);
  const subscriptions = await subscriptionService.getSubscriptionsForUsers(userIds);
  const subMap = new Map(subscriptions.map((subscription) => [subscription.userId, subscription]));

  return users.map((user) => {
    const subscription = subMap.get(user.userId);
    return {
      ...user,
      creditsRemaining: subscription?.creditsRemaining ?? 0,
      creditsUsed: subscription?.creditsUsed ?? 0,
      creditsTotal: subscription?.creditsTotal ?? 0,
      plan: subscription?.plan ?? "free",
      subscriptionStatus: subscription?.status ?? "inactive",
    };
  });
}

export function createAdminRouter({ userRepository, marketResearchRepository, subscriptionService }) {
  const router = Router();

  const requireAdmin = async (req, res, next) => {
    try {
      const user = await userRepository.getUser(req.userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("Admin check failed", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };

  router.use(requireAuth);
  router.use(requireAdmin);

  router.get("/users", validateRequest({ query: paginationSchema }), async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      userRepository.listUsers({ limit, skip }),
      userRepository.countUsers(),
    ]);
    const data = await enrichUsersWithSubscriptions(users, subscriptionService);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  router.get("/users/:userId", validateRequest({ params: userParamsSchema }), async (req, res) => {
    const { userId } = req.params;

    const user = await userRepository.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [subscription, allSessions] = await Promise.all([
      subscriptionService.getSubscription(userId),
      marketResearchRepository.listSessions(),
    ]);

    const sessions = allSessions
      .filter((session) => session.ownerId === userId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const sessionSummaries = await Promise.all(
      sessions.map(async (session) => {
        const report = await marketResearchRepository.getReport(session.sessionId);
        return {
          ...session,
          reportSummary: report?.opportunity?.summary ?? null,
          reportVerdict: report?.opportunity?.verdict ?? null,
        };
      }),
    );

    res.json({
      user: {
        ...user,
        creditsRemaining: subscription?.creditsRemaining ?? 0,
        creditsUsed: subscription?.creditsUsed ?? 0,
        creditsTotal: subscription?.creditsTotal ?? 0,
        plan: subscription?.plan ?? "free",
        subscriptionStatus: subscription?.status ?? "inactive",
      },
      subscription,
      sessions: sessionSummaries,
    });
  });

  router.get("/sessions", validateRequest({ query: paginationSchema }), async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      marketResearchRepository.listSessions({ limit, skip }),
      marketResearchRepository.countSessions(),
    ]);

    res.json({
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  router.get(
    "/sessions/:sessionId",
    validateRequest({ params: sessionParamsSchema }),
    async (req, res) => {
      const { sessionId } = req.params;

      const session = await marketResearchRepository.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const [owner, subscription, report, opportunity, competitorTasks] = await Promise.all([
        session.ownerId ? userRepository.getUser(session.ownerId) : Promise.resolve(null),
        session.ownerId ? subscriptionService.getSubscription(session.ownerId) : Promise.resolve(null),
        marketResearchRepository.getReport(sessionId),
        marketResearchRepository.getOpportunity(sessionId),
        marketResearchRepository.getCompetitorTasks(sessionId),
      ]);

      const competitorIds = Array.from(
        new Set(
          (competitorTasks || [])
            .map((entry) => entry?.competitorId)
            .concat((report?.competitors || []).map((entry) => entry?.id))
            .filter(Boolean),
        ),
      );

      const competitors = await marketResearchRepository.getCompetitorProfiles(
        sessionId,
        competitorIds,
      );

      res.json({
        session,
        owner,
        subscription,
        report,
        opportunity: report?.opportunity ?? opportunity ?? null,
        competitorTasks: competitorTasks ?? [],
        competitors,
      });
    },
  );

  return router;
}
