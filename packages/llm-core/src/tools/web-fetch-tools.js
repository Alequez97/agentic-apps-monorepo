import * as logger from "../utils/logger.js";

const MAX_OUTPUT_CHARS = 20_000;
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Tool definitions for LLM — URL fetching
 */
export const WEB_FETCH_TOOLS = [
  {
    name: "fetch_url",
    description:
      "Fetch the content of a URL and return it as plain text. Use this to read pricing pages, about pages, Crunchbase profiles, or any public web page. Works best with server-rendered pages. Does not execute JavaScript.",
    parameters: {
      url: {
        type: "string",
        description: "The full URL to fetch (e.g. https://stripe.com/pricing).",
      },
    },
    required: ["url"],
  },
];

/**
 * Executor for URL fetch tool.
 * Fetches a URL, strips HTML tags, and returns readable plain text.
 */
export class WebFetchToolExecutor {
  /**
   * Execute a tool call
   * @param {string} toolName
   * @param {Object} args
   * @returns {Promise<string>}
   */
  async executeTool(toolName, args) {
    if (toolName === "fetch_url") {
      return this._fetch(args.url);
    }
    throw new Error(`Unknown web fetch tool: ${toolName}`);
  }

  async _fetch(url) {
    if (!url || typeof url !== "string") {
      return "Error: url must be a non-empty string";
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return `Error: Invalid URL — ${url}`;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `Error: Only http and https URLs are supported`;
    }

    logger.info(`Fetching URL: ${url}`, { component: "WebFetchToolExecutor" });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MarketResearchBot/1.0; +https://github.com)",
          Accept: "text/html,application/xhtml+xml,text/plain",
        },
        redirect: "follow",
      });
    } catch (err) {
      return `Error: Failed to fetch URL — ${err.message}`;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return `Error: HTTP ${response.status} ${response.statusText}`;
    }

    const contentType = response.headers.get("content-type") || "";

    let text;
    try {
      text = await response.text();
    } catch (err) {
      return `Error: Failed to read response body — ${err.message}`;
    }

    // If not HTML, return raw text directly (truncated)
    if (!contentType.includes("html")) {
      return text.length > MAX_OUTPUT_CHARS
        ? text.slice(0, MAX_OUTPUT_CHARS) +
            `\n\n[Truncated — ${text.length - MAX_OUTPUT_CHARS} chars omitted]`
        : text;
    }

    const plain = _htmlToText(text);

    return plain.length > MAX_OUTPUT_CHARS
      ? plain.slice(0, MAX_OUTPUT_CHARS) +
          `\n\n[Truncated — ${plain.length - MAX_OUTPUT_CHARS} chars omitted]`
      : plain;
  }
}

/**
 * Strip HTML and return readable plain text.
 * - Removes <script>, <style>, <nav>, <footer>, <head> blocks entirely
 * - Converts block elements to newlines
 * - Strips remaining tags
 * - Collapses whitespace
 * @param {string} html
 * @returns {string}
 */
function _htmlToText(html) {
  return (
    html
      // Remove non-content blocks entirely
      .replace(
        /<(script|style|nav|footer|head|header|aside)[^>]*>[\s\S]*?<\/\1>/gi,
        "",
      )
      // Block elements → newline
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      // Strip all remaining tags
      .replace(/<[^>]+>/g, "")
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      // Collapse runs of blank lines to max 2
      .replace(/\n{3,}/g, "\n\n")
      // Trim leading/trailing whitespace per line
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n")
  );
}
