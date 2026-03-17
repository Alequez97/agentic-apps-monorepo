function getTargetDefinitions(task) {
  switch (task.type) {
    case "market-research-initial":
      return {
        report_draft: {
          description: "Persist the initial report draft JSON for the current session.",
          save: ({ marketResearchRepository, sessionId, payload }) =>
            marketResearchRepository.saveReport(sessionId, payload),
        },
        competitor_tasks: {
          description:
            "Persist the delegated competitor task reference list for the current session.",
          save: ({ marketResearchRepository, sessionId, payload }) =>
            marketResearchRepository.saveCompetitorTasks(sessionId, payload),
        },
      };
    case "market-research-competitor":
      return {
        competitor_profile: {
          description: "Persist the researched competitor profile JSON for the current session.",
          save: ({ marketResearchRepository, sessionId, competitorId, payload }) =>
            marketResearchRepository.saveCompetitorProfile(sessionId, competitorId, payload),
        },
      };
    case "market-research-summary":
      return {
        opportunity: {
          description: "Persist the market opportunity verdict JSON for the current session.",
          save: ({ marketResearchRepository, sessionId, payload }) =>
            marketResearchRepository.saveOpportunity(sessionId, payload),
        },
      };
    default:
      return {};
  }
}

export function createMarketResearchOutputToolExecutor({ task, marketResearchRepository }) {
  const targets = getTargetDefinitions(task);
  const targetNames = Object.keys(targets);

  return {
    tools: [
      {
        name: "write_output",
        description: `Persist structured task output. Available targets for this task: ${targetNames.join(", ")}`,
        parameters: {
          target: {
            type: "string",
            enum: targetNames,
            description: "Logical output target to persist.",
          },
          payload: {
            type: "string",
            description: "JSON-encoded structured payload to persist for the selected target.",
          },
        },
        required: ["target", "payload"],
      },
    ],

    async executeTool(toolName, args = {}) {
      if (toolName !== "write_output") {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const { target, payload } = args;
      const handler = targets[target];
      if (!handler) {
        throw new Error(`Unsupported output target: ${target}`);
      }
      if (payload === undefined) {
        throw new Error("write_output requires payload");
      }

      let parsedPayload;
      try {
        parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
      } catch {
        throw new Error("write_output: payload must be valid JSON");
      }

      await handler.save({
        marketResearchRepository,
        sessionId: task.params?.sessionId,
        competitorId: task.params?.competitorId,
        payload: parsedPayload,
      });

      return JSON.stringify(
        {
          success: true,
          target,
          message: `Persisted ${target}`,
        },
        null,
        2,
      );
    },
  };
}
