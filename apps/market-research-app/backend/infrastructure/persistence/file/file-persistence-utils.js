import fs from "fs/promises";
import * as logger from "../../../utils/logger.js";

/**
 * Safely read and parse a JSON file.
 * @param {string} filePath - Absolute path to the JSON file
 * @param {string} [identifier] - Optional identifier for logging
 * @returns {Promise<Object|null>} Parsed JSON or null if empty/invalid
 */
export async function tryReadJsonFile(filePath, identifier = "file") {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    if (!content || content.trim() === "") {
      logger.debug(`File ${identifier} is empty (path: ${filePath})`, {
        component: "Persistence",
      });
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error(`Invalid JSON in ${identifier} (path: ${filePath})`, {
        error: error.message,
        component: "Persistence",
      });
      return null;
    }
    throw error;
  }
}
