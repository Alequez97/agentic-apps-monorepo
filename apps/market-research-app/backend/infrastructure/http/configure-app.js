import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { createAuthRouter } from "../../routes/auth.js";
import { createMarketResearchRouter } from "../../routes/market-research.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrf } from "../../middleware/csrf.js";
import * as logger from "../../utils/logger.js";

export function configureApp({
  app,
  isAllowedOrigin,
  taskQueue,
  marketResearchRepository,
  subscriptionService,
  userRepository,
  orchestrator,
}) {
  app.set("etag", false);

  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api", requireCsrf);

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Surrogate-Control", "no-store");
    }
    next();
  });

  app.use((req, res, next) => {
    logger.http(req.method, req.path);
    next();
  });

  app.use(
    "/api/market-research",
    createMarketResearchRouter({
      taskQueue,
      marketResearchRepository,
      subscriptionService,
    }),
  );
  app.use(
    "/api/auth",
    createAuthRouter({ userRepository, subscriptionService }),
  );

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { dateFrom, dateTo, status } = req.query;
      const filters = { ownerId: req.userId };
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (status) filters.status = status.split(",").map((s) => s.trim());
      const tasks = await orchestrator.getTasks(filters);
      res.json({ tasks });
    } catch (err) {
      logger.error("Error reading tasks", { error: err, component: "API" });
      res.status(500).json({ error: "Failed to read tasks" });
    }
  });

  app.get("/api/status", (_req, res) => {
    res.json({ status: "ok", service: "market-research-backend" });
  });
}
