import * as logger from "../../utils/logger.js";

export async function buildTaskHandler(
  task,
  taskLogger,
  agent,
  getTaskHandler,
) {
  const factory = getTaskHandler?.(task);

  if (!factory) {
    const error = `No handler registered for task type: ${task.type}`;
    logger.error(error, {
      component: "HandlerBuilder",
      taskId: task.id,
      taskType: task.type,
    });
    throw new Error(error);
  }

  return factory(task, taskLogger, agent);
}
