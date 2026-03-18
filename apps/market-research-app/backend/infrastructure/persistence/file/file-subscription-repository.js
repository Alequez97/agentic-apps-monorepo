import fs from "fs/promises";
import path from "path";
import * as logger from "../../../utils/logger.js";
import { tryReadJsonFile } from "./file-persistence-utils.js";

function assertValidUserId(userId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error("Invalid userId format");
  }
}

export function createFileSubscriptionRepository({ dataDir }) {
  const subscriptionsDir = path.join(dataDir, "subscriptions");

  function subscriptionPath(userId) {
    assertValidUserId(userId);
    return path.join(subscriptionsDir, `${userId}.json`);
  }

  async function ensureSubscriptionsDir() {
    await fs.mkdir(subscriptionsDir, { recursive: true });
  }

  return {
    assertValidUserId,

    async getSubscription(userId) {
      const filePath = subscriptionPath(userId);
      try {
        return await tryReadJsonFile(filePath, userId);
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },

    async upsertSubscription(userId, updates = {}) {
      assertValidUserId(userId);
      await ensureSubscriptionsDir();

      const filePath = subscriptionPath(userId);
      const now = Date.now();
      const existing = (await this.getSubscription(userId)) || null;

      const subscription = {
        userId,
        plan: updates.plan ?? existing?.plan ?? "free",
        status: updates.status ?? existing?.status ?? "active",
        creditsUsed: updates.creditsUsed ?? existing?.creditsUsed ?? 0,
        creditsTotal: updates.creditsTotal ?? existing?.creditsTotal ?? null,
        creditEvents: updates.creditEvents ?? existing?.creditEvents ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await fs.writeFile(filePath, JSON.stringify(subscription, null, 2));

      logger.info("Subscription upserted", {
        userId,
        component: "FileSubscriptionRepository",
      });

      return subscription;
    },
  };
}
