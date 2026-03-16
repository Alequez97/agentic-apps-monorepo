/**
 * AI provider identifiers
 */
export const PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  DEEPSEEK: "deepseek",
  OPENROUTER: "openrouter",
};

/**
 * Provider display names
 */
export const PROVIDER_NAMES = {
  [PROVIDERS.OPENAI]: "OpenAI",
  [PROVIDERS.ANTHROPIC]: "Anthropic",
  [PROVIDERS.DEEPSEEK]: "DeepSeek",
  [PROVIDERS.OPENROUTER]: "OpenRouter",
};

/**
 * Provider API base URLs
 */
export const PROVIDER_URLS = {
  [PROVIDERS.OPENAI]: "https://api.openai.com/v1",
  [PROVIDERS.ANTHROPIC]: "https://api.anthropic.com/v1",
  [PROVIDERS.DEEPSEEK]: "https://api.deepseek.com",
  [PROVIDERS.OPENROUTER]: "https://openrouter.ai/api/v1",
};
