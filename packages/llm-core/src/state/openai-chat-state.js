import * as logger from "../utils/logger.js";

/**
 * OpenAI Chat State Manager
 * Manages conversation history with OpenAI's message format
 * (tool_calls as separate array, not embedded in content)
 */
export class OpenAIChatState {
  constructor(llmClient, options = {}) {
    this.client = llmClient;
    this.messages = [];
    this.maxContextTokens =
      options.maxContextTokens || this.client.getMaxContextTokens();
    this.compactionThreshold =
      options.compactionThreshold || Math.floor(this.maxContextTokens * 0.75);
    this.fileCache = new Map(); // Track which files we've already sent
    // Actual token tracking: anchored from real API usage counts to avoid
    // estimation drift that causes repeated compaction
    this.lastActualInputTokens = null;
    this.estimatedTokensAtLastActual = 0;
  }

  /**
   * Add a system message (typically the initial instruction)
   */
  addSystemMessage(content) {
    this.messages.push({
      role: "system",
      content,
    });
  }

  /**
   * Add a user message
   */
  addUserMessage(content) {
    this.messages.push({
      role: "user",
      content,
    });
  }

  /**
   * Add an assistant message with text content
   * @param {string} content - Message text
   * @param {Object} [options]
   * @param {string|null} [options.reasoningContent] - DeepSeek reasoning_content to echo back
   */
  addAssistantMessage(content, { reasoningContent = null } = {}) {
    const message = {
      role: "assistant",
      content,
    };
    // DeepSeek thinking mode requires reasoning_content on every assistant
    // message in the conversation history, not only on tool-call turns.
    if (reasoningContent) {
      message.reasoning_content = reasoningContent;
    }
    this.messages.push(message);
  }

