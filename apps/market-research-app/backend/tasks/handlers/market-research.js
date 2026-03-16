import fs from "fs/promises";
import { PROGRESS_STAGES } from "@jfs/llm-core";
import { tryReadJsonFile } from "@jfs/agentic-server";
import * as marketResearchPersistence from "../../persistence/market-research.js";
import * as logger from "../../utils/logger.js";
import { queueMarketResearchSummaryTask } from "../queue/market-research-summary.js";

export function marketResearchInitialHandler(
  task,
  taskLogger,
  agent,
  orchestrator,
) {
  const { sessionId, idea } = task.params || {};

  const initialMessage =
    "Research the startup idea and identify competitors to delegate to specialist agents as specified in the instructions.";

  const onComplete = async () => {
    let competitorTasks;
    let report;

    try {
      competitorTasks = await tryReadJsonFile(
        marketResearchPersistence.getMarketResearchCompetitorTasksPath(
          sessionId,
        ),
        `${sessionId} competitor tasks`,
      );
      report = await tryReadJsonFile(
        marketResearchPersistence.getMarketResearchReportPath(sessionId),
        `${sessionId} report`,
      );
    } catch (error) {
      logger.warn("Failed to queue market research summary task", {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
        error: error.message,
      });
      throw error;
    }

    if (!report) {
      const error = new Error("report.json is empty or invalid");
      logger.warn(error.message, {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
      });
      throw error;
    }

    if (!Array.isArray(competitorTasks) || competitorTasks.length === 0) {
      const error = new Error("competitor-tasks.json is empty or invalid");
      logger.warn(error.message, {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
      });
      throw error;
    }

    const queuedSummaryTask = await queueMarketResearchSummaryTask(
      orchestrator,
      {
        sessionId,
        idea: report.idea || idea,
        dependsOn: competitorTasks.map((entry) => entry.taskId).filter(Boolean),
      },
    );

    if (queuedSummaryTask?.success === false) {
      const error = new Error(
        queuedSummaryTask.error || "Could not enqueue summary task",
      );
      logger.error(error.message, {
        component: "MarketResearchInitial",
        sessionId,
        taskId: task.id,
        error: queuedSummaryTask.error,
      });
      throw error;
    }

    taskLogger.info(
      `Queued summary task ${queuedSummaryTask.id} waiting on ${competitorTasks.length} competitor task(s)`,
    );
  };

  return buildHandler(
    task,
    taskLogger,
    initialMessage,
    "Identifying competitors...",
    onComplete,
  );
}

export function marketResearchCompetitorHandler(
  task,
  taskLogger,
  agent,
  orchestrator,
) {
  const {
    sessionId,
    competitorId,
    competitorName,
    competitorUrl,
    competitorDescription,
  } = task.params || {};

  const initialMessage = [
    "Research the following competitor and produce a detailed profile.",
    "",
    `Competitor: ${competitorName}`,
    `Website: ${competitorUrl}`,
    competitorDescription ? `Description: ${competitorDescription}` : null,
    "",
    `Session ID: ${sessionId}`,
    `Competitor ID: ${competitorId}`,
    "",
    `Write the complete profile JSON to: market-research/${sessionId}/competitors/${competitorId}.json`,
  ]
    .filter(Boolean)
    .join("\n");

  const onComplete = async () => {
    const competitorPath =
      marketResearchPersistence.getMarketResearchCompetitorProfilePath(
        sessionId,
        competitorId,
      );

    try {
      const competitor = await tryReadJsonFile(competitorPath, competitorId);
      if (!competitor) {
        throw new Error("Competitor profile is empty or invalid");
      }

      orchestrator.emit("market-research:competitor-updated", {
        sessionId,
        taskId: task.id,
        competitor,
      });
    } catch (error) {
      logger.warn("Failed to emit completed competitor payload", {
        component: "MarketResearchCompetitor",
        sessionId,
        taskId: task.id,
        competitorId,
        error: error.message,
      });
    }
  };

  return buildHandler(
    task,
    taskLogger,
    initialMessage,
    `Researching ${competitorName}...`,
    onComplete,
  );
}

