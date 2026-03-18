import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import Joi from "joi";

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
});

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
        userRepository.countUsers()
    ]);

    const userIds = users.map(u => u.userId);
    const subscriptions = await subscriptionService.getSubscriptionsForUsers(userIds);
    const subMap = new Map(subscriptions.map(s => [s.userId, s]));

    const data = users.map(user => {
        const sub = subMap.get(user.userId);
        return {
            ...user,
            creditsRemaining: sub?.creditsRemaining ?? 0,
            creditsUsed: sub?.creditsUsed ?? 0,
            creditsTotal: sub?.creditsTotal ?? 0,
            plan: sub?.plan ?? "free"
        };
    });

    res.json({
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
  });

  router.get("/sessions", validateRequest({ query: paginationSchema }), async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
        marketResearchRepository.listSessions({ limit, skip }),
        marketResearchRepository.countSessions()
    ]);

    res.json({
        data: sessions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
  });

  return router;
}
