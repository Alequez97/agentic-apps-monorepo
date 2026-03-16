/**
 * Available AI models
 */
export const MODELS = {
  // OpenAI models
  GPT_4: "gpt-4",
  GPT_4_TURBO: "gpt-4-turbo",
  GPT_5_MINI: "gpt-5-mini",
  GPT_5_2: "gpt-5.2",
  GPT_5_3_CODEX: "gpt-5.3-codex",

  // Anthropic models
  CLAUDE_OPUS_4: "claude-opus-4-20250514",
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_SONNET_4_6: "claude-sonnet-4-6",
  CLAUDE_HAIKU_3_5: "claude-3-5-haiku-20241022",

  // DeepSeek models
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",
};

/**
 * Model display names
 */
export const MODEL_NAMES = {
  [MODELS.GPT_4]: "GPT-4",
  [MODELS.GPT_4_TURBO]: "GPT-4 Turbo",
  [MODELS.GPT_5_MINI]: "GPT-5 mini",
  [MODELS.GPT_5_2]: "GPT-5.2",
  [MODELS.GPT_5_3_CODEX]: "GPT-5.3-Codex",
  [MODELS.CLAUDE_OPUS_4]: "Claude Opus 4",
  [MODELS.CLAUDE_OPUS_4_6]: "Claude Opus 4.6",
  [MODELS.CLAUDE_SONNET_4_5]: "Claude Sonnet 4.5",
  [MODELS.CLAUDE_SONNET_4_6]: "Claude Sonnet 4.6",
  [MODELS.CLAUDE_HAIKU_3_5]: "Claude Haiku 3.5",
  [MODELS.DEEPSEEK_CHAT]: "DeepSeek Chat",
  [MODELS.DEEPSEEK_REASONER]: "DeepSeek Reasoner",
};
