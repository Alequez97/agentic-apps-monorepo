import { FileToolExecutor, FILE_TOOLS } from "../tools/file-tools.js";
import { CommandToolExecutor, COMMAND_TOOLS } from "../tools/command-tools.js";
import {
  DelegationToolExecutor,
  DELEGATION_TOOLS,
} from "../tools/delegation-tools.js";
import {
  WebSearchToolExecutor,
  WEB_SEARCH_TOOLS,
} from "../tools/web-search-tools.js";
import {
  WebFetchToolExecutor,
  WEB_FETCH_TOOLS,
} from "../tools/web-fetch-tools.js";
import { PROGRESS_STAGES } from "../constants/progress-stages.js";
import * as logger from "../utils/logger.js";

/**
 * LLMAgent - High-level abstraction for LLM conversations with tool support
 *
 * Encapsulates:
 * - Client + state management
 * - Conversation loop with tool execution
 * - Progress callbacks and streaming
 * - Context compaction
 */
export class LLMAgent {
  /**
   * @param {BaseLLMClient} client - LLM client instance
   * @param {ChatState} state - Chat state manager
   * @param {Object} options - Agent options
   * @param {string} options.workingDirectory - Directory for file operations
   * @param {string} [options.allowedOutputPrefix] - Allowed write prefix (e.g. ".market-research")
   * @param {number} options.maxIterations - Max conversation iterations (default: 30)
   * @param {number} options.maxTokens - Max tokens per response (default: from client config)
   */
  constructor(client, state, options = {}) {
    this.client = client;
    this.state = state;
    this.workingDirectory = options.workingDirectory;
    this.maxIterations = options.maxIterations || 30;
    this.maxTokens = options.maxTokens || client.config?.maxTokens || 4096;
    this.fileToolExecutor = new FileToolExecutor(
      this.workingDirectory,
      options.allowedOutputPrefix,
    );
    this.commandToolExecutor = null; // Enabled per-task via enableCommandTools()
    this.delegationToolExecutor = null; // Enabled per-task via enableDelegationTools()
    this.webSearchToolExecutor = null; // Enabled per-task via enableWebSearchTools()
    this.webFetchToolExecutor = null; // Enabled per-task via enableWebFetchTools()
    this.conversationLog = [];
  }

  /**
   * Enable command execution tools for this agent session.
   * Must be called before run() to take effect.
   *
   * @param {Object} [options]
   * @param {number} [options.timeoutMs] - Command timeout in ms (default: 30 000)
   * @param {string[]} [options.additionalAllowedPrefixes] - Extra safe command prefixes
   */
  enableCommandTools(options = {}) {
    this.commandToolExecutor = new CommandToolExecutor(
      this.workingDirectory,
      options,
    );
    logger.info("Command tools enabled for agent session", {
      component: "LLMAgent",
      timeoutMs: options.timeoutMs,
    });
  }

  /**
   * Enable task-delegation tools for this agent session.
   * Must be called before run() to take effect.
   *
   * @param {string} parentTaskId - ID of the current task (embedded in synthetic chatIds)
   * @param {Object<string, Function>} queueFunctions - Map of task-type → queue function
   */
  enableDelegationTools(
    parentTaskId,
    queueFunctions,
    tempPrefix,
    analysisRoot = null,
  ) {
    this.delegationToolExecutor = new DelegationToolExecutor(
      this.workingDirectory,
      parentTaskId,
      queueFunctions,
      tempPrefix,
      analysisRoot,
    );
    logger.info("Delegation tools enabled for agent session", {
      component: "LLMAgent",
      parentTaskId,
      delegatableTypes: Object.keys(queueFunctions),
    });
  }

  /**
   * Enable web search tools for this agent session.
   * Must be called before run() to take effect.
   *
   * @param {string} apiKey - Brave Search API key
   */
  enableWebSearchTools(apiKey) {
    this.webSearchToolExecutor = new WebSearchToolExecutor(apiKey);
    logger.info("Web search tools enabled for agent session", {
      component: "LLMAgent",
    });
  }

  /**
   * Enable URL fetch tools for this agent session.
   * Must be called before run() to take effect.
   */
  enableWebFetchTools() {
    this.webFetchToolExecutor = new WebFetchToolExecutor();
    logger.info("Web fetch tools enabled for agent session", {
      component: "LLMAgent",
    });
  }

