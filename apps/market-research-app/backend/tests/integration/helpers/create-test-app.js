import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import jwt from "jsonwebtoken";

process.env.PORT ??= "3101";
process.env.JWT_SECRET ??= "test-secret";
process.env.MR_DATA_DIR ??= path.join(os.tmpdir(), "market-research-vitest-config");

export async function createIntegrationTestContext() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "market-research-vitest-"));

  const [
    requestModule,
    { createHttpApp },
    { createFileMarketResearchRepository },
    { createFileSubscriptionRepository },
    { createFileUserRepository },
    { createSubscriptionService },
    { marketResearchInitialHandler },
    { marketResearchSummaryHandler },
  ] = await Promise.all([
    import("supertest"),
    import("../../../app.js"),
    import("../../../infrastructure/persistence/file/file-market-research-repository.js"),
    import("../../../infrastructure/persistence/file/file-subscription-repository.js"),
    import("../../../infrastructure/persistence/file/file-user-repository.js"),
    import("../../../services/subscription.js"),
    import("../../../tasks/handlers/market-research-initial.js"),
    import("../../../tasks/handlers/market-research-summary.js"),
  ]);

  const request = requestModule.default;

  const marketResearchRepository = createFileMarketResearchRepository({ dataDir: tempDir });
  const subscriptionRepository = createFileSubscriptionRepository({ dataDir: tempDir });
  const userRepository = createFileUserRepository({ dataDir: tempDir });
  const subscriptionService = createSubscriptionService({ subscriptionRepository });

  const queuedInitialTasks = [];
  const queuedSummaryTasks = [];

  const taskQueue = {
    async queueMarketResearchInitialTask(params) {
      queuedInitialTasks.push(params);
      return { id: `task-initial-${queuedInitialTasks.length}`, params };
    },
    async queueMarketResearchSummaryTask(params) {
      queuedSummaryTasks.push(params);
      return { id: `task-summary-${queuedSummaryTasks.length}`, params };
    },
  };

  const orchestrator = {
    async getTasks() {
      return [];
    },
  };

  const app = createHttpApp({
    isAllowedOrigin: () => true,
    taskQueue,
    marketResearchRepository,
    subscriptionService,
    userRepository,
    orchestrator,
  });

  async function seedUser(userId = "integration-user") {
    await userRepository.upsertUser({
      sub: userId,
      email: `${userId}@test.local`,
      name: userId,
      picture: "",
    });
    return userId;
  }

  async function createAuth(userId = "integration-user") {
    await seedUser(userId);

    const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET);
    const csrfResponse = await request(app).get("/api/auth/me").set("Cookie", `jwt=${token}`);
    const csrfToken = csrfResponse.body?.csrfToken;

    return {
      userId,
      jwt: token,
      csrfToken,
      cookieHeader: [`jwt=${token}`, `csrf_token=${csrfToken}`],
    };
  }

  async function runInitialTask(task) {
    const handler = marketResearchInitialHandler(
      task,
      { info() {}, progress() {}, log() {} },
      null,
      {
        taskScheduler: taskQueue,
        marketResearchRepository,
        subscriptionService,
      },
    );
    await handler.onComplete();
  }

  async function runSummaryTask(task) {
    const publishedEvents = [];
    const handler = await marketResearchSummaryHandler(
      task,
      { info() {}, progress() {}, log() {} },
      null,
      {
        taskEventPublisher: {
          publish(eventName, payload) {
            publishedEvents.push({ eventName, payload });
          },
        },
        marketResearchRepository,
        subscriptionService,
      },
    );
    await handler.onComplete();
    return publishedEvents;
  }

  return {
    app,
    request,
    marketResearchRepository,
    subscriptionRepository,
    subscriptionService,
    userRepository,
    queuedInitialTasks,
    queuedSummaryTasks,
    createAuth,
    runInitialTask,
    runSummaryTask,
    cleanup: async () => fs.rm(tempDir, { recursive: true, force: true }),
  };
}
