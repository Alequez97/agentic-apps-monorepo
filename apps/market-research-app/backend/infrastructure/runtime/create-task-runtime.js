import {
  createFileQueueStore,
  createFileTaskProgressStore,
} from "@jfs/agentic-server";

export async function createTaskRuntime({ config }) {
  const taskProgressStore = createFileTaskProgressStore({
    queueDir: config.queueDir,
    outputPrefix: config.allowedOutputPrefix,
  });

  switch (config.storage.queue.provider) {
    case "file":
      return {
        queueStore: createFileQueueStore({
          queueDir: config.queueDir,
        }),
        taskProgressStore,
      };

    case "mongo": {
      const { createMongoQueueStore } = await import(
        "../../../../../packages/agentic-server/src/tasks/infrastructure/mongo/mongoose-queue-store.js"
      );
      return {
        queueStore: await createMongoQueueStore({
          uri: config.storage.queue.mongo.uri,
          dbName: config.storage.queue.mongo.dbName,
        }),
        taskProgressStore,
      };
    }

    default:
      throw new Error(
        `Unsupported task queue provider: ${config.storage.queue.provider}`,
      );
  }
}