  /**
   * Get the full list of tools available in this session
   * @private
   */
  _getAvailableTools() {
    const tools = [...FILE_TOOLS];
    if (this.commandToolExecutor) tools.push(...COMMAND_TOOLS);
    if (this.delegationToolExecutor) tools.push(...DELEGATION_TOOLS);
    if (this.webSearchToolExecutor) tools.push(...WEB_SEARCH_TOOLS);
    if (this.webFetchToolExecutor) tools.push(...WEB_FETCH_TOOLS);
    return tools;
  }

  /**
   * Run a conversation with the LLM
   *
   * @param {Object} handler - Task handler with configuration and callbacks
   * @param {string} handler.systemPrompt - System instructions
   * @param {string} handler.initialMessage - Current user message
   * @param {Array}  handler.priorMessages - Prior conversation turns
   * @param {Function} handler.onStart - Start callback
   * @param {Function} handler.onProgress - Progress callback
   * @param {Function} handler.onToolCall - Tool call callback
   * @param {Function} handler.onIteration - Iteration callback
   * @param {Function} handler.onMessage - Message callback
   * @param {Function} handler.onCompaction - Compaction callback
   * @param {Function} handler.onComplete - Completion callback
   * @param {Function} handler.shouldContinue - Custom continuation logic
   * @param {AbortSignal} [abortSignal] - Optional abort signal
   * @returns {Promise<Object>} Result with metadata and conversation log
   */
  async run(handler, abortSignal = null) {
    const {
      systemPrompt,
      initialMessage,
      priorMessages = [],
      onStart = () => {},
      onProgress = () => {},
      onToolCall = () => {},
      onIteration = () => {},
      onMessage = () => {},
      onCompaction = () => {},
      onComplete = async () => {},
      shouldContinue = null,
    } = handler;

    // Initialize conversation
    this.state.addSystemMessage(systemPrompt);

    // Replay prior conversation turns so the LLM has multi-turn context
    for (const msg of priorMessages) {
      if (msg.role === "user") {
        this.state.addUserMessage(msg.content);
      } else if (msg.role === "assistant") {
        this.state.addAssistantMessage(msg.content);
      }
    }

    // Add the current user message
    this.state.addUserMessage(initialMessage);

    // Call onStart before the first iteration
    onStart();

    let iterationCount = 0;
    let stopReason = null;

    while (iterationCount < this.maxIterations) {
      iterationCount++;

      logger.debug(`Iteration ${iterationCount}/${this.maxIterations}`, {
        component: "LLMAgent",
        tokenCount: this.state.getTokenCount(),
      });

      onProgress({
        stage: PROGRESS_STAGES.PROCESSING,
        message: `Thinking...`,
        iteration: iterationCount,
      });

      // Check if context needs compaction
      if (this.state.needsCompaction()) {
        logger.info("Context needs compaction, summarizing conversation...", {
          component: "LLMAgent",
        });
        onCompaction("start");
        await this.state.compact(this.client);
        const tokensAfterCompaction = this.state.getTokenCount();
        logger.info(
          `🗜️  Compaction complete. Tokens after: ~${tokensAfterCompaction}`,
          { component: "LLMAgent" },
        );
        onCompaction("complete", tokensAfterCompaction);
      }

      // Check for cancellation before making the (potentially long) LLM call
      if (abortSignal?.aborted) {
        const err = new Error("Task cancelled");
        err.code = "TASK_CANCELLED";
        throw err;
      }

      // Send message to LLM
      const response = await this.client.sendMessage(this.state.getMessages(), {
        tools: this._getAvailableTools(),
        maxTokens: this.maxTokens,
        signal: abortSignal,
      });

      // Anchor state token count with the real value from the API so that
      // needsCompaction() uses actual usage rather than a character estimate,
      // preventing repeated compaction when the estimate overshoots reality.
      if (response.usage?.inputTokens) {
        this.state.setActualTokenCount(response.usage.inputTokens);
      }

      // Log this iteration
      this.conversationLog.push({
        iteration: iterationCount,
        timestamp: new Date().toISOString(),
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        stopReason: response.stopReason,
        hasToolCalls: Boolean(response.toolCalls?.length),
        toolCount: response.toolCalls?.length || 0,
      });

      logger.debug(`Response received`, {
        component: "LLMAgent",
        stopReason: response.stopReason,
        toolCalls: response.toolCalls?.length || 0,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      });

      // Callback for each iteration
      onIteration(iterationCount, response);

      // Handle text response
      if (response.content && typeof response.content === "string") {
        this.state.addAssistantMessage(response.content, {
          reasoningContent: response.reasoningContent || null,
        });
        onMessage("assistant", response.content);
      }

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.handleToolCalls(response.toolCalls, {
          onToolCall,
          onProgress,
          iteration: iterationCount,
          reasoningContent: response.reasoningContent || null,
        });
        continue; // Continue conversation after tool execution
      }

      // Check stop conditions
      stopReason = response.stopReason;

      // Use custom continuation logic if provided
      if (shouldContinue) {
        const continueConversation = shouldContinue(response, iterationCount);
        if (!continueConversation) {
          break;
        }
        // Custom logic says continue - skip default checks
        continue;
      } else {
        // Default: stop if LLM indicates completion
        if (
          response.stopReason === "end_turn" ||
          response.stopReason === "stop_sequence" ||
          response.stopReason === "completed"
        ) {
          break;
        }

        // Handle max_tokens by requesting final output
        if (response.stopReason === "max_tokens") {
          logger.warn("Max tokens reached in response", {
            component: "LLMAgent",
          });
          this.state.addUserMessage(
            "You've reached the token limit. Please provide your final output now.",
          );
          continue;
        }
      }

      // If we get here with no tool calls and unexpected stop reason, break
      logger.debug(`No tool calls and stop reason: ${stopReason}`, {
        component: "LLMAgent",
      });
      break;
    }

