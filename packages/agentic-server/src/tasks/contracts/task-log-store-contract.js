import { assertMethod } from "./assert-method.js";

export function assertTaskLogStoreContract(taskLogStore) {
  if (!taskLogStore) {
    throw new Error("Task log store contract requires taskLogStore");
  }

  assertMethod(taskLogStore, "readLog", "Task log store");
}
