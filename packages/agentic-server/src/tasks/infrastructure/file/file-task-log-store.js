import fs from "fs/promises";
import path from "path";

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

async function readLog(queueDir, relativeLogFile) {
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

export function createFileTaskLogStore({ queueDir }) {
  return {
    readLog: (relativeLogFile) => readLog(queueDir, relativeLogFile),
  };
}

export { readLog };
