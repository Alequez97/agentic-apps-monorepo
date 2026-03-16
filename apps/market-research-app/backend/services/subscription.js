import { getUser } from "../persistence/users.js";

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

async function getSubscription(userId) {
  if (!userId) {
    return null;
  }

  const user = await getUser(userId);
  if (!user) {
    return null;
  }

  return user.plan ?? "free";
}

export async function getSubscriptionPlanDetails(userId) {
  const planName = await getSubscription(userId);
  if (!planName) {
    return null;
  }
  return PLANS[planName] ?? PLANS.free;
}
