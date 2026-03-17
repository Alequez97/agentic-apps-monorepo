import {
  ClaudeClient,
  OpenAIClient,
  DeepSeekClient,
  ChatState,
  OpenAIChatState,
  LLMAgent,
  PROGRESS_STAGES,
} from "@jfs/llm-core";
import {
  setupTaskLogger,
  logTaskHeader,
  logTaskSuccess,
  logTaskError,
} from "../infrastructure/logging/task-run-logger.js";
import { getProviderFromModel } from "../../utils/model-utils.js";
import * as logger from "../../utils/logger.js";

export class LLMTaskRunner {
  constructor({ apiKeys, workingDirectory, allowedOutputPrefix, logsDir }) {
    this.apiKeys = apiKeys;
    this.workingDirectory = workingDirectory;
    this.allowedOutputPrefix = allowedOutputPrefix;
    this.logsDir = logsDir;
  }

  isAvailable() {
    const { anthropic, openai, deepseek, openrouter } = this.apiKeys;
    return Boolean(anthropic || openai || deepseek || openrouter);
  }

  createAgent(agentConfig) {
    const { model, maxTokens, reasoningEffort, maxIterations } = agentConfig;
    const { apiKeys, workingDirectory, allowedOutputPrefix } = this;
    const provider = getProviderFromModel(model);

    if (!provider) {
      throw new Error(
        `Unable to determine provider from model "${model}". Supported: OpenAI (gpt-*, o1-*, o3-*), Anthropic (claude-*, sonnet), DeepSeek (deepseek-*)`,
      );
    }

    let client;
    let state;

    if (provider === "openai") {
      if (!apiKeys.openai) {
        throw new Error(
          `OpenAI model "${model}" selected but OPENAI_API_KEY is not configured`,
        );
      }
      client = new OpenAIClient({
        apiKey: apiKeys.openai,
        model,
        maxTokens,
        reasoningEffort,
      });
      state = new OpenAIChatState(client);
    } else if (provider === "anthropic") {
      if (!apiKeys.anthropic) {
        throw new Error(
          `Claude model "${model}" selected but ANTHROPIC_API_KEY is not configured`,
        );
      }
      client = new ClaudeClient({
        apiKey: apiKeys.anthropic,
        model,
        maxTokens,
        reasoningEffort,
      });
      state = new ChatState(client);
    } else if (provider === "deepseek") {
      if (!apiKeys.deepseek) {
        throw new Error(
          `DeepSeek model "${model}" selected but DEEPSEEK_API_KEY is not configured`,
        );
      }
      client = new DeepSeekClient({
        apiKey: apiKeys.deepseek,
        model,
        maxTokens,
      });
      state = new OpenAIChatState(client);
    } else {
      throw new Error(
        `Unsupported provider "${provider}". Supported: openai, anthropic, deepseek`,
      );
    }

    return new LLMAgent(client, state, {
      workingDirectory,
      allowedOutputPrefix,
      maxIterations: maxIterations || 30,
      maxTokens,
    });
  }

  async execute(task, buildHandler, emitEvent, signal) {
    logger.info(`Executing LLM task: ${task.type}`, {
      component: "LLMTaskRunner",
      taskId: task.id,
      model: task.agentConfig?.model,
    });

    const { taskLogger, logStream } = await setupTaskLogger(task, {
      logsDir: this.logsDir,
      emitEvent,
    });

    const finish = () => {
      logStream.end();
      return new Promise((resolve) => logStream.on("finish", resolve));
    };

    try {
      logTaskHeader(taskLogger, task, this.workingDirectory);

      taskLogger.info("Initializing LLM client...", {
        component: "LLMTaskRunner",
        model: task.agentConfig?.model,
      });
      const agent = this.createAgent(task.agentConfig);
      taskLogger.info("LLM client initialized", {
        component: "LLMTaskRunner",
      });

      const taskHandler = await buildHandler(task, taskLogger, agent);

      taskLogger.progress("Starting analysis...", {
        stage: PROGRESS_STAGES.ANALYZING,
      });
      taskLogger.info(
        `Starting analysis loop (max ${agent.maxIterations} iterations)`,
        { component: "LLMTaskRunner" },
      );

      const result = await agent.run(taskHandler, signal);

      if (result.success === false) {
        const error = result.error || "Task failed";
        logTaskError(taskLogger, task, new Error(error));
        await finish();
        return {
          success: false,
          error,
          taskId: task.id,
          logFile: task.logFile,
        };
      }

      logTaskSuccess(taskLogger, task, agent);
      await finish();
      return { ...result, taskId: task.id, logFile: task.logFile };
    } catch (error) {
      if (signal?.aborted || error.code === "TASK_CANCELLED") {
        await finish();
        return {
          success: false,
          cancelled: true,
          taskId: task.id,
          logFile: task.logFile,
        };
      }

      logTaskError(taskLogger, task, error);
      await finish();
      return {
        success: false,
        error: error.message,
        taskId: task.id,
        logFile: task.logFile,
      };
    }
  }
}

export const LLMApiExecutor = LLMTaskRunner;
