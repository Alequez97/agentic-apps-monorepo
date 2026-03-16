import * as logger from "../utils/logger.js";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const MAX_RESULTS = 10;

/**
 * Tool definitions for LLM — web search
 */
export const WEB_SEARCH_TOOLS = [
  {
    name: "web_search",
    description:
      "Search the web for up-to-date information about a company, product, pricing, funding, or market data. Use this to research competitors — their features, pricing plans, funding rounds, employee counts, and positioning.",
    parameters: {
      query: {
        type: "string",
        description:
          'Search query. Be specific (e.g. "Stripe pricing plans 2024", "Notion funding rounds crunchbase", "Linear app features vs Jira").',
      },
    },
    required: ["query"],
  },
];

/**
 * Executor for web search tools (Brave Search API).
 */
export class WebSearchToolExecutor {
  /**
   * @param {string} apiKey - Brave Search API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Execute a tool call
   * @param {string} toolName
   * @param {Object} args
   * @returns {Promise<string>}
   */
  async executeTool(toolName, args) {
    if (toolName === "web_search") {
      return this._search(args.query);
    }
    throw new Error(`Unknown web search tool: ${toolName}`);
  }

  async _search(query) {
    if (!query || typeof query !== "string") {
      return "Error: query must be a non-empty string";
    }

    logger.info(`Web search: ${query}`, { component: "WebSearchToolExecutor" });

    const url = new URL(BRAVE_SEARCH_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(MAX_RESULTS));

    let response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": this.apiKey,
        },
      });
    } catch (err) {
      logger.error("Brave Search request failed", {
        component: "WebSearchToolExecutor",
        error: err.message,
      });
      return `Error: Search request failed — ${err.message}`;
    }

    if (!response.ok) {
      return `Error: Brave Search API returned ${response.status} ${response.statusText}`;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return "Error: Failed to parse search response";
    }

    const results = data?.web?.results;
    if (!Array.isArray(results) || results.length === 0) {
      return "No results found.";
    }

    return results
      .map((r, i) => {
        const snippets = r.extra_snippets?.length
          ? r.extra_snippets.join(" ")
          : r.description || "";
        return `[${i + 1}] ${r.title}\nURL: ${r.url}\n${snippets}`;
      })
      .join("\n\n");
  }
}
