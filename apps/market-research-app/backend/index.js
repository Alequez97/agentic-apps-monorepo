import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  TaskOrchestrator,
  createQueueProcessor,
  TASK_EVENTS,
} from "@jfs/agentic-server";
import config from "./config.js";
import { createRegistry } from "./tasks/handlers/index.js";
import { createMarketResearchRouter } from "./routes/market-research.js";
import authRouter from "./routes/auth.js";
import { startCleanupJob } from "./utils/market-research-cleanup.js";
import { SOCKET_EVENTS } from "./constants/socket-events.js";
import { TASK_TYPES } from "./constants/task-types.js";
import * as logger from "./utils/logger.js";

const app = express();
app.set("etag", false);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  },
});

// ==================== Orchestrator ====================

const orchestrator = new TaskOrchestrator({
  registry: null, // set below after createRegistry
  queueDir: config.queueDir,
  apiKeys: config.apiKeys,
  workingDirectory: config.workingDirectory,
  allowedOutputPrefix: config.allowedOutputPrefix,
});

const registry = createRegistry(orchestrator);
orchestrator.registry = registry;

const queueProcessor = createQueueProcessor(orchestrator);

// ==================== Socket.IO bridge ====================

const LOG_EVENT_MAP = {
  [TASK_TYPES.MARKET_RESEARCH_INITIAL]:
    SOCKET_EVENTS.LOG_MARKET_RESEARCH_INITIAL,
  [TASK_TYPES.MARKET_RESEARCH_COMPETITOR]:
    SOCKET_EVENTS.LOG_MARKET_RESEARCH_COMPETITOR,
  [TASK_TYPES.MARKET_RESEARCH_SUMMARY]:
    SOCKET_EVENTS.LOG_MARKET_RESEARCH_SUMMARY,
};

orchestrator.on(TASK_EVENTS.QUEUED, ({ task }) => {
  io.emit(SOCKET_EVENTS.TASK_QUEUED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId ?? null,
    competitorName: task.params?.competitorName ?? null,
    competitorId: task.params?.competitorId ?? null,
    competitorUrl: task.params?.competitorUrl ?? null,
    delegatedByTaskId: task.params?.delegatedByTaskId ?? null,
    agent: task.agentConfig?.agent ?? null,
    model: task.agentConfig?.model ?? null,
    params: task.params ?? {},
  });

  if (
    task.type === TASK_TYPES.MARKET_RESEARCH_COMPETITOR &&
    task.params?.competitorId
  ) {
    io.emit(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_FOUND, {
      sessionId: task.params.sessionId,
      taskId: task.id,
      competitorId: task.params.competitorId,
      competitorName: task.params.competitorName,
      competitorUrl: task.params.competitorUrl,
      competitorDescription: task.params.competitorDescription ?? "",
    });
  }
});

orchestrator.on(TASK_EVENTS.STARTED, ({ task }) => {
  io.emit(SOCKET_EVENTS.TASK_STARTED, {
    taskId: task.id,
    type: task.type,
    params: task.params ?? {},
  });
});

orchestrator.on(TASK_EVENTS.PROGRESS, (data) => {
  io.emit(SOCKET_EVENTS.TASK_PROGRESS, {
    taskId: data.taskId,
    type: data.type,
    domainId: data.params?.domainId ?? null,
    stage: data.stage ?? null,
    message: data.message ?? null,
    kind: data.kind ?? "log",
    params: data.params ?? {},
  });

  const logEvent = LOG_EVENT_MAP[data.type];
  if (logEvent && data.kind !== "task_progress" && data.message) {
    io.emit(logEvent, {
      taskId: data.taskId,
      sessionId: data.params?.sessionId,
      log: data.message,
      kind: data.kind,
      stage: data.stage,
    });
  }
});

orchestrator.on(TASK_EVENTS.COMPLETED, ({ task }) => {
  io.emit(SOCKET_EVENTS.TASK_COMPLETED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId ?? null,
    params: task.params ?? {},
  });
});

orchestrator.on(TASK_EVENTS.FAILED, ({ task, error }) => {
  io.emit(SOCKET_EVENTS.TASK_FAILED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId ?? null,
    error: error ?? "Task failed",
    params: task.params ?? {},
  });
});

orchestrator.on(TASK_EVENTS.CANCELED, ({ task }) => {
  io.emit(SOCKET_EVENTS.TASK_CANCELED, {
    taskId: task.id,
    type: task.type,
    domainId: task.params?.domainId ?? null,
    params: task.params ?? {},
  });
});

// Bridge market-research lifecycle events emitted by handlers
orchestrator.on(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, (data) => {
  io.emit(SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY, data);
});

orchestrator.on(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED, (data) => {
  io.emit(SOCKET_EVENTS.MARKET_RESEARCH_COMPETITOR_UPDATED, data);
});

// ==================== Middleware ====================

app.use(cors({ credentials: true, origin: (origin, cb) => cb(null, true) }));
app.use(cookieParser());
app.use(express.json());

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

// ==================== Routes ====================

app.use("/api/market-research", createMarketResearchRouter(orchestrator));
app.use("/api/auth", authRouter);

app.get("/api/tasks", async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    const filters = {};
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

// ==================== Start ====================

const PORT = config.port;

httpServer.listen(PORT, async () => {
  logger.info(`Market Research Backend listening on port ${PORT}`, {
    component: "Server",
    port: PORT,
    dataDir: config.dataDir,
  });

  try {
    await orchestrator.recoverOrphanedTasks();
    logger.info("Orphaned task recovery complete", { component: "Server" });
  } catch (error) {
    logger.warn("Orphaned task recovery failed (non-fatal)", {
      component: "Server",
      error: error.message,
    });
  }

  startCleanupJob();
  queueProcessor.start();

  logger.info("Queue processor started", { component: "Server" });
});
