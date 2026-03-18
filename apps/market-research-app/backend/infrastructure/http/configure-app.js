import { dirname, join } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { createAuthRouter } from "../../routes/auth.js";
import { createMarketResearchRouter } from "../../routes/market-research.js";
import { requireCsrf } from "../../middleware/csrf.js";
import * as logger from "../../utils/logger.js";
import { registerSystemRoutes } from "./register-system-routes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
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
      orchestrator,
    }),
  );
  app.use("/api/auth", createAuthRouter({ userRepository, subscriptionService }));

  registerSystemRoutes({ app, orchestrator });

  // Serve frontend static build (same-domain deployment)
  const publicDir = join(__dirname, "../../public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(join(publicDir, "index.html"));
  });
}
