import { assertMethod } from "./assert-method.js";

export function assertTaskEventPublisherContract(taskEventPublisher) {
  if (!taskEventPublisher) {
    throw new Error(
      "Task event publisher contract requires taskEventPublisher",
    );
  }

  assertMethod(taskEventPublisher, "publish", "Task event publisher");
}