  /**
   * Add tool use by assistant (when LLM calls a tool)
   * OpenAI format: tool_calls are stored separately, not in content
   * @param {Array} toolCalls - normalized tool call array
   * @param {Object} [options]
   * @param {string|null} [options.reasoningContent] - DeepSeek reasoning_content to echo back
   */
  addToolUse(toolCalls, { reasoningContent = null } = {}) {
    // Convert normalized tool calls to OpenAI's tool_call format
    const formattedToolCalls = toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: {
        name: call.name,
        arguments: JSON.stringify(call.arguments), // OpenAI wants stringified arguments
      },
    }));

    const message = {
      role: "assistant",
      content: "", // OpenAI uses empty content when there are tool calls
      tool_calls: formattedToolCalls,
    };

    // DeepSeek thinking mode requires reasoning_content to be echoed back on
    // every assistant message within a tool-call turn, otherwise the API returns 400.
    if (reasoningContent) {
      message.reasoning_content = reasoningContent;
    }

    this.messages.push(message);
  }

  /**
   * Add tool result (response from executing a tool)
   * OpenAI format: each tool result is a separate message with role: "tool"
   */
  addToolResult(toolCallId, toolName, result) {
    this.messages.push({
      role: "tool",
      tool_call_id: toolCallId,
      content: result,
    });
  }

  /**
   * Get all messages
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Get current token count.
   * When a real API count is available, uses it as the baseline and adds only
   * the estimated delta for messages added since that API call.  This prevents
   * over-estimation from triggering repeated compaction on every iteration.
   */
  getTokenCount() {
    if (this.lastActualInputTokens !== null) {
      const currentEstimate = this.client.countMessageTokens(this.messages);
      const delta = Math.max(
        0,
        currentEstimate - this.estimatedTokensAtLastActual,
      );
      return this.lastActualInputTokens + delta;
    }
    return this.client.countMessageTokens(this.messages);
  }

  /**
   * Update the token baseline using the real input token count returned by the
   * API.  Call this after every sendMessage() response.
   * @param {number} inputTokens - Actual input tokens reported by the API
   */
  setActualTokenCount(inputTokens) {
    this.lastActualInputTokens = inputTokens;
    this.estimatedTokensAtLastActual = this.client.countMessageTokens(
      this.messages,
    );
  }

  /**
   * Check if we're approaching token limits
   */
  needsCompaction() {
    return this.getTokenCount() > this.compactionThreshold;
  }

  /**
   * Prepare compaction summary request for the LLM
   * @returns {string} Instruction for LLM to summarize conversation
   */
  getCompactionPrompt() {
    const conversationMessages = this.messages.filter(
      (m) => m.role !== "system",
    );

    // Keep last N messages (recent context)
    const keepRecentCount = 4; // Keep last 2 exchanges (4 messages)
    const oldMessages = conversationMessages.slice(0, -keepRecentCount);

    // Build readable conversation
    const conversationText = oldMessages
      .map((msg, idx) => {
        if (msg.role === "user") {
          return `[User ${idx}]: ${msg.content}`;
        } else if (msg.role === "assistant") {
          const content = msg.content || this._formatToolCalls(msg.tool_calls);
          return `[Assistant ${idx}]: ${content}`;
        } else if (msg.role === "tool") {
          return `[Tool Result ${idx}]: ${msg.content}`;
        }
        return "";
      })
      .join("\n\n");

    return `Please summarize the following conversation in 2-3 concise paragraphs. Focus on:
1. What code/files were examined
2. Key findings and observations
3. Current analysis progress

Conversation to summarize:
${conversationText}

Provide a clear, structured summary that captures the essential context for continuing the analysis.`;
  }

  /**
   * Compact the conversation to reduce token usage
   * Strategy: Keep tool_calls/tool_result pairs intact, summarize old turns, keep recent clean turns
   * This prevents breaking OpenAI's API requirement for matching tool calls and results
   */
  async compact(llmClient) {
    if (this.messages.length <= 3) {
      return; // Too few messages to compact
    }

    const tokenCount = this.getTokenCount();
    logger.debug(`Compacting context. Current tokens: ${tokenCount}`, {
      component: "OpenAIChatState",
    });

    const systemMessages = this.messages.filter((m) => m.role === "system");
    const conversationMessages = this.messages.filter(
      (m) => m.role !== "system",
    );

    // Find the last "clean" point - where we can safely split without orphaning tool calls
    // OpenAI format: tool_calls are on assistant messages, tool results are separate "tool" messages
    // We need to find a point where we're not in the middle of a tool execution cycle
    let lastCleanSplitIndex = 0;
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];

      // A clean split point is:
      // 1. A "user" message that is NOT a tool result, OR
      // 2. An "assistant" message that does NOT have tool_calls
      if (msg.role === "user" && msg.role !== "tool") {
        lastCleanSplitIndex = i + 1; // Keep from here on
        break;
      }

      if (msg.role === "assistant" && !msg.tool_calls) {
        lastCleanSplitIndex = i + 1;
        break;
      }
    }

    // Ensure we keep at least the last 2 messages (1 exchange)
    const minKeepIndex = Math.max(
      Math.min(lastCleanSplitIndex, conversationMessages.length - 2),
      0,
    );

    const oldMessages = conversationMessages.slice(0, minKeepIndex);
    const recentMessages = conversationMessages.slice(minKeepIndex);

    if (oldMessages.length === 0) {
      return; // Nothing to compact
    }

    // Ask LLM to summarize the conversation
    let summary = "Previous analysis context (summary unavailable)";
    if (llmClient) {
      try {
        const compactionPrompt = this.getCompactionPrompt();
        const tempMessages = [
          ...systemMessages,
          {
            role: "user",
            content: compactionPrompt,
          },
        ];

        logger.debug("Requesting LLM to summarize conversation...", {
          component: "OpenAIChatState",
        });

        const summaryResponse = await llmClient.sendMessage(tempMessages);
        summary = summaryResponse.content || summary;

        logger.debug("LLM-generated summary received", {
          component: "OpenAIChatState",
          summaryLength: summary.length,
        });
      } catch (error) {
        logger.warn(
          `Failed to get LLM summary, using basic summary: ${error.message}`,
          { component: "OpenAIChatState" },
        );
        summary = this._summarizeMessages(oldMessages);
      }
    } else {
      // Fallback to basic summary if no LLM client provided
      summary = this._summarizeMessages(oldMessages);
    }

    // Rebuild messages: system + summary + recent (which is now guaranteed clean)
    this.messages = [
      ...systemMessages,
      {
        role: "user",
        content: `[Analysis Summary]\n${summary}\n\n[Continuing with recent context...]`,
      },
      ...recentMessages,
    ];

    // Reset actual-token baseline so estimation takes over until the next
    // API response anchors it again with a real count.
    this.lastActualInputTokens = null;
    this.estimatedTokensAtLastActual = 0;

    const newTokenCount = this.getTokenCount();
    logger.debug(
      `Compaction complete. New tokens: ${newTokenCount} (saved ${tokenCount - newTokenCount})`,
      { component: "OpenAIChatState" },
    );
  }

  /**
   * Summarize messages for compaction
   * @private
   */
  _summarizeMessages(messages) {
    const summaryParts = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        const content = this._extractTextContent(msg.content);
        // Truncate long user messages
        const truncated =
          content.length > 200 ? content.slice(0, 200) + "..." : content;
        summaryParts.push(`User: ${truncated}`);
      } else if (msg.role === "assistant") {
        const content = msg.content || this._formatToolCalls(msg.tool_calls);
        const truncated =
          content.length > 300 ? content.slice(0, 300) + "..." : content;
        summaryParts.push(`Assistant: ${truncated}`);
      } else if (msg.role === "tool") {
        const content = msg.content || "";
        const truncated =
          content.length > 200 ? content.slice(0, 200) + "..." : content;
        summaryParts.push(`Tool Result: ${truncated}`);
      }
    }

    return summaryParts.join("\n\n");
  }

  /**
   * Format tool calls for display
   * @private
   */
  _formatToolCalls(toolCalls) {
    if (!toolCalls || toolCalls.length === 0) return "";
    return `[Tool calls: ${toolCalls.map((tc) => tc.function.name).join(", ")}]`;
  }

  /**
   * Extract text content from various message formats
   * @private
   */
  _extractTextContent(content) {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((block) => {
          if (typeof block === "string") return block;
          if (block.type === "text") return block.text;
          if (block.type === "tool_result") return "[Tool result]";
          return "";
        })
        .join(" ");
    }

    return JSON.stringify(content);
  }

  /**
   * Mark a file as cached (already sent to LLM)
   */
  markFileCached(filePath) {
    this.fileCache.set(filePath, true);
  }

  /**
   * Check if file was already sent
   */
  isFileCached(filePath) {
    return this.fileCache.has(filePath);
  }

  /**
   * Clear the conversation (start fresh)
   */
  clear() {
    this.messages = [];
    this.fileCache.clear();
  }

  /**
   * Get conversation stats
   */
  getStats() {
    return {
      messageCount: this.messages.length,
      tokenCount: this.getTokenCount(),
      maxTokens: this.maxContextTokens,
      utilizationPercent: Math.round(
        (this.getTokenCount() / this.maxContextTokens) * 100,
      ),
      cachedFiles: this.fileCache.size,
    };
  }
}
