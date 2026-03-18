import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

process.env.PORT ??= "3101";
process.env.JWT_SECRET ??= "test-secret";

export async function createIntegrationTestContext() {
  const [
    requestModule,
    { MongoMemoryServer },
    { createHttpApp },
    { createMongoMarketResearchRepository },
    { createMongoSubscriptionRepository },
    { createMongoUserRepository },
    { createSubscriptionService },
    { marketResearchInitialHandler },
    { marketResearchSummaryHandler },
  ] = await Promise.all([
    import("supertest"),
    import("mongodb-memory-server"),
    import("../../../app.js"),
    import("../../../infrastructure/persistence/mongo/mongoose-market-research-repository.js"),
    import("../../../infrastructure/persistence/mongo/mongoose-subscription-repository.js"),
    import("../../../infrastructure/persistence/mongo/mongoose-user-repository.js"),
    import("../../../services/subscription.js"),
    import("../../../tasks/handlers/market-research-initial.js"),
    import("../../../tasks/handlers/market-research-summary.js"),
  ]);

  const request = requestModule.default;
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  const dbName = `mr-int-${randomUUID()}`;

  const marketResearchRepository = await createMongoMarketResearchRepository({
    uri: mongoUri,
    dbName,
  });
  const subscriptionRepository = await createMongoSubscriptionRepository({
    uri: mongoUri,
    dbName,
  });
  const userRepository = await createMongoUserRepository({
    uri: mongoUri,
    dbName,
  });
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

  async function setUserAdmin(userId, isAdmin = true) {
    const user = await userRepository.updateUser(userId, { isAdmin });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
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
    seedUser,
    setUserAdmin,
    runInitialTask,
    runSummaryTask,
    cleanup: async () => {
      const mongoose = (await import("mongoose")).default;
      await Promise.all(
        mongoose.connections
          .filter((connection) => connection.readyState !== 0)
          .map((connection) => connection.close()),
      );
      await mongoServer.stop();
    },
  };
}
