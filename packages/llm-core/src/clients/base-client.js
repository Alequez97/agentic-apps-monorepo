/**
 * Base LLM Client Interface
 * All LLM provider implementations must extend this class
 */
export class BaseLLMClient {
  /**
   * @param {Object} config - Client configuration
   * @param {string} config.apiKey - API key for the provider
   * @param {string} config.model - Model identifier
   * @param {number} [config.maxTokens] - Max tokens for response
   * @param {number} [config.temperature] - Sampling temperature (0-1)
   */
  constructor(config) {
    if (new.target === BaseLLMClient) {
      throw new Error("BaseLLMClient is abstract and cannot be instantiated");
    }
    this.config = config;
  }

  /**
   * Send a message and get a response
   * @param {Array<Object>} messages - Conversation history
   * @param {Object} [options] - Request options
   * @param {Array<Object>} [options.tools] - Available tools/functions for the LLM to call
   * @param {number} [options.maxTokens] - Override default max tokens
   * @param {number} [options.temperature] - Override default temperature
   * @returns {Promise<Object>} Response object with content, toolCalls (if any), usage, etc.
   */
  async sendMessage() {
    throw new Error("sendMessage() must be implemented by subclass");
  }

  /**
   * Estimate token count for text (approximate)
   * @param {string} text - Text to count
   * @returns {number} Estimated token count
   */
  countTokens(text) {
    // Simple approximation: ~4 chars per token for English
    // Subclasses should override with provider-specific tokenization
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in messages array
   * @param {Array<Object>} messages - Messages to count
   * @returns {number} Total token count
   */
  countMessageTokens(messages) {
    return messages.reduce((total, msg) => {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      return total + this.countTokens(content);
    }, 0);
  }

  /**
   * Get the maximum context size for this model
   * @returns {number} Max context tokens
   */
  getMaxContextTokens() {
    throw new Error("getMaxContextTokens() must be implemented by subclass");
  }

  /**
   * Get model name/identifier
   * @returns {string} Model identifier
   */
  getModelName() {
    return this.config.model;
  }
}
