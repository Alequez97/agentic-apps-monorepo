import { assertMethod } from "./assert-method.js";

export function assertTaskQueueStoreContract(queueStore) {
  if (!queueStore) {
    throw new Error("Task queue store contract requires queueStore");
  }

  const requiredMethods = [
    "readTask",
    "listPending",
    "listRunning",
    "listTasks",
    "enqueueTask",
    "claimTask",
    "completeTask",
    "failTask",
    "cancelTask",
    "requeueTask",
    "deleteTask",
    "restartTask",
    "renewLease",
    "releaseLease",
    "requeueExpiredTasks",
  ];

  requiredMethods.forEach((methodName) =>
    assertMethod(queueStore, methodName, "Task queue store"),
  );
}
