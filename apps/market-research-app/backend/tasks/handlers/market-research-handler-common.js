import { PROGRESS_STAGES } from "@jfs/llm-core";

export function buildMarketResearchHandler(
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
