import { afterEach, describe, expect, it } from "vitest";
import { createIntegrationTestContext } from "../helpers/create-test-app.js";

describe("market research credits integration", () => {
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

  it("blocks analyze when fewer than 2 credits remain", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("credits-low");
    const reportId = "11111111-1111-1111-1111-111111111111";

    await ctx.subscriptionRepository.upsertSubscription(auth.userId, {
      plan: "free",
      status: "active",
      creditsUsed: 3,
      creditsTotal: 4,
      creditEvents: [],
    });

    const response = await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ idea: "AI bookkeeping for freelancers" });

    expect(response.status).toBe(402);
    expect(response.body.code).toBe("INSUFFICIENT_CREDITS");
    expect(response.body.subscription.creditsRemaining).toBe(1);
  });

  it("rejects obviously inappropriate prompts before queuing analysis", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("validation-local");
    const reportId = "12121212-1212-4212-8212-121212121212";

    const response = await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ idea: "Sex and drugs" });

    expect(response.status).toBe(422);
    expect(response.body.rejectionReason).toBe("INAPPROPRIATE");
    expect(ctx.queuedInitialTasks).toHaveLength(0);
  });

  it("blocks analyze when existing active sessions reserve the remaining credits", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("credits-reserved");
    const reportId = "33333333-3333-3333-3333-333333333333";

    await ctx.marketResearchRepository.upsertSession(
      "11111111-1111-1111-1111-111111111111",
      "First idea",
      { status: "analyzing" },
      auth.userId,
    );
    await ctx.marketResearchRepository.upsertSession(
      "22222222-2222-2222-2222-222222222222",
      "Second idea",
      { status: "analyzing" },
      auth.userId,
    );

    const response = await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ idea: "Third idea" });

    expect(response.status).toBe(402);
    expect(response.body.reservedCredits).toBe(4);
    expect(response.body.availableCredits).toBe(0);
  });

  it("exposes the two billing milestones through the real app after the background tasks complete", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("credits-flow");
    const reportId = "44444444-4444-4444-4444-444444444444";
    const idea = "AI research assistant";

    const analyzeResponse = await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ idea });

    expect(analyzeResponse.status).toBe(201);
    expect(ctx.queuedInitialTasks).toHaveLength(1);

    const initialTask = {
      id: "task-initial-1",
      ownerId: auth.userId,
      params: ctx.queuedInitialTasks[0],
    };

    await ctx.marketResearchRepository.saveReport(reportId, {
      idea,
      competitors: [{ id: "comp-a", name: "Comp A" }],
    });
    await ctx.marketResearchRepository.saveCompetitorTasks(reportId, [
      { taskId: "task-comp-a", competitorId: "comp-a" },
    ]);

    await ctx.runInitialTask(initialTask);

    const afterCompetitors = await ctx.request(ctx.app)
      .get("/api/auth/me")
      .set("Cookie", `jwt=${auth.jwt}`);

    expect(afterCompetitors.status).toBe(200);
    expect(afterCompetitors.body.user.creditsRemaining).toBe(3);
    expect(ctx.queuedSummaryTasks).toHaveLength(1);

    await ctx.marketResearchRepository.saveCompetitorProfile(reportId, "comp-a", {
      id: "comp-a",
      name: "Comp A",
      pricing: "Pro",
    });
    await ctx.marketResearchRepository.saveOpportunity(reportId, {
      verdict: "worth-entering",
      summary: "Clear gap in the market.",
    });

    await ctx.runSummaryTask({
      id: "task-summary-1",
      ownerId: auth.userId,
      params: ctx.queuedSummaryTasks[0],
    });

    const afterSummary = await ctx.request(ctx.app)
      .get("/api/market-research/44444444-4444-4444-4444-444444444444/report")
      .set("Cookie", `jwt=${auth.jwt}`);

    expect(afterSummary.status).toBe(200);
    expect(afterSummary.body.subscription.creditsRemaining).toBe(2);
    expect(afterSummary.body.report.status).toBe("complete");
    expect(afterSummary.body.report.opportunity.verdict).toBe("worth-entering");
  });

  it("keeps the first charge when summary assembly fails later", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("credits-failure");
    const reportId = "55555555-5555-5555-5555-555555555555";
    const idea = "AI research assistant";

    await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ idea });

    const initialTask = {
      id: "task-initial-1",
      ownerId: auth.userId,
      params: ctx.queuedInitialTasks[0],
    };

    await ctx.marketResearchRepository.saveReport(reportId, {
      idea,
      competitors: [{ id: "comp-a", name: "Comp A" }],
    });
    await ctx.marketResearchRepository.saveCompetitorTasks(reportId, [
      { taskId: "task-comp-a", competitorId: "comp-a" },
    ]);
    await ctx.runInitialTask(initialTask);

    await ctx.marketResearchRepository.saveCompetitorProfile(reportId, "comp-a", {
      id: "comp-a",
      name: "Comp A",
    });

    await expect(
      ctx.runSummaryTask({
        id: "task-summary-1",
        ownerId: auth.userId,
        params: ctx.queuedSummaryTasks[0],
      }),
    ).rejects.toThrow(/opportunity\.json is empty or invalid/);

    const authMe = await ctx.request(ctx.app).get("/api/auth/me").set("Cookie", `jwt=${auth.jwt}`);
    expect(authMe.status).toBe(200);
    expect(authMe.body.user.creditsRemaining).toBe(3);
  });

  it("resumes a canceled paid run with one remaining credit and only queues missing work", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("credits-resume");
    const reportId = "66666666-6666-4666-8666-666666666666";
    const idea = "AI bookkeeping for ecommerce brands";

    await ctx.subscriptionRepository.upsertSubscription(auth.userId, {
      plan: "free",
      status: "active",
      creditsUsed: 3,
      creditsTotal: 4,
      creditEvents: [],
    });

    await ctx.marketResearchRepository.upsertSession(
      reportId,
      idea,
      {
        status: "canceled",
        numCompetitors: 2,
        canceled_at_stage: "competitors",
        credits: {
          competitors: { charged: true, amount: 1 },
          summary: { charged: false },
        },
      },
      auth.userId,
    );
    await ctx.marketResearchRepository.saveReport(reportId, {
      idea,
      competitors: [
        { id: "comp-a", name: "Comp A", url: "https://a.test", description: "Competitor A" },
        { id: "comp-b", name: "Comp B", url: "https://b.test", description: "Competitor B" },
      ],
    });
    await ctx.marketResearchRepository.saveCompetitorTasks(reportId, [
      { taskId: "task-comp-a", competitorId: "comp-a" },
      { taskId: "task-comp-b", competitorId: "comp-b" },
    ]);
    await ctx.marketResearchRepository.saveCompetitorProfile(reportId, "comp-a", {
      id: "comp-a",
      name: "Comp A",
      url: "https://a.test",
    });

    const response = await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", auth.cookieHeader)
      .set("x-csrf-token", auth.csrfToken)
      .send({ idea });

    expect(response.status).toBe(201);
    expect(response.body.mode).toBe("resume");
    expect(response.body.requiredCredits).toBe(1);
    expect(ctx.queuedInitialTasks).toHaveLength(0);
    expect(ctx.queuedCompetitorTasks).toHaveLength(1);
    expect(ctx.queuedCompetitorTasks[0]).toMatchObject({
      sessionId: reportId,
      competitorId: "comp-b",
      competitorName: "Comp B",
    });
    expect(ctx.queuedSummaryTasks).toHaveLength(1);
    expect(ctx.queuedSummaryTasks[0].dependsOn).toEqual(["task-competitor-1"]);
  });

  it("reports found competitors for canceled analyses in history", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("history-canceled");
    const reportId = "77777777-7777-4777-8777-777777777777";

    await ctx.marketResearchRepository.upsertSession(
      reportId,
      "AI CRM for solo consultants",
      {
        status: "canceled",
        canceled_at_stage: "summary",
      },
      auth.userId,
    );
    await ctx.marketResearchRepository.saveReport(reportId, {
      competitors: [
        { id: "comp-a", name: "Comp A", url: "https://a.test" },
        { id: "comp-b", name: "Comp B", url: "https://b.test" },
      ],
    });
    await ctx.marketResearchRepository.saveCompetitorProfile(reportId, "comp-a", {
      id: "comp-a",
      name: "Comp A",
      url: "https://a.test",
    });

    const response = await ctx.request(ctx.app)
      .get("/api/market-research")
      .set("Cookie", `jwt=${auth.jwt}`);

    expect(response.status).toBe(200);
    expect(response.body.history).toHaveLength(1);
    expect(response.body.history[0]).toMatchObject({
      id: reportId,
      status: "canceled",
      competitorCount: 1,
      canceledAtStage: "summary",
    });
  });
});
