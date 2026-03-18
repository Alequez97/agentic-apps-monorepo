export const PLANS = {
  free: {
    name: "free",
    creditsPerMonth: 4,
    numCompetitors: 10,
    historyDays: 0,
    deepIntelligence: false,
    pdfExport: false,
    teamSeats: 1,
    apiAccess: false,
  },
  starter: {
    name: "starter",
    creditsPerMonth: 15,
    numCompetitors: 15,
    historyDays: 90,
    deepIntelligence: false,
    pdfExport: true,
    teamSeats: 1,
    apiAccess: false,
  },
  pro: {
    name: "pro",
    creditsPerMonth: 50,
    numCompetitors: 20,
    historyDays: Infinity,
    deepIntelligence: true,
    pdfExport: true,
    teamSeats: 1,
    apiAccess: false,
  },
  agency: {
    name: "agency",
    creditsPerMonth: 200,
    numCompetitors: 25,
    historyDays: Infinity,
    deepIntelligence: true,
    pdfExport: true,
    teamSeats: 5,
    apiAccess: true,
  },
};

export function createSubscriptionService({ subscriptionRepository }) {
  const REPORT_START_CREDIT_REQUIREMENT = 2;

  function getPlan(planName) {
    return PLANS[planName] ?? PLANS.free;
  }

  function buildDefaultSubscription(userId) {
    const plan = getPlan("free");
    return {
      userId,
      plan: plan.name,
      status: "active",
      creditsUsed: 0,
      creditsTotal: plan.creditsPerMonth,
      creditEvents: [],
    };
  }

  function normalizeSubscription(subscription, userId = null) {
    const fallback = buildDefaultSubscription(userId ?? subscription?.userId ?? null);
    const plan = getPlan(subscription?.plan ?? fallback.plan);
    const creditsUsed = Number.isFinite(subscription?.creditsUsed) ? subscription.creditsUsed : 0;
    const creditsTotal = Number.isFinite(subscription?.creditsTotal)
      ? subscription.creditsTotal
      : plan.creditsPerMonth;
    const creditEvents = Array.isArray(subscription?.creditEvents)
      ? subscription.creditEvents
      : [];

    return {
      ...subscription,
      userId: subscription?.userId ?? fallback.userId,
      plan: plan.name,
      status: subscription?.status ?? fallback.status,
      creditsUsed,
      creditsTotal,
      creditEvents,
      creditsRemaining: Math.max(creditsTotal - creditsUsed, 0),
    };
  }

  function buildSubscriptionUpdate(subscription) {
    return {
      plan: subscription.plan,
      status: subscription.status,
      creditsUsed: subscription.creditsUsed,
      creditsTotal: subscription.creditsTotal,
      creditEvents: subscription.creditEvents,
    };
  }

  async function getSubscription(userId) {
    if (!userId) {
      return null;
    }

    const existing = await subscriptionRepository.getSubscription(userId);
    if (!existing) {
      const created = await subscriptionRepository.upsertSubscription(
        userId,
        buildDefaultSubscription(userId),
      );
      return normalizeSubscription(created, userId);
    }

    const normalized = normalizeSubscription(existing, userId);
    const needsMigration =
      existing.plan !== normalized.plan ||
      existing.status !== normalized.status ||
      existing.creditsUsed !== normalized.creditsUsed ||
      existing.creditsTotal !== normalized.creditsTotal ||
      !Array.isArray(existing.creditEvents);

    if (!needsMigration) {
      return normalized;
    }

    const updated = await subscriptionRepository.upsertSubscription(
      userId,
      buildSubscriptionUpdate(normalized),
    );
    return normalizeSubscription(updated, userId);
  }

  return {
    async getSubscriptionPlanDetails(userId) {
      const subscription = await getSubscription(userId);
      if (!subscription) {
        return null;
      }
      return getPlan(subscription.plan);
    },

    async getSubscription(userId) {
      return getSubscription(userId);
    },

    async canStartReport(userId) {
      const subscription = await getSubscription(userId);
      return {
        allowed: (subscription?.creditsRemaining ?? 0) >= REPORT_START_CREDIT_REQUIREMENT,
        requiredCredits: REPORT_START_CREDIT_REQUIREMENT,
        subscription,
      };
    },

    async chargeCredits(userId, { amount = 1, eventKey, reason, sessionId } = {}) {
      if (!userId) {
        throw new Error("userId is required");
      }
      if (!eventKey) {
        throw new Error("eventKey is required");
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("amount must be a positive number");
      }

      const subscription = await getSubscription(userId);
      const existingEvent = subscription.creditEvents.find((event) => event?.key === eventKey);
      if (existingEvent) {
        return {
          alreadyCharged: true,
          subscription,
          charge: existingEvent,
        };
      }

      const now = Date.now();
      const charge = {
        key: eventKey,
        amount,
        reason: reason ?? "usage",
        sessionId: sessionId ?? null,
        chargedAt: now,
      };

      const updated = await subscriptionRepository.upsertSubscription(userId, {
        plan: subscription.plan,
        status: subscription.status,
        creditsUsed: subscription.creditsUsed + amount,
        creditsTotal: subscription.creditsTotal,
        creditEvents: [...subscription.creditEvents, charge],
      });

      return {
        alreadyCharged: false,
        subscription: normalizeSubscription(updated, userId),
        charge,
      };
    },

    async getSubscriptionsForUsers(userIds) {
      const subscriptions = await subscriptionRepository.getSubscriptionsByUserIds(userIds);
      return subscriptions.map((s) => normalizeSubscription(s));
    },
  };
}
