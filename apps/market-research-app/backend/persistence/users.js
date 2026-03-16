import fs from "fs/promises";
import path from "path";
import config from "../config.js";
import * as logger from "../utils/logger.js";
import { tryReadJsonFile } from "./utils.js";

const USERS_DIR = path.join(config.dataDir, "users");

function userPath(userId) {
  // userId comes from Google sub — only allow safe characters
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error("Invalid userId format");
  }
  return path.join(USERS_DIR, `${userId}.json`);
}

async function ensureUsersDir() {
  await fs.mkdir(USERS_DIR, { recursive: true });
}

export async function upsertUser(profile) {
  await ensureUsersDir();

  const userId = profile.sub;
  const filePath = userPath(userId);
  const now = Date.now();

  let createdAt = now;
  try {
    const existing = await tryReadJsonFile(filePath, userId);
    if (existing?.createdAt) createdAt = existing.createdAt;
  } catch {
    // New user
  }

  const user = {
    userId,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    createdAt,
    lastSeenAt: now,
  };

  await fs.writeFile(filePath, JSON.stringify(user, null, 2));

  logger.info("User upserted", { userId, component: "UsersPersistence" });

  return user;
}

export async function getUser(userId) {
  const filePath = userPath(userId);
  try {
    return await tryReadJsonFile(filePath, userId);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
