import fs from "fs/promises";
import path from "path";

/**
 * Safely resolve a relative log file path within `queueDir`.
 * Returns null if the path is invalid (traversal attempt, absolute, etc.).
 */
function resolveLogPath(queueDir, relativeLogFile) {
  if (typeof relativeLogFile !== "string" || !relativeLogFile.trim()) {
    return null;
  }

  const normalized = path.normalize(relativeLogFile).replace(/\\/g, "/");
  if (
    path.isAbsolute(relativeLogFile) ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return null;
  }

  const absolute = path.resolve(queueDir, normalized);
  const root = path.resolve(queueDir);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return { normalized, absolute };
}

/**
 * Read a log file.
 * @param {string} queueDir - The analysis root directory (same as used by tasks persistence)
 * @param {string} relativeLogFile - Relative path to the log file (e.g. "logs/task-id.log")
 * @returns {Promise<{ content: string, logFile: string }>}
 */
export async function readLog(queueDir, relativeLogFile) {
  const resolved = resolveLogPath(queueDir, relativeLogFile);
  if (!resolved) {
    const err = new Error(`Invalid log file path: ${relativeLogFile}`);
    err.status = 400;
    err.code = "INVALID_LOG_PATH";
    throw err;
  }

  try {
    const content = await fs.readFile(resolved.absolute, "utf-8");
    return { content, logFile: resolved.normalized };
  } catch (error) {
    if (error.code === "ENOENT") {
      const err = new Error(`Log file not found: ${resolved.normalized}`);
      err.status = 404;
      err.code = "LOG_NOT_FOUND";
      throw err;
    }
    throw error;
  }
}
