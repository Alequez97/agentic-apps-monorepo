import fs from "fs/promises";
import path from "path";
import * as logger from "../utils/logger.js";

/**
 * Safely read and parse a JSON file
 * Handles empty files and JSON parse errors
 * @param {string} filePath - Absolute path to the JSON file
 * @param {string} [identifier] - Optional identifier for logging (e.g., task ID, domain ID)
 * @returns {Promise<Object|null>} Parsed JSON object or null if file is empty/invalid
 * @throws {Error} Re-throws errors other than ENOENT and SyntaxError
 */
export async function tryReadJsonFile(filePath, identifier = "file") {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    // Handle empty files
    if (!content || content.trim() === "") {
      logger.debug(`File ${identifier} is empty (path: ${filePath})`, {
        component: "Persistence",
      });
      return null;
    }

    return JSON.parse(content);
  } catch (error) {
    // Handle JSON parse errors (malformed files)
    if (error instanceof SyntaxError) {
      logger.error(`Invalid JSON in ${identifier} (path: ${filePath})`, {
        error: error.message,
        component: "Persistence",
      });
      return null;
    }

    // Re-throw other errors (like ENOENT) for caller to handle
    throw error;
  }
}

/**
 * Append a revision entry to a section's metadata.json.
 * The file is never overwritten — `version` increments and the new revision is pushed.
 * @param {string} metadataPath - Absolute path to metadata.json
 * @param {Object} revision - The revision entry to append
 * @returns {Promise<Object>} Updated metadata { version, revisions }
 */
export async function appendRevision(metadataPath, revision) {
  let existing = null;
  try {
    existing = await tryReadJsonFile(metadataPath, "section metadata");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const updated = {
    version: (existing?.version || 0) + 1,
    revisions: [...(existing?.revisions || []), revision],
  };

  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
