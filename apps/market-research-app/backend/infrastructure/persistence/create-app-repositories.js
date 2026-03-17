import { createFileMarketResearchRepository } from "./file/file-market-research-repository.js";
import { createFileSubscriptionRepository } from "./file/file-subscription-repository.js";
import { createFileUserRepository } from "./file/file-user-repository.js";

export async function createAppRepositories({ config }) {
  switch (config.storage.app.provider) {
    case "file":
      return {
        marketResearchRepository: createFileMarketResearchRepository({
          dataDir: config.dataDir,
        }),
        userRepository: createFileUserRepository({
          dataDir: config.dataDir,
        }),
        subscriptionRepository: createFileSubscriptionRepository({
          dataDir: config.dataDir,
        }),
      };

    case "mongo": {
      const [
        { createMongoMarketResearchRepository },
        { createMongoUserRepository },
        { createMongoSubscriptionRepository },
      ] = await Promise.all([
          import("./mongo/mongoose-market-research-repository.js"),
          import("./mongo/mongoose-user-repository.js"),
          import("./mongo/mongoose-subscription-repository.js"),
        ]);

      const mongoConfig = {
        uri: config.storage.app.mongo.uri,
        dbName: config.storage.app.mongo.dbName,
      };

      const [marketResearchRepository, userRepository, subscriptionRepository] =
        await Promise.all([
        createMongoMarketResearchRepository(mongoConfig),
        createMongoUserRepository(mongoConfig),
        createMongoSubscriptionRepository(mongoConfig),
      ]);

      return {
        marketResearchRepository,
        userRepository,
        subscriptionRepository,
      };
    }

    default:
      throw new Error(
        `Unsupported app persistence provider: ${config.storage.app.provider}`,
      );
  }
}
