import { assertMethod } from "./assert-method.js";

export function assertTaskSchedulerContract(
  taskScheduler,
  requiredMethods = [],
) {
  if (!taskScheduler) {
    throw new Error("Task scheduler contract requires taskScheduler");
  }

  requiredMethods.forEach((methodName) =>
    assertMethod(taskScheduler, methodName, "Task scheduler"),
  );
}
