import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import * as logger from "../utils/logger.js";

/**
 * Task types that can be targeted by delegate_task.
 */
export const DELEGATABLE_TASK_TYPES = [
  "edit-documentation",
  "edit-diagrams",
  "edit-requirements",
  "edit-bugs-security",
  "edit-refactoring-and-testing",
  "market-research-competitor",
];

/**
 * Maps a delegatable task type to its section type string,
 * which is used when writing the synthetic chat-history file.
 */
const SECTION_TYPE_BY_TASK_TYPE = {
  "edit-documentation": "documentation",
  "edit-diagrams": "diagrams",
  "edit-requirements": "requirements",
  "edit-bugs-security": "bugs-security",
  "edit-refactoring-and-testing": "refactoring-and-testing",
};

/**
 * Tool definitions for LLM — task delegation
 */
export const DELEGATION_TOOLS = [
  {
    name: "delegate_task",
    description: `Queue a follow-up task for a specialized agent based on your findings.

How to use:
  1. Use write_file to create a delegation request file under the temp delegation directory specified by the task instructions/system prompt, describing exactly what the delegated agent should do and why (include relevant context from your analysis).
  2. Call delegate_task with the path to that file, the target task type, and any required params.

The delegation request file content becomes the user message (or briefing) for the delegated agent — treat it like a detailed chat message.`,
    parameters: {
      type: {
        type: "string",
        enum: DELEGATABLE_TASK_TYPES,
        description: "The type of specialized agent to delegate to.",
      },
      requestFile: {
        type: "string",
        description:
          "Relative path (from project root) to the delegation request file you wrote. It must be under the temp prefix allowed by the current task. The file content becomes the delegated agent's user message.",
      },
      params: {
        type: "object",
        description:
          "Additional parameters passed to the queue function. Edit tasks require `domainId`. Market research competitor tasks require `sessionId`, `competitorId`, `competitorName`, `competitorUrl`, and optionally `competitorDescription`.",
      },
    },
    required: ["type", "requestFile"],
  },
];

/**
 * Executor for delegation tools.
 *
 * Reads an instruction file written by the parent agent, then either:
 * - For edit-* types: creates a synthetic chat-history session so the target
 *   edit handler can load it unchanged, then calls the queue function.
 * - For market-research-competitor: calls the queue function directly with
 *   the merged params and competitorBriefing from the request file.
 *
 * @example
 * const executor = new DelegationToolExecutor(
 *   projectRoot,
 *   parentTaskId,
 *   {
 *     "edit-documentation": queueEditDocumentationTask,
 *     "market-research-competitor": queueMarketResearchCompetitorTask,
 *   },
 *   ".code-analysis/temp",
 *   ".code-analysis",
 * );
 */
export class DelegationToolExecutor {
  /**
   * @param {string} projectRoot - Absolute path to the analysed project root
   * @param {string} parentTaskId - ID of the running task that is delegating
   * @param {Object<string, Function>} queueFunctions
   *   Map of task type string → queue function
   * @param {string} [tempPrefix=".code-analysis/temp"] - Prefix under which delegation request files must live
   * @param {string} [analysisRoot] - Root analysis/output directory used for helper files like synthetic chat history
   */
  constructor(
    projectRoot,
    parentTaskId,
    queueFunctions,
    tempPrefix = ".code-analysis/temp",
    analysisRoot = null,
  ) {
    this.projectRoot = projectRoot;
    this.parentTaskId = parentTaskId;
    this.queueFunctions = queueFunctions;
    this.tempPrefix = tempPrefix;
    this.analysisRoot = analysisRoot || tempPrefix.replace(/\/temp$/, "");
  }

