import { afterEach, describe, expect, it } from "vitest";
import { createIntegrationTestContext } from "../helpers/create-test-app.js";

describe("admin http integration", () => {
  const contexts = [];

  afterEach(async () => {
    while (contexts.length > 0) {
      const ctx = contexts.pop();
      await ctx.cleanup();
    }
  });

  async function createContext() {
    const ctx = await createIntegrationTestContext();
    contexts.push(ctx);
    return ctx;
  }

  it("allows an admin user to list users with subscription fields", async () => {
    const ctx = await createContext();
    const adminAuth = await ctx.createAuth("admin-user");
    const memberId = await ctx.seedUser("member-user");
    await ctx.setUserAdmin(adminAuth.userId, true);

    await ctx.subscriptionRepository.upsertSubscription(memberId, {
      plan: "starter",
      status: "active",
      creditsUsed: 2,
      creditsTotal: 15,
      creditEvents: [],
    });

    const response = await ctx.request(ctx.app)
      .get("/api/admin/users")
      .set("Cookie", `jwt=${adminAuth.jwt}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    const member = response.body.data.find((entry) => entry.userId === memberId);
    expect(member).toBeDefined();
    expect(member.plan).toBe("starter");
    expect(member.creditsUsed).toBe(2);
    expect(member.creditsTotal).toBe(15);
    expect(member.creditsRemaining).toBe(13);
  });

  it("forbids non-admin users from accessing admin routes", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("plain-user");

    const response = await ctx.request(ctx.app)
      .get("/api/admin/users")
      .set("Cookie", `jwt=${auth.jwt}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Forbidden" });
  });

  it("allows an admin user to inspect a user with session summaries and prompt validation", async () => {
    const ctx = await createContext();
    const adminAuth = await ctx.createAuth("admin-user");
    const memberId = await ctx.seedUser("member-user");
    await ctx.setUserAdmin(adminAuth.userId, true);

    await ctx.subscriptionRepository.upsertSubscription(memberId, {
      plan: "starter",
      status: "active",
      creditsUsed: 1,
      creditsTotal: 15,
      creditEvents: [],
    });

    const sessionId = "11111111-1111-4111-8111-111111111111";
    await ctx.marketResearchRepository.upsertSession(
      sessionId,
      "AI research assistant for agencies",
      {
        status: "complete",
        competitorCount: 3,
        promptValidation: {
          validatedAt: 1710000000000,
          shouldContinue: false,
          rejectionReason: "too_broad",
          suggestedPrompt: "AI research assistant for boutique SEO agencies",
        },
      },
      memberId,
    );
    await ctx.marketResearchRepository.saveReport(sessionId, {
      competitors: [],
      opportunity: {
        verdict: "worth-entering",
        summary: "Focused agency workflows still show room for differentiated tooling.",
      },
      status: "complete",
    });

    const response = await ctx.request(ctx.app)
      .get(`/api/admin/users/${memberId}`)
      .set("Cookie", `jwt=${adminAuth.jwt}`);

    expect(response.status).toBe(200);
    expect(response.body.user.userId).toBe(memberId);
    expect(response.body.user.plan).toBe("starter");
    expect(response.body.sessions).toHaveLength(1);
    expect(response.body.sessions[0]).toMatchObject({
      sessionId,
      idea: "AI research assistant for agencies",
      reportSummary: "Focused agency workflows still show room for differentiated tooling.",
      reportVerdict: "worth-entering",
    });
    expect(response.body.sessions[0].state.promptValidation).toMatchObject({
      shouldContinue: false,
      rejectionReason: "too_broad",
      suggestedPrompt: "AI research assistant for boutique SEO agencies",
    });
  });

  it("allows an admin user to inspect a session with prompt validation and report details", async () => {
    const ctx = await createContext();
    const adminAuth = await ctx.createAuth("admin-user");
    const memberId = await ctx.seedUser("member-user");
    await ctx.setUserAdmin(adminAuth.userId, true);

    await ctx.subscriptionRepository.upsertSubscription(memberId, {
      plan: "pro",
      status: "active",
      creditsUsed: 4,
      creditsTotal: 20,
      creditEvents: [],
    });

    const sessionId = "22222222-2222-4222-8222-222222222222";
    await ctx.marketResearchRepository.upsertSession(
      sessionId,
      "Voice note CRM for field sales teams",
      {
        status: "validation_failed",
        promptValidation: {
          validatedAt: 1710000001000,
          shouldContinue: false,
          rejectionReason: "needs_more_specificity",
          suggestedPrompt: "Voice note CRM for HVAC field sales teams in the US",
        },
      },
      memberId,
    );
    await ctx.marketResearchRepository.saveReport(sessionId, {
      competitors: [{ id: "comp-1", name: "FieldFlow" }],
      opportunity: {
        verdict: "risky",
        summary: "The market is viable, but the generic positioning needs narrowing.",
      },
      status: "complete",
    });
    await ctx.marketResearchRepository.saveCompetitorProfile(sessionId, "comp-1", {
      id: "comp-1",
      name: "FieldFlow",
      website: "https://fieldflow.test",
    });

    const response = await ctx.request(ctx.app)
      .get(`/api/admin/sessions/${sessionId}`)
      .set("Cookie", `jwt=${adminAuth.jwt}`);

    expect(response.status).toBe(200);
    expect(response.body.session.sessionId).toBe(sessionId);
    expect(response.body.owner.userId).toBe(memberId);
    expect(response.body.subscription.plan).toBe("pro");
    expect(response.body.opportunity).toMatchObject({
      verdict: "risky",
      summary: "The market is viable, but the generic positioning needs narrowing.",
    });
    expect(response.body.session.state.promptValidation).toMatchObject({
      rejectionReason: "needs_more_specificity",
      suggestedPrompt: "Voice note CRM for HVAC field sales teams in the US",
    });
    expect(response.body.competitors).toHaveLength(1);
    expect(response.body.competitors[0]).toMatchObject({
      id: "comp-1",
      name: "FieldFlow",
    });
  });
});
