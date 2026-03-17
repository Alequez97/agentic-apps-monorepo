import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import config from "../../config.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { marketResearchInitialHandler } from "./market-research-initial.js";
import { marketResearchCompetitorHandler } from "./market-research-competitor.js";
import { marketResearchSummaryHandler } from "./market-research-summary.js";
import { createMarketResearchOutputToolExecutor } from "./market-research-output-tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTIONS_DIR = path.resolve(__dirname, "../../system-instructions");

function processTemplate(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(placeholder, value || "");
  }
  return result;
}

function buildTemplateVars(task) {
  const sessionId = task.params?.sessionId || "";

  switch (task.type) {
    case TASK_TYPES.MARKET_RESEARCH_INITIAL:
      return {
        SESSION_ID: sessionId,
        IDEA: task.params?.idea || "",
        NUM_COMPETITORS: String(task.params?.numCompetitors ?? 10),
        TARGET_MARKETS:
          Array.isArray(task.params?.regions) && task.params.regions.length > 0
            ? task.params.regions.join(", ")
            : "Worldwide",
      };
    case TASK_TYPES.MARKET_RESEARCH_COMPETITOR:
      return {
        SESSION_ID: sessionId,
        COMPETITOR_ID: task.params?.competitorId || "",
        COMPETITOR_NAME: task.params?.competitorName || "",
        COMPETITOR_URL: task.params?.competitorUrl || "",
        COMPETITOR_DESCRIPTION: task.params?.competitorDescription || "",
      };
    case TASK_TYPES.MARKET_RESEARCH_SUMMARY:
      return {
        SESSION_ID: sessionId,
        IDEA: task.params?.idea || "",
      };
    default:
      return {};
  }
}

async function loadSystemInstruction(filename, task) {
  const filePath = path.join(INSTRUCTIONS_DIR, filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return processTemplate(raw, buildTemplateVars(task));
}

export function createTaskHandlersByType({
  taskScheduler,
  taskEventPublisher,
  marketResearchRepository,
}) {
  return {
    [TASK_TYPES.MARKET_RESEARCH_INITIAL]: async (task, taskLogger, agent) => {
      agent.setFileToolsEnabled(false);
      agent.enableCustomTools(
        createMarketResearchOutputToolExecutor({
          task,
          marketResearchRepository,
        }),
      );

      agent.enableDelegationTools(
        task.id,
        {
          [TASK_TYPES.MARKET_RESEARCH_COMPETITOR]: {
            queue: (params) =>
              taskScheduler.queueMarketResearchCompetitorTask(params),
            buildQueueParams: ({ params, requestContent, parentTaskId }) => ({
              ...params,
              competitorBriefing: requestContent,
              delegatedByTaskId: parentTaskId,
            }),
            buildLogContext: ({ params }) => ({
              competitorId: params.competitorId,
            }),
            buildSuccessContext: ({ params }) => ({
              competitorId: params.competitorId,
            }),
            buildSuccessData: ({ task, params }) => ({
              taskId: task.id,
              type: task.type,
              competitorId: params.competitorId,
              message: `Queued ${task.type} task for competitor '${params.competitorId}' (taskId: ${task.id})`,
            }),
          },
        },
      );

      if (config.apiKeys.braveSearch) {
        agent.enableWebSearchTools(config.apiKeys.braveSearch);
      }

      const systemPrompt = await loadSystemInstruction(
        task.systemInstructionFile,
        task,
      );

      return {
        systemPrompt,
        ...marketResearchInitialHandler(task, taskLogger, agent, {
          taskScheduler,
          marketResearchRepository,
        }),
      };
    },

    [TASK_TYPES.MARKET_RESEARCH_COMPETITOR]: async (
      task,
      taskLogger,
      agent,
    ) => {
      agent.setFileToolsEnabled(false);
      agent.enableCustomTools(
        createMarketResearchOutputToolExecutor({
          task,
          marketResearchRepository,
        }),
      );

      if (config.apiKeys.braveSearch) {
        agent.enableWebSearchTools(config.apiKeys.braveSearch);
      }
      agent.enableWebFetchTools();

      const systemPrompt = await loadSystemInstruction(
        task.systemInstructionFile,
        task,
      );

      return {
        systemPrompt,
        ...marketResearchCompetitorHandler(task, taskLogger, agent, {
          taskEventPublisher,
          marketResearchRepository,
        }),
      };
    },

    [TASK_TYPES.MARKET_RESEARCH_SUMMARY]: async (task, taskLogger, agent) => {
      agent.setFileToolsEnabled(false);
      agent.enableCustomTools(
        createMarketResearchOutputToolExecutor({
          task,
          marketResearchRepository,
        }),
      );

      const systemPrompt = await loadSystemInstruction(
        task.systemInstructionFile,
        task,
      );

      return {
        systemPrompt,
        ...(await marketResearchSummaryHandler(task, taskLogger, agent, {
          taskEventPublisher,
          marketResearchRepository,
        })),
      };
    },
  };
}
