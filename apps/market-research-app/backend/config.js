import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as logger from "./utils/logger.js";
import { TASK_TYPES } from "./constants/task-types.js";
import { MODELS } from "@jfs/llm-core";
import { AGENTS } from "@jfs/llm-core";
import { REASONING_EFFORT } from "@jfs/llm-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

function resolveFromBackendRoot(dir) {
  if (!dir) return null;
  return path.isAbsolute(dir) ? dir : path.resolve(__dirname, dir);
}

const dataDir = (() => {
  const dir = process.env.MR_DATA_DIR;
  if (!dir) {
    logger.error("MR_DATA_DIR env var is not set.");
    process.exit(1);
  }
  return resolveFromBackendRoot(dir);
})();

const dataRootName = path.basename(path.normalize(dataDir));

const config = {
  port: (() => {
    if (!process.env.PORT) {
      logger.error("PORT env var is not set.");
      process.exit(1);
    }
    return parseInt(process.env.PORT, 10);
  })(),

  // Root directory where all market research data is stored.
  // reports/, users/, logs/, tasks/, and temp/ all live here.
  dataDir,

  // Backend root used as the agent file working directory.
  workingDirectory: __dirname,

  // Queue/orchestrator root: tasks/, logs/, temp/ live directly under dataDir.
  queueDir: dataDir,

  // FileToolExecutor write boundary relative to workingDirectory.
  allowedOutputPrefix: dataRootName,

  // Delegation request files temp prefix relative to workingDirectory.
  delegationTempPrefix: `${dataRootName}/temp`,

  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    braveSearch: process.env.BRAVE_SEARCH_API_KEY,
  },

  jwtSecret: process.env.JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,

  tasks: {
    [TASK_TYPES.MARKET_RESEARCH_INITIAL]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_2,
      maxTokens: 64000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.MARKET_RESEARCH_COMPETITOR]: {
      agent: AGENTS.LLM_API,
      model: MODELS.GPT_5_MINI,
      maxTokens: 32000,
      maxIterations: 50,
      reasoningEffort: REASONING_EFFORT.MEDIUM,
    },
    [TASK_TYPES.MARKET_RESEARCH_SUMMARY]: {
      agent: AGENTS.LLM_API,
      model: MODELS.CLAUDE_SONNET_4_6,
      maxTokens: 16000,
      maxIterations: 5,
      reasoningEffort: REASONING_EFFORT.HIGH,
    },
  },
};

export default config;
