import { requireAuth } from "../../middleware/auth.js";
import * as logger from "../../utils/logger.js";

export function registerSystemRoutes({ app, orchestrator }) {
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