    // Calculate total token usage
    const totalTokens = this.conversationLog.reduce(
      (acc, log) => ({
        input: acc.input + log.inputTokens,
        output: acc.output + log.outputTokens,
      }),
      { input: 0, output: 0 },
    );

    let result = {
      success: true,
      iterations: iterationCount,
      stopReason,
      tokenUsage: {
        inputTokens: totalTokens.input,
        outputTokens: totalTokens.output,
        totalTokens: totalTokens.input + totalTokens.output,
      },
      conversationLog: this.conversationLog,
    };

    // Call onComplete for validation, logging, socket events, etc.
    const onCompleteResult = await onComplete(result);
    if (onCompleteResult) {
      result = { ...result, ...onCompleteResult };
    }

    return result;
  }

  /**
   * Handle tool calls from LLM
   * @private
   */
  async handleToolCalls(
    toolCalls,
    { onToolCall, onProgress, iteration, reasoningContent = null },
  ) {
    logger.debug(`Executing ${toolCalls.length} tool call(s)`, {
      component: "LLMAgent",
      tools: toolCalls.map((tc) => tc.name).join(", "),
    });

    // Add tool use to state
    this.state.addToolUse(
      toolCalls.map((tc) => ({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
      { reasoningContent },
    );

    // Execute each tool
    for (const toolCall of toolCalls) {
      const rawPath =
        toolCall.arguments?.path || toolCall.arguments?.file_path || "";
      const filePath =
        rawPath === "." ? "(project root)" : rawPath || "unknown";
      const startLine = toolCall.arguments?.start_line;
      const endLine = toolCall.arguments?.end_line;

      let toolDescription = toolCall.name;
      if (toolCall.name === "read_file") {
        toolDescription =
          startLine && endLine
            ? `Reading ${filePath} (lines ${startLine}-${endLine})`
            : `Reading ${filePath}`;
      } else if (toolCall.name === "list_directory") {
        toolDescription = `Listing directory ${filePath}`;
      } else if (toolCall.name === "write_file") {
        toolDescription = `Writing ${filePath}`;
      } else if (toolCall.name === "replace_lines") {
        toolDescription = `Editing ${filePath} (lines ${startLine}-${endLine})`;
      } else if (toolCall.name === "search_files") {
        const pattern =
          toolCall.arguments?.pattern || toolCall.arguments?.query || "";
        toolDescription = pattern
          ? `Searching for "${pattern}"`
          : "Searching files";
      } else if (toolCall.name === "execute_command") {
        toolDescription = `Running: ${toolCall.arguments?.command || "command"}`;
      } else if (toolCall.name === "delegate_task") {
        const delType = toolCall.arguments?.type || "task";
        const delName =
          toolCall.arguments?.params?.competitorName ||
          toolCall.arguments?.params?.domainId;
        toolDescription = delName
          ? `Delegating ${delType}: ${delName}`
          : `Delegating ${delType}`;
      }

      logger.debug(`Executing tool: ${toolDescription}`, {
        component: "LLMAgent",
        tool: toolCall.name,
      });

      onProgress({
        stage: PROGRESS_STAGES.TOOL_EXECUTION,
        message: toolDescription,
        iteration,
        tool: toolCall.name,
      });

      try {
        // Route to the appropriate executor based on tool name
        const isDelegationTool =
          this.delegationToolExecutor &&
          DELEGATION_TOOLS.some((t) => t.name === toolCall.name);
        const isCommandTool =
          !isDelegationTool &&
          this.commandToolExecutor &&
          COMMAND_TOOLS.some((t) => t.name === toolCall.name);
        const isWebSearchTool =
          !isDelegationTool &&
          !isCommandTool &&
          this.webSearchToolExecutor &&
          WEB_SEARCH_TOOLS.some((t) => t.name === toolCall.name);
        const isWebFetchTool =
          !isDelegationTool &&
          !isCommandTool &&
          !isWebSearchTool &&
          this.webFetchToolExecutor &&
          WEB_FETCH_TOOLS.some((t) => t.name === toolCall.name);

        let result;
        if (isDelegationTool) {
          const delegationResult = await this.delegationToolExecutor.execute(
            toolCall.name,
            toolCall.arguments,
          );
          result = JSON.stringify(delegationResult, null, 2);
        } else if (isWebSearchTool) {
          result = await this.webSearchToolExecutor.executeTool(
            toolCall.name,
            toolCall.arguments,
          );
        } else if (isWebFetchTool) {
          result = await this.webFetchToolExecutor.executeTool(
            toolCall.name,
            toolCall.arguments,
          );
        } else {
          const executor = isCommandTool
            ? this.commandToolExecutor
            : this.fileToolExecutor;
          result = await executor.executeTool(
            toolCall.name,
            toolCall.arguments,
          );
        }

        this.state.addToolResult(toolCall.id, toolCall.name, result);

        logger.debug(`Tool completed: ${toolCall.name}`, {
          component: "LLMAgent",
          resultLength: result.length,
        });

        onToolCall(toolCall.name, toolCall.arguments, result);
      } catch (error) {
        const errorResult = `Error: ${error.message}`;
        this.state.addToolResult(toolCall.id, toolCall.name, errorResult);

        logger.error(`Tool failed: ${toolCall.name}`, {
          component: "LLMAgent",
          error: error.message,
        });

        onToolCall(toolCall.name, toolCall.arguments, errorResult, error);
      }
    }
  }

  /**
   * Add a user message to continue the conversation
   */
  addUserMessage(content) {
    this.state.addUserMessage(content);
  }

  /**
   * Get current conversation messages
   */
  getMessages() {
    return this.state.getMessages();
  }

  /**
   * Get conversation metadata
   */
  getMetadata() {
    const inputTokens = this.conversationLog.reduce(
      (sum, log) => sum + log.inputTokens,
      0,
    );
    const outputTokens = this.conversationLog.reduce(
      (sum, log) => sum + log.outputTokens,
      0,
    );

    return {
      iterations: this.conversationLog.length,
      totalTokens: inputTokens + outputTokens,
      tokenUsage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      conversationLog: this.conversationLog,
    };
  }

  /**
   * Extract JSON from conversation (for tasks that output JSON)
   */
  extractJSON() {
    const messages = this.state.getMessages();

    // Find last assistant message with JSON content
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];

      if (
        msg.role === "assistant" &&
        msg.content &&
        typeof msg.content === "string"
      ) {
        const content = msg.content;

        // Try to extract JSON from markdown code blocks or plain text
        const jsonMatch =
          content.match(/```json\s*\n?([\s\S]*?)\n?```/) ||
          content.match(/```\s*\n?([\s\S]*?)\n?```/) ||
          content.match(/(\{[\s\S]*\})/);

        if (jsonMatch) {
          try {
            const extractedJson = jsonMatch[1].trim();
            const parsed = JSON.parse(extractedJson);

            // Skip tool call metadata
            if (parsed.type === "tool_use" || parsed.name === "write_file") {
              continue;
            }

            return parsed;
          } catch {
            // Continue searching
          }
        }
      }
    }

    return null;
  }
}
