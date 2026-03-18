import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAIClient, OpenAIChatState, MODELS } from "@jfs/llm-core";
import * as logger from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTION_FILE = path.resolve(__dirname, "../system-instructions/prompt-validation.md");

export const REJECTION_REASONS = {
  TOO_SHORT: "TOO_SHORT",
  NOT_A_BUSINESS_IDEA: "NOT_A_BUSINESS_IDEA",
  INAPPROPRIATE: "INAPPROPRIATE",
  GIBBERISH: "GIBBERISH",
};

/**
 * Validates an analysis prompt using GPT-5 mini.
 * Fails open — if the API call errors, shouldContinue defaults to true.
 *
 * @param {string} idea
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ shouldContinue: boolean, rejectionReason: string|null, suggestedPrompt: string|null }>}
 */
export async function validateAnalysisPrompt(idea, apiKey) {
  try {
    const systemInstruction = await fs.readFile(INSTRUCTION_FILE, "utf-8");

    const client = new OpenAIClient({
      apiKey,
      model: MODELS.GPT_5_MINI,
      maxTokens: 256,
    });
    const state = new OpenAIChatState(client);

    state.addSystemMessage(systemInstruction);
    state.addUserMessage(idea);

    const response = await client.sendMessage(state.messages);
    const raw = response?.content ?? "";
    const parsed = JSON.parse(raw);

    return {
      shouldContinue: Boolean(parsed.shouldContinue),
      rejectionReason: parsed.rejectionReason ?? null,
      suggestedPrompt: parsed.suggestedPrompt ?? null,
    };
  } catch (error) {
    // Fail open — don't block user if validation service is unavailable
    logger.warn("Prompt validation failed, allowing request through", {
      error: error.message,
      component: "PromptValidation",
    });
    return { shouldContinue: true, rejectionReason: null, suggestedPrompt: null };
  }
}
