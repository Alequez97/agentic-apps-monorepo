import * as logger from "../utils/logger.js";

/**
 * Build a task handler by calling the registered factory for the task type.
 *
 * The registry is a plain object: `{ [taskType]: async (task, taskLogger, agent) => handlerConfig }`.
 * Each factory:
 * 1. Configures the agent (file permissions, tools).
 * 2. Loads the system prompt (system instructions are the app's responsibility).
 * 3. Returns a handler config `{ systemPrompt, initialMessage, onToken, ... }`.
 *
 * @param {Object} task - The task object
 * @param {Object} taskLogger - Logger for this task
 * @param {Object} agent - LLMAgent instance
 * @param {Object} registry - Map of task type → handler factory
 * @returns {Promise<Object>} Handler config merged with defaults
 */
export async function buildTaskHandler(task, taskLogger, agent, registry) {
  const factory = registry?.[task.type];

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
