import OpenAI from "openai";
import { BaseLLMClient } from "./base-client.js";

/**
 * OpenAI LLM Client Implementation
 * Uses the new Responses API (beta) for enhanced reasoning capabilities
 * Supports GPT-4, GPT-4 Turbo, GPT-5-preview, and future reasoning models
 * Includes support for function tools (custom tool calling)
 */
export class OpenAIClient extends BaseLLMClient {
  constructor(config) {
    super(config);

    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    // Default to GPT-4 Turbo if no model specified
    // Supports future models like gpt-5.2 when available
    // Current models: gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini
    this.model = config.model || "gpt-4o";
    this.reasoningEffort = config.reasoningEffort;
  }

  /**
   * Send a message to OpenAI using Responses API
   * @param {Array<Object>} messages - Conversation history
   * @param {Object} [options] - Request options
   * @returns {Promise<Object>} Normalized response
   */
  async sendMessage(messages, options = {}) {
    const requestParams = {
      model: this.model,
      input: this.formatMessages(messages),
      max_output_tokens: this.config.maxTokens || 4096,
    };

    // Add reasoning effort if specified (for reasoning models)
    if (options.reasoningEffort !== undefined) {
      requestParams.reasoning = { effort: options.reasoningEffort };
    } else if (this.reasoningEffort !== undefined) {
      requestParams.reasoning = { effort: this.reasoningEffort };
    }

    // Add text verbosity if specified
    if (options.textVerbosity !== undefined) {
      requestParams.text = { verbosity: options.textVerbosity };
    } else if (this.config.textVerbosity !== undefined) {
      requestParams.text = { verbosity: this.config.textVerbosity };
    }

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = this.formatTools(options.tools);
      requestParams.tool_choice = "auto";
    }

    try {
      const response = await this.client.responses.create(
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
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Format messages for Responses API
   * Responses API expects input as array of items with specific types
   * Converts Chat Completions format to Responses API format
   * @private
   */
  formatMessages(messages) {
    const formattedItems = [];

    for (const msg of messages) {
      // Convert tool result messages to function_call_output items
      if (msg.role === "tool") {
        formattedItems.push({
          type: "function_call_output",
          call_id: msg.tool_call_id,
          output: msg.content,
        });
        continue;
      }

      // Convert tool_calls to function_call items (but also include assistant message if there's content)
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // If there's assistant content before tool calls, add it as a message
        if (msg.content && msg.content.trim()) {
          formattedItems.push({
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: msg.content,
              },
            ],
          });
        }

        // Add each tool call as a function_call item
        for (const toolCall of msg.tool_calls) {
          formattedItems.push({
            type: "function_call",
            call_id: toolCall.id,
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          });
        }
        continue;
      }

      // Handle regular messages
      let content = msg.content;

      // Convert array format to simple string
      if (Array.isArray(content)) {
        const textBlocks = content
          .filter((c) => c.type === "text")
          .map((c) => c.text);

        if (textBlocks.length === 1) {
          content = textBlocks[0];
        } else if (textBlocks.length > 1) {
          content = textBlocks.join("\n");
        }
      }

      const contentStr =
        typeof content === "string" ? content : JSON.stringify(content);

      // Skip empty messages
      if (!contentStr || !contentStr.trim()) {
        continue;
      }

      // Convert role names (Responses API supports: assistant, system, developer, user)
      // Note: Chat Completions uses "system" but Responses API prefers "developer"
      let role = msg.role;
      if (role === "system") {
        role = "developer";
      }

      // Determine content type based on role
      const contentType = role === "assistant" ? "output_text" : "input_text";

      formattedItems.push({
        type: "message",
        role: role,
        content: [
          {
            type: contentType,
            text: contentStr,
          },
        ],
      });
    }

    return formattedItems;
  }

  /**
   * Format tools for Responses API
   * Converts tool definitions to OpenAI function tool format
   * Responses API uses internally-tagged structure (name/description at top level)
   * @private
   */
  formatTools(tools) {
    return tools.map((tool) => {
      const requiredFields = tool.required || [];
      const allFields = Object.keys(tool.parameters);

      // Enable strict mode only if all fields are required
      // (strict mode requires all properties to be in required array, or use null type for optional)
      const useStrict = requiredFields.length === allFields.length;

      return {
        type: "function",
        name: tool.name,
        description: tool.description,
        strict: useStrict,
        parameters: {
          type: "object",
          properties: tool.parameters,
          required: requiredFields,
          additionalProperties: false,
        },
      };
    });
  }

  /**
   * Normalize Responses API response to standard format
   * @private
   */
  normalizeResponse(response) {
    const result = {
      content: "",
      toolCalls: [],
      stopReason: response.status || "completed",
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
      },
    };

    // Handle text output from Responses API
    // Use output_text helper (recommended) or extract from output array
    if (response.output_text) {
      result.content = response.output_text;
    } else if (Array.isArray(response.output)) {
      // Extract text from message items in output array
      const messageItems = response.output.filter(
        (item) => item.type === "message",
      );
      const textContents = messageItems.flatMap((msg) =>
        (msg.content || [])
          .filter((c) => c.type === "output_text")
          .map((c) => c.text),
      );
      result.content = textContents.join("\n");
    }

    // Handle tool calls from Responses API
    // Tool calls are items in the output array with type "function_call"
    if (Array.isArray(response.output)) {
      result.toolCalls = response.output
        .filter((item) => item.type === "function_call")
        .map((call) => ({
          id: call.call_id,
          name: call.name,
          // Parse arguments from JSON string to object (Responses API returns stringified args)
          arguments:
            typeof call.arguments === "string"
              ? JSON.parse(call.arguments)
              : call.arguments,
        }));
    }

    return result;
  }

  /**
   * Get maximum context size for OpenAI models
   */
  getMaxContextTokens() {
    // GPT-5 mini has a 400K context window
    if (this.model.includes("gpt-5-mini")) {
      return 400000;
    }
    // GPT-5.2 and other GPT-5 models
    if (this.model.includes("gpt-5")) {
      return 128000;
    }
    // GPT-4 Turbo and GPT-4O
    if (
      this.model.includes("gpt-4-turbo") ||
      this.model.includes("gpt-4o") ||
      this.model.includes("gpt-4")
    ) {
      return 128000;
    }
    // GPT-3.5 Turbo
    if (this.model.includes("gpt-3.5")) {
      return 16000;
    }
    // Default fallback
    return 128000;
  }

  /**
   * Better token counting for OpenAI models
   * Uses approximation: ~4 chars per token for English
   */
  countTokens(text) {
    // OpenAI's official tokenizer approximation
    // Different models have slightly different ratios, but ~4 chars per token is reasonable
    return Math.ceil(text.length / 4);
  }
}
