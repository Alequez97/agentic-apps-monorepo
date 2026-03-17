import { assertMethod } from "./assert-method.js";

export function assertTaskProgressStoreContract(taskProgressStore) {
  if (!taskProgressStore) {
    throw new Error("Task progress store contract requires taskProgressStore");
  }

  ["initialize", "clear"].forEach((methodName) =>
    assertMethod(taskProgressStore, methodName, "Task progress store"),
  );
}
