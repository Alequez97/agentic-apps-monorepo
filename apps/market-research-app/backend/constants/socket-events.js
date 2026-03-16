export const SOCKET_EVENTS = {
  // Task log streams
  LOG_MARKET_RESEARCH_INITIAL: "log:market-research-initial",
  LOG_MARKET_RESEARCH_COMPETITOR: "log:market-research-competitor",
  LOG_MARKET_RESEARCH_SUMMARY: "log:market-research-summary",

  // Market research lifecycle
  MARKET_RESEARCH_COMPLETED: "market-research:completed",
  MARKET_RESEARCH_REPORT_READY: "market-research:report-ready",
  MARKET_RESEARCH_COMPETITOR_FOUND: "market-research:competitor-found",
  MARKET_RESEARCH_COMPETITOR_UPDATED: "market-research:competitor-updated",

  // Generic task events (mirrored from agentic-server TASK_EVENTS for frontend)
  TASK_QUEUED: "task:queued",
  TASK_STARTED: "task:started",
  TASK_PROGRESS: "task:progress",
  TASK_COMPLETED: "task:completed",
  TASK_FAILED: "task:failed",
  TASK_CANCELED: "task:canceled",
};
