import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import { getProgressFileRelativePath } from "@jfs/agentic-server";
import config from "../../config.js";
import { TASK_TYPES } from "../../constants/task-types.js";
import { queueMarketResearchCompetitorTask } from "../queue/market-research-competitor.js";
import {
  marketResearchInitialHandler,
  marketResearchCompetitorHandler,
  marketResearchSummaryHandler,
} from "./market-research.js";

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
  const progressFile = getProgressFileRelativePath(task.id, ".market-research");

  switch (task.type) {
    case TASK_TYPES.MARKET_RESEARCH_INITIAL:
      return {
        SESSION_ID: task.params?.sessionId || "",
        IDEA: task.params?.idea || "",
        NUM_COMPETITORS: String(task.params?.numCompetitors ?? 10),
        TARGET_MARKETS:
          Array.isArray(task.params?.regions) && task.params.regions.length > 0
            ? task.params.regions.join(", ")
            : "Worldwide",
        OUTPUT_FILE: task.outputFile || "",
        PROGRESS_FILE: progressFile,
      };
    case TASK_TYPES.MARKET_RESEARCH_COMPETITOR:
      return {
        SESSION_ID: task.params?.sessionId || "",
        COMPETITOR_ID: task.params?.competitorId || "",
        COMPETITOR_NAME: task.params?.competitorName || "",
        COMPETITOR_URL: task.params?.competitorUrl || "",
        COMPETITOR_DESCRIPTION: task.params?.competitorDescription || "",
        OUTPUT_FILE: task.outputFile || "",
        PROGRESS_FILE: progressFile,
      };
    case TASK_TYPES.MARKET_RESEARCH_SUMMARY:
      return {
        SESSION_ID: task.params?.sessionId || "",
        IDEA: task.params?.idea || "",
        OUTPUT_FILE: task.outputFile || "",
        PROGRESS_FILE: progressFile,
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

export function createRegistry(orchestrator) {
  return {
    [TASK_TYPES.MARKET_RESEARCH_INITIAL]: async (task, taskLogger, agent) => {
      agent.fileToolExecutor.setAllowAnyWrite(true);

      agent.enableDelegationTools(
        task.id,
        {
          "market-research-competitor": (params) =>
            queueMarketResearchCompetitorTask(orchestrator, {
              ...params,
              delegatedByTaskId: task.id,
            }),
        },
        config.delegationTempPrefix,
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
        ...marketResearchInitialHandler(task, taskLogger, agent, orchestrator),
      };
    },

    [TASK_TYPES.MARKET_RESEARCH_COMPETITOR]: async (
      task,
      taskLogger,
      agent,
    ) => {
      agent.fileToolExecutor.setAllowAnyWrite(true);

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
        ...marketResearchCompetitorHandler(
          task,
          taskLogger,
          agent,
          orchestrator,
        ),
      };
    },

    [TASK_TYPES.MARKET_RESEARCH_SUMMARY]: async (task, taskLogger, agent) => {
      agent.fileToolExecutor.setAllowAnyWrite(true);

      const systemPrompt = await loadSystemInstruction(
        task.systemInstructionFile,
        task,
      );

      return {
        systemPrompt,
        ...(await marketResearchSummaryHandler(
          task,
          taskLogger,
          agent,
          orchestrator,
        )),
      };
    },
  };
}
