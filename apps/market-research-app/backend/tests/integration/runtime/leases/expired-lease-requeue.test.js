import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createFileQueueStore,
  TASK_STATUS,
} from "@jfs/agentic-server";

test("expired running task leases are re-queued to pending", async (t) => {
  // Arrange
  const queueDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "market-research-lease-test-"),
  );
  t.after(async () => {
    await fs.rm(queueDir, { recursive: true, force: true });
  });

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

  // Act
  const recovery = await queueStore.requeueExpiredTasks(
    new Date(Date.now() + 1000),
  );
  const recoveredTask = await queueStore.readTask(task.id);

  // Assert
  assert.deepEqual(recovery, {
    recovered: 1,
    tasks: [task.id],
  });
  assert.equal(recoveredTask.status, TASK_STATUS.PENDING);
  assert.equal(recoveredTask.leaseOwner, undefined);
  assert.equal(recoveredTask.leaseExpiresAt, undefined);
  assert.equal(recoveredTask.lastHeartbeatAt, undefined);
});
