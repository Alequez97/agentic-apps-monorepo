export const PLANS = {
  free: {
    name: "free",
    creditsPerMonth: 2,
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
  async function getSubscription(userId) {
    if (!userId) {
      return null;
    }

    const subscription = await subscriptionRepository.getSubscription(userId);
    if (subscription) {
      return subscription;
    }

    return subscriptionRepository.upsertSubscription(userId, {
      plan: "free",
      status: "active",
    });
  }

  return {
    async getSubscriptionPlanDetails(userId) {
      const subscription = await getSubscription(userId);
      if (!subscription) {
        return null;
      }
      const planName = subscription.plan ?? "free";
      return PLANS[planName] ?? PLANS.free;
    },

    async getSubscription(userId) {
      return getSubscription(userId);
    },
  };
}
