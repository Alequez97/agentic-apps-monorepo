import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createFileQueueStore, TASK_STATUS } from "@jfs/agentic-server";
import { afterEach, describe, expect, it } from "vitest";

describe("runtime lease recovery integration", () => {
  const dirs = [];

  afterEach(async () => {
    while (dirs.length > 0) {
      const dir = dirs.pop();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("re-queues expired running task leases back to pending", async () => {
    const queueDir = await fs.mkdtemp(path.join(os.tmpdir(), "market-research-lease-test-"));
    dirs.push(queueDir);

    const queueStore = createFileQueueStore({ queueDir });
    const task = {
      id: "task-lease-1",
      ownerId: "user-a",
      type: "market-research-initial",
      status: TASK_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      params: { sessionId: "session-1" },
      agentConfig: { agent: "llm-api", model: "gpt-test" },
    };

    await queueStore.enqueueTask(task);
    await queueStore.claimTask(task.id, {
      leaseOwner: "queue-processor-1",
      leaseDurationMs: 100,
    });

    const recovery = await queueStore.requeueExpiredTasks(new Date(Date.now() + 1000));
    const recoveredTask = await queueStore.readTask(task.id);

    expect(recovery).toEqual({
      recovered: 1,
      tasks: [task.id],
    });
    expect(recoveredTask.status).toBe(TASK_STATUS.PENDING);
    expect(recoveredTask.leaseOwner).toBeUndefined();
    expect(recoveredTask.leaseExpiresAt).toBeUndefined();
    expect(recoveredTask.lastHeartbeatAt).toBeUndefined();
  });
});
