/**
 * Model Utility Functions
 * Handles model name parsing and provider detection
 */

/**
 * Get the provider name from a model string
 * @param {string} model - The model name (e.g., "deepseek-chat", "claude-sonnet-4")
 * @returns {string|null} The provider name (e.g., "openai", "anthropic", "deepseek")
 */
export function getProviderFromModel(model) {
  if (!model) return null;

  if (model.startsWith("openrouter/")) {
    return "openrouter";
  }

  const providerMap = {
    deepseek: "deepseek",
    sonnet: "anthropic",
    "claude-3": "anthropic",
    claude: "anthropic",
    gpt: "openai",
    o1: "openai",
    o3: "openai",
    codex: "openai",
  };

  for (const [prefix, provider] of Object.entries(providerMap)) {
    if (model.toLowerCase().includes(prefix)) {
      return provider;
    }
  }

  return null;
}
