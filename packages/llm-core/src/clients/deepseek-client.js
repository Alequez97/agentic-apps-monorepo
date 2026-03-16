import OpenAI from "openai";
import { BaseLLMClient } from "./base-client.js";

/**
 * DeepSeek LLM Client Implementation
 * DeepSeek is OpenAI-compatible (Chat Completions API) so we use the openai
 * package pointed at DeepSeek's base URL.
 *
 * Supports:
 *   - deepseek-chat  (general purpose, supports tool/function calling)
 *   - deepseek-reasoner (chain-of-thought reasoning, supports tool calling)
 */
export class DeepSeekClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("DeepSeek API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.deepseek.com",
    });

    this.model = config.model || "deepseek-chat";
  }

  /**
   * Send a message to DeepSeek using Chat Completions API
   * @param {Array<Object>} messages - Conversation history (standard OpenAI format)
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async sendMessage(messages, options = {}) {
    const requestParams = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens || this.config.maxTokens || 4096,
    };

    if (options.tools && options.tools.length > 0) {
      requestParams.tools = this.formatTools(options.tools);
      requestParams.tool_choice = "auto";
    }

    try {
      const response = await this.client.chat.completions.create(
        requestParams,
        options.signal ? { signal: options.signal } : undefined,
      );
      return this.normalizeResponse(response);
    } catch (error) {
      if (error.name === "AbortError" || options.signal?.aborted) {
        const cancelled = new Error("Task cancelled");
        cancelled.code = "TASK_CANCELLED";
        throw cancelled;
      }
      // If context length exceeded, parse actual token counts and retry with reduced max_tokens
      const contextMatch = error.message?.match(
        /maximum context length is (\d+) tokens.*?\((\d+) in the messages/s,
      );
      if (contextMatch) {
        const contextLimit = parseInt(contextMatch[1], 10);
        const inputTokens = parseInt(contextMatch[2], 10);
        const reducedMaxTokens = contextLimit - inputTokens - 100;
        if (
          reducedMaxTokens > 0 &&
          reducedMaxTokens < requestParams.max_tokens
        ) {
          requestParams.max_tokens = reducedMaxTokens;
          try {
            const retryResponse = await this.client.chat.completions.create(
              requestParams,
              options.signal ? { signal: options.signal } : undefined,
            );
            return this.normalizeResponse(retryResponse);
          } catch (retryError) {
            if (retryError.name === "AbortError" || options.signal?.aborted) {
              const cancelled = new Error("Task cancelled");
              cancelled.code = "TASK_CANCELLED";
              throw cancelled;
            }
            throw new Error(`DeepSeek API error: ${retryError.message}`);
          }
        }
      }
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }

  /**
   * Format tools to OpenAI Chat Completions function format
   * @private
   */
  formatTools(tools) {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.parameters,
          required: tool.required || [],
        },
      },
    }));
  }

  /**
   * Normalize Chat Completions response to standard internal format
   * @private
   */
  normalizeResponse(response) {
    const choice = response.choices?.[0];
    const message = choice?.message || {};

    const result = {
      content: message.content || "",
      // reasoning_content must be echoed back on subsequent requests within the
      // same tool-call turn (DeepSeek thinking mode requirement)
      reasoningContent: message.reasoning_content || null,
      toolCalls: [],
      stopReason: choice?.finish_reason || "stop",
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };

    // Normalize tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      result.toolCalls = message.tool_calls.map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments:
          typeof call.function.arguments === "string"
            ? JSON.parse(call.function.arguments)
            : call.function.arguments,
      }));
    }

    return result;
  }

  /**
   * Get maximum context size for DeepSeek models
   * Both deepseek-chat and deepseek-reasoner have 128K context window
   */
  getMaxContextTokens() {
    return 128000;
  }

  /**
   * Token count approximation for DeepSeek models (~3.5 chars/token)
   */
  countTokens(text) {
    return Math.ceil(text.length / 3.5);
  }
}
