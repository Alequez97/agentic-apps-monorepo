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

const HIGH_RISK_TERMS = [
  "sex",
  "porn",
  "xxx",
  "escort",
  "cocaine",
  "heroin",
  "meth",
  "drugs",
  "drug",
];

function normalizeValidationResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const rejectionReason = result.rejectionReason ?? null;
  const isKnownReason =
    rejectionReason === null || Object.values(REJECTION_REASONS).includes(rejectionReason);

  if (!isKnownReason) {
    return null;
  }

  return {
    shouldContinue: Boolean(result.shouldContinue),
    rejectionReason,
    suggestedPrompt: result.suggestedPrompt ?? null,
  };
}

function validatePromptLocally(idea) {
  const normalized = String(idea ?? "").trim();
  const lower = normalized.toLowerCase();
  const words = lower.match(/[a-z0-9]+/g) ?? [];
  const meaningfulWords = words.filter((word) => word.length > 2);
  const hasHighRiskTerms = HIGH_RISK_TERMS.some((term) => lower.includes(term));

  if (!normalized) {
    return {
      shouldContinue: false,
      rejectionReason: REJECTION_REASONS.TOO_SHORT,
      suggestedPrompt: null,
    };
  }

  if (!/[a-z]/i.test(normalized) || meaningfulWords.length === 0) {
    return {
      shouldContinue: false,
      rejectionReason: REJECTION_REASONS.GIBBERISH,
      suggestedPrompt: null,
    };
  }

  if (hasHighRiskTerms) {
    return {
      shouldContinue: false,
      rejectionReason: REJECTION_REASONS.INAPPROPRIATE,
      suggestedPrompt: null,
    };
  }

  return null;
}

export async function validateAnalysisPrompt(idea, apiKey) {
  const localValidation = validatePromptLocally(idea);
  if (localValidation) {
    return localValidation;
  }

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
    const parsed = normalizeValidationResult(JSON.parse(raw));

    if (!parsed) {
      throw new Error("Prompt validation returned an invalid payload");
    }

    return parsed;
  } catch (error) {
    const fallbackValidation = validatePromptLocally(idea);
    if (fallbackValidation) {
      return fallbackValidation;
    }

    logger.warn("Prompt validation failed, allowing request through", {
      error: error.message,
      component: "PromptValidation",
    });
    return { shouldContinue: true, rejectionReason: null, suggestedPrompt: null };
  }
}