export async function marketResearchSummaryHandler(
  task,
  taskLogger,
  agent,
  orchestrator,
) {
  const { sessionId, idea } = task.params || {};

  const competitorTasks = await tryReadJsonFile(
    marketResearchPersistence.getMarketResearchCompetitorTasksPath(sessionId),
    `${sessionId} competitor tasks`,
  );
  if (!Array.isArray(competitorTasks) || competitorTasks.length === 0) {
    throw new Error("competitor-tasks.json is empty or invalid");
  }

  const competitors = await marketResearchPersistence.getCompetitorProfiles(
    sessionId,
    competitorTasks.map((entry) => entry.competitorId).filter(Boolean),
  );

  const competitorProfilesJson = JSON.stringify(competitors, null, 2);
  const initialMessage = [
    "Read the competitor profiles below and produce an honest market verdict.",
    "",
    `Idea: ${idea}`,
    `Session ID: ${sessionId}`,
    "",
    "Competitor profiles JSON:",
    competitorProfilesJson,
    "",
    `Write the result to: market-research/${sessionId}/opportunity.json`,
  ].join("\n");

  const onStart = () => {
    taskLogger.progress("Summarizing market opportunity...", {
      stage: PROGRESS_STAGES.ANALYZING,
    });
  };

  const onComplete = async () => {
    try {
      const [report, opportunity] = await Promise.all([
        tryReadJsonFile(
          marketResearchPersistence.getMarketResearchReportPath(sessionId),
          `${sessionId} report`,
        ),
        tryReadJsonFile(
          marketResearchPersistence.getMarketResearchOpportunityPath(sessionId),
          `${sessionId} opportunity`,
        ),
      ]);

      if (!report) throw new Error("report.json is empty or invalid");
      if (!opportunity) throw new Error("opportunity.json is empty or invalid");

      const competitorMap = new Map(
        competitors.map((competitor) => [competitor.id, competitor]),
      );

      const mergedCompetitors = (report.competitors || []).map((stub) => {
        const full = competitorMap.get(stub.id);
        return full ? { ...stub, ...full } : stub;
      });

      const mergedIds = new Set(
        mergedCompetitors.map((competitor) => competitor.id),
      );
      for (const competitor of competitors) {
        if (!mergedIds.has(competitor.id)) {
          mergedCompetitors.push(competitor);
        }
      }

      const completedReport = {
        ...report,
        competitors: mergedCompetitors,
        opportunity,
        status: "complete",
        completedAt: new Date().toISOString(),
      };

      await fs.mkdir(
        marketResearchPersistence.getMarketResearchSessionDir(sessionId),
        { recursive: true },
      );
      await fs.writeFile(
        marketResearchPersistence.getMarketResearchReportPath(sessionId),
        JSON.stringify(completedReport, null, 2),
        "utf-8",
      );

      await marketResearchPersistence.markSessionComplete(
        sessionId,
        mergedCompetitors.length,
      );

      orchestrator.emit("market-research:report-ready", {
        sessionId,
        taskId: task.id,
      });
    } catch (error) {
      logger.error("Failed to assemble market research report", {
        component: "MarketResearchSummary",
        sessionId,
        taskId: task.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };

  return buildHandler(
    task,
    taskLogger,
    initialMessage,
    "Preparing market summary...",
    onComplete,
    { onStart },
  );
}

function buildHandler(
  task,
  taskLogger,
  initialMessage,
  startMessage,
  onComplete,
  overrides = {},
) {
  return {
    initialMessage,

    onStart:
      overrides.onStart ||
      (() => {
        taskLogger.progress(startMessage, {
          stage: PROGRESS_STAGES.ANALYZING,
        });
      }),

    onProgress: (progress) => {
      if (progress.stage === PROGRESS_STAGES.TOOL_EXECUTION) {
        taskLogger.info(`  ${progress.message}`);
        return;
      }
      if (progress.stage) {
        taskLogger.progress(progress.message, { stage: progress.stage });
      }
    },

    onCompaction: (phase, tokensAfter) => {
      if (phase === "start") {
        taskLogger.progress("Compacting chat history...", {
          stage: PROGRESS_STAGES.COMPACTING,
        });
        taskLogger.log("\n[Compacting] Summarizing conversation...\n");
      } else if (phase === "complete") {
        taskLogger.progress(
          `Compaction complete. Tokens after: ~${tokensAfter}`,
          { stage: PROGRESS_STAGES.COMPACTING },
        );
        taskLogger.log(`[Compacting] Done. Tokens after: ~${tokensAfter}\n`);
      }
    },

    onIteration: (iteration, response) => {
      taskLogger.info(
        `Iteration ${iteration}: ${response?.stop_reason || "in progress"}`,
      );
    },

    onToolCall: (toolName, toolInput) => {
      if (toolName === "web_search") {
        const query = toolInput?.query || "";
        taskLogger.log(`web_search: ${query}`, {
          publicLogText: `Searching: ${query}`,
          kind: "search",
        });
      } else if (toolName === "fetch_url") {
        const url = toolInput?.url || "";
        taskLogger.log(`fetch_url: ${url}`, {
          publicLogText: `Visiting: ${url}`,
          kind: "navigate",
        });
      } else if (toolName === "delegate_task") {
        const delegatedCompetitorName = toolInput?.params?.competitorName || "";
        if (delegatedCompetitorName) {
          taskLogger.log(`delegate_task: ${delegatedCompetitorName}`, {
            publicLogText: `Found competitor: ${delegatedCompetitorName}`,
            kind: "found",
          });
        } else {
          taskLogger.log("delegate_task");
        }
      } else {
        taskLogger.log(toolName);
      }
    },

    onMessage: (message) => {
      if (message) taskLogger.log(message);
    },

    ...(onComplete && { onComplete }),
  };
}
