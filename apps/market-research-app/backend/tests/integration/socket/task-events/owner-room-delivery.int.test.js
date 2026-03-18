import { EventEmitter } from "node:events";
import { TASK_EVENTS } from "@jfs/agentic-server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_EVENTS } from "../../../../constants/app-events.js";
import { SOCKET_EVENTS } from "../../../../constants/socket-events.js";
import { registerTaskSocketBridge } from "../../../../infrastructure/http/register-task-socket-bridge.js";

describe("socket bridge integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits task and app events only to the owning user room", async () => {
    const taskEvents = new EventEmitter();
    const emitted = [];

    const io = {
      to(room) {
        return {
          emit(eventName, payload) {
            emitted.push({ room, eventName, payload });
          },
        };
      },
    };

    registerTaskSocketBridge({
      io,
      getUserRoom: (userId) => `user:${userId}`,
      taskEvents,
      TASK_EVENTS,
    });

    taskEvents.emit(TASK_EVENTS.QUEUED, {
      task: {
        id: "task-1",
        ownerId: "user-a",
        type: "market-research-initial",
        params: { sessionId: "session-1" },
        agentConfig: { agent: "llm-api", model: "gpt-test" },
      },
    });

    taskEvents.emit(TASK_EVENTS.PROGRESS, {
      taskId: "task-1",
      ownerId: "user-a",
      type: "market-research-initial",
      params: { sessionId: "session-1" },
      message: "step",
      kind: "log",
      stage: "analyzing",
    });

    taskEvents.emit(APP_EVENTS.MARKET_RESEARCH_REPORT_READY, {
      ownerId: "user-b",
      sessionId: "session-2",
      taskId: "task-2",
    });

    expect(emitted.map(({ room, eventName }) => ({ room, eventName }))).toEqual([
      { room: "user:user-a", eventName: SOCKET_EVENTS.TASK_QUEUED },
      { room: "user:user-a", eventName: SOCKET_EVENTS.TASK_PROGRESS },
      { room: "user:user-a", eventName: SOCKET_EVENTS.LOG_MARKET_RESEARCH_INITIAL },
      { room: "user:user-b", eventName: SOCKET_EVENTS.MARKET_RESEARCH_REPORT_READY },
    ]);

    expect(emitted.some(({ room }) => room === "user:user-c")).toBe(false);
  });
});
