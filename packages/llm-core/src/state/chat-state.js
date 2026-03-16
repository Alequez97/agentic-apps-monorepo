import * as logger from "../utils/logger.js";

/**
 * Chat State Manager
 * Manages conversation history, token counting, and context compaction
 */
export class ChatState {
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
   * Add an assistant message
   */
  addAssistantMessage(content) {
    this.messages.push({
      role: "assistant",
      content,
    });
  }

  /**
   * Add tool use by assistant (when LLM calls a tool)
   */
  addToolUse(toolCalls) {
    // Store tool calls in assistant message content
    // Convert normalized tool calls back to Claude's format with type field
    const formattedContent = toolCalls.map((call) => ({
      type: "tool_use",
      id: call.id,
      name: call.name,
      input: call.arguments, // normalized response uses 'arguments' field
    }));

    this.messages.push({
      role: "assistant",
      content: formattedContent,
    });
  }

  /**
   * Add tool result (response from executing a tool)
   */
  addToolResult(toolCallId, toolName, result) {
    this.messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolCallId,
          content: result,
        },
      ],
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
          const content = this._extractTextContent(msg.content);
          return `[User ${idx}]: ${content}`;
        } else if (msg.role === "assistant") {
          const content = this._extractTextContent(msg.content);
          return `[Assistant ${idx}]: ${content}`;
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
   * Strategy: Keep tool-use/result pairs intact, summarize old turns, keep recent clean turns
   * This prevents breaking Claude's requirement that tool_result pairs with tool_use
   */
  async compact(llmClient) {
    if (this.messages.length <= 3) {
      return; // Too few messages to compact
    }

    const tokenCount = this.getTokenCount();
    logger.debug(`Compacting context. Current tokens: ${tokenCount}`, {
      component: "ChatState",
    });

    const systemMessages = this.messages.filter((m) => m.role === "system");
    const conversationMessages = this.messages.filter(
      (m) => m.role !== "system",
    );

    // Find the last "clean" point - where we can safely split without orphaning tool calls
    // Look backwards to find an assistant message that doesn't have tool_use, or a user message
    let lastCleanSplitIndex = 0;
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];

      // User messages are always "clean" split points
      if (msg.role === "user") {
        // Check if it's a tool_result message
        const isToolResult =
          Array.isArray(msg.content) &&
          msg.content.some((block) => block.type === "tool_result");
        if (!isToolResult) {
          lastCleanSplitIndex = i + 1; // Keep from here on
          break;
        }
      }

      // Assistant messages without tool_use are clean
      if (
        msg.role === "assistant" &&
        (!Array.isArray(msg.content) ||
          !msg.content.some((block) => block.type === "tool_use"))
      ) {
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
          component: "ChatState",
        });

        const summaryResponse = await llmClient.sendMessage(tempMessages);
        summary = summaryResponse.content || summary;

        logger.debug("LLM-generated summary received", {
          component: "ChatState",
          summaryLength: summary.length,
        });
      } catch (error) {
        logger.warn(
          `Failed to get LLM summary, using basic summary: ${error.message}`,
          { component: "ChatState" },
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
      { component: "ChatState" },
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
        const content = this._extractTextContent(msg.content);
        const truncated =
          content.length > 300 ? content.slice(0, 300) + "..." : content;
        summaryParts.push(`Assistant: ${truncated}`);
      }
    }

    return summaryParts.join("\n\n");
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
          if (block.type === "tool_use") return `[Tool call: ${block.name}]`;
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
