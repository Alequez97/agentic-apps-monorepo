import * as logger from "../utils/logger.js";

function normalizeDelegationTarget(type, target) {
  if (typeof target === "function") {
    return { queue: target };
  }

  if (!target || typeof target.queue !== "function") {
    throw new Error(`Delegation target "${type}" requires queue()`);
  }

  return target;
}

export const DELEGATION_TOOLS = [
  {
    name: "delegate_task",
    description: `Queue a follow-up task for a specialized agent based on your findings.

How to use:
  1. Provide the delegation request inline via the request field.
  2. Call delegate_task with type, request, and any required params.

The request content becomes the user message or briefing for the delegated agent.`,
    parameters: {
      type: {
        type: "string",
        description: "The delegated task type to queue.",
      },
      request: {
        type: "string",
        description: "Inline delegation request content.",
      },
      params: {
        type: "object",
        description:
          "Additional parameters passed to the queue function. Required fields depend on the delegated task type.",
      },
    },
    required: ["type", "request"],
  },
];

export class DelegationToolExecutor {
  constructor(projectRoot, parentTaskId, delegationTargets) {
    this.projectRoot = projectRoot;
    this.parentTaskId = parentTaskId;
    this.delegationTargets = delegationTargets;
  }

  async execute(toolName, args) {
    if (toolName === "delegate_task") {
      return this._delegateTask(args);
    }
    return {
      success: false,
      error: { message: `Unknown delegation tool: ${toolName}` },
    };
  }

  async _delegateTask({ type, domainId, request, params = {} } = {}) {
    try {
      if (!type || !request) {
        return {
          success: false,
          error: {
            message: "type and request are required",
          },
        };
      }

      const target = this.delegationTargets[type];
      if (!target) {
        return {
          success: false,
          error: {
            code: "UNSUPPORTED_TYPE",
            message: `No delegation target registered for type: ${type}`,
          },
        };
      }

      const delegationTarget = normalizeDelegationTarget(type, target);
      const requestContent = request.trim();
      if (!requestContent) {
        return {
          success: false,
          error: {
            code: "EMPTY_INSTRUCTION",
            message: "Delegation request is empty",
          },
        };
      }

      const mergedParams = { ...(domainId ? { domainId } : {}), ...params };
      const queueParams = await this._buildQueueParams(
        type,
        delegationTarget,
        mergedParams,
        requestContent,
      );

      logger.info("Delegating task", {
        component: "DelegationTools",
        type,
        parentTaskId: this.parentTaskId,
        ...this._buildLogContext(delegationTarget, mergedParams, queueParams),
      });

      const task = await delegationTarget.queue(queueParams);

      if (task?.success === false) {
        return {
          success: false,
          error: {
            message: task.error || "Failed to queue delegated task",
            code: task.code,
          },
        };
      }

      logger.info("Delegated task queued", {
        component: "DelegationTools",
        taskId: task.id,
        type: task.type,
        ...this._buildSuccessContext(delegationTarget, mergedParams, task),
      });

      return {
        success: true,
        data: this._buildSuccessData(type, delegationTarget, mergedParams, task),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message || "Failed to queue delegated task",
        },
      };
    }
  }

  async _buildQueueParams(type, delegationTarget, mergedParams, requestContent) {
    if (typeof delegationTarget.buildQueueParams !== "function") {
      throw new Error(
        `Delegation target "${type}" requires buildQueueParams()`,
      );
    }

    return delegationTarget.buildQueueParams({
      type,
      parentTaskId: this.parentTaskId,
      params: mergedParams,
      requestContent,
    });
  }

  _buildLogContext(delegationTarget, mergedParams, queueParams) {
    if (typeof delegationTarget.buildLogContext === "function") {
      return delegationTarget.buildLogContext({
        params: mergedParams,
        queueParams,
      });
    }

    return {};
  }

  _buildSuccessContext(delegationTarget, mergedParams, task) {
    if (typeof delegationTarget.buildSuccessContext === "function") {
      return delegationTarget.buildSuccessContext({
        params: mergedParams,
        task,
      });
    }

    return {};
  }

  _buildSuccessData(type, delegationTarget, mergedParams, task) {
    if (typeof delegationTarget.buildSuccessData === "function") {
      return delegationTarget.buildSuccessData({
        type,
        params: mergedParams,
        task,
      });
    }

    return {
      taskId: task.id,
      type: task.type,
      message: `Queued ${type} task (taskId: ${task.id})`,
    };
  }
}