  /**
   * Dispatch a tool call by name.
   * @param {string} toolName
   * @param {Object} args
   * @returns {Promise<Object>} { success, data } | { success: false, error }
   */
  async execute(toolName, args) {
    if (toolName === "delegate_task") {
      return this._delegateTask(args);
    }
    return {
      success: false,
      error: { message: `Unknown delegation tool: ${toolName}` },
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  async _delegateTask({ type, domainId, requestFile, params = {} } = {}) {
    // Validate required args
    if (!type || !requestFile) {
      return {
        success: false,
        error: {
          message: "type and requestFile are required",
        },
      };
    }

    // Validate task type
    if (!DELEGATABLE_TASK_TYPES.includes(type)) {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_TYPE",
          message: `Unsupported delegation type: ${type}. Must be one of: ${DELEGATABLE_TASK_TYPES.join(", ")}`,
        },
      };
    }

    // Validate queue function is registered before reading the file
    const queueFn = this.queueFunctions[type];
    if (!queueFn) {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_TYPE",
          message: `No queue function registered for delegation type: ${type}`,
        },
      };
    }

    // Security: requestFile must live under the configured temp prefix.
    const normalized = path.normalize(requestFile).replace(/\\/g, "/");
    if (!normalized.startsWith(`${this.tempPrefix}/`)) {
      return {
        success: false,
        error: {
          code: "ACCESS_DENIED",
          message: `requestFile must be under ${this.tempPrefix}/ (e.g. ${this.tempPrefix}/delegation-requests/my-request.md)`,
        },
      };
    }

    // Read delegation request file
    const absPath = path.join(this.projectRoot, requestFile);
    let requestContent;
    try {
      requestContent = await fs.readFile(absPath, "utf-8");
    } catch {
      return {
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: `Could not read delegation request file: ${requestFile}`,
        },
      };
    }

    if (!requestContent.trim()) {
      return {
        success: false,
        error: {
          code: "EMPTY_INSTRUCTION",
          message: `Delegation request file is empty: ${requestFile}`,
        },
      };
    }

    // Consume and discard — the file is only needed to pass instructions here
    fs.unlink(absPath).catch(() => {});

    // Merge top-level domainId (backwards compat for old edit-task callers) with params
    const mergedParams = { ...(domainId ? { domainId } : {}), ...params };

    // ── market-research-competitor ──────────────────────────────────────────
    if (type === "market-research-competitor") {
      logger.info("Delegating market-research-competitor task", {
        component: "DelegationTools",
        type,
        competitorId: mergedParams.competitorId,
        parentTaskId: this.parentTaskId,
      });

      const task = await queueFn({
        ...mergedParams,
        competitorBriefing: requestContent,
        delegatedByTaskId: this.parentTaskId,
      });

      if (task?.success === false) {
        return {
          success: false,
          error: {
            message: task.error || "Failed to queue delegated competitor task",
            code: task.code,
          },
        };
      }

      logger.info("Delegated competitor task queued", {
        component: "DelegationTools",
        taskId: task.id,
        type: task.type,
        competitorId: mergedParams.competitorId,
      });

      return {
        success: true,
        data: {
          taskId: task.id,
          type: task.type,
          competitorId: mergedParams.competitorId,
          message: `Queued market-research-competitor task for competitor '${mergedParams.competitorId}' (taskId: ${task.id})`,
        },
      };
    }

    // ── edit-* tasks (existing behaviour) ──────────────────────────────────
    const effectiveDomainId = mergedParams.domainId;
    if (!effectiveDomainId) {
      return {
        success: false,
        error: {
          message:
            "domainId is required for edit task delegation (pass via params.domainId or top-level domainId)",
        },
      };
    }

    const sectionType = SECTION_TYPE_BY_TASK_TYPE[type];

    // Generate a unique synthetic chatId for this delegation.
    const syntheticChatId = `delegated-${this.parentTaskId}-${randomBytes(3).toString("hex")}`;

    // Write a synthetic chat-history file so the edit handler loads the
    // delegation request as a first user message — zero changes to handler code.
    await this._writeSyntheticChatHistory({
      domainId: effectiveDomainId,
      sectionType,
      chatId: syntheticChatId,
      content: requestContent,
    });

    logger.info("Delegating task", {
      component: "DelegationTools",
      type,
      domainId: effectiveDomainId,
      parentTaskId: this.parentTaskId,
      syntheticChatId,
    });

    // Queue the delegated task
    const task = await queueFn({
      domainId: effectiveDomainId,
      chatId: syntheticChatId,
      delegatedByTaskId: this.parentTaskId,
    });

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
      domainId: effectiveDomainId,
    });

    return {
      success: true,
      data: {
        taskId: task.id,
        type: task.type,
        domainId: effectiveDomainId,
        message: `Queued ${type} task for domain '${effectiveDomainId}' (taskId: ${task.id})`,
      },
    };
  }

  /**
   * Write a minimal domain-section chat-history file whose sole message is
   * the delegation request content. The edit handler reads this file and uses
   * the last message as the "current user turn" — making delegation transparent.
   */
  async _writeSyntheticChatHistory({ domainId, sectionType, chatId, content }) {
    const chatHistoryDir = path.join(
      this.projectRoot,
      this.analysisRoot,
      "tasks",
      "chat-history",
    );
    await fs.mkdir(chatHistoryDir, { recursive: true });

    const fileName = `domain-${domainId}-${sectionType}-${chatId}.json`;
    const filePath = path.join(chatHistoryDir, fileName);

    const now = new Date().toISOString();
    const history = {
      domainId,
      sectionType,
      chatId,
      delegated: true,
      delegatedByTaskId: this.parentTaskId,
      createdAt: now,
      lastMessageAt: now,
      messages: [
        {
          id: 1,
          role: "user",
          content,
          timestamp: now,
        },
      ],
    };

    await fs.writeFile(filePath, JSON.stringify(history, null, 2), "utf-8");
  }
}
