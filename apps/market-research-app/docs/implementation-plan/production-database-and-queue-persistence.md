# Production Database And Queue Persistence Plan

Related readiness docs:

- `docs/productions-readiness/03-async-task-orchestration-and-live-progress.md`
- `docs/productions-readiness/04-report-history-and-report-retrieval.md`
- `docs/productions-readiness/06-local-file-persistence.md`
- `docs/productions-readiness/11-production-database-and-migrations.md`

## Why this plan exists

The current market research flow works, but core backend behavior is still coupled to the local filesystem. That is acceptable for local development and internal demos, but it is not a production-ready foundation for queue durability, report history, subscriptions, credits, or multi-instance execution.

The main problem is not only that data is stored in files. The deeper problem is that application and handler code knows too much about how and where data is stored. In several places, the code constructs paths directly or reads JSON files directly instead of talking to an abstraction that owns persistence.

Example of the current anti-pattern:

- handler code computes a competitor profile path with `getMarketResearchCompetitorProfilePath(...)`
- handler code then calls `tryReadJsonFile(...)` on that path

That means the handler is coupled to file layout, file naming, and serialization format. A clean production design must remove that knowledge from handlers and routes.

## Filesystem-coupled areas

### 1. Queue persistence is fully file-backed

`packages/agentic-server/src/persistence/tasks.js`

- Stores tasks as JSON files in `tasks/pending`, `tasks/running`, `tasks/completed`, `tasks/failed`, and `tasks/canceled`
- Uses file moves as queue state transitions
- Lists pending/running work by scanning directories
- Recovers orphaned tasks by scanning `running/`

`packages/agentic-server/src/orchestrator/task.js`

- Calls the file-backed task persistence module directly
- Binds orchestration behavior to `queueDir`

`packages/agentic-server/src/orchestrator/queue-processor.js`

- Polls file-backed persistence directly for `pending` and `running` tasks
- Claims work by moving files

Why this matters:

- no clear storage-agnostic queue contract
- local directory scanning will not scale well
- cross-instance coordination is weak
- retry, lease, dead-letter, and observability semantics are constrained by the file model

### 2. Market research domain persistence is file-backed

`apps/market-research-app/backend/persistence/market-research.js`

- Stores session state in `session.json`
- Stores report history by scanning session directories
- Stores final report in `report.json`
- Stores opportunity in `opportunity.json`
- Stores competitor profiles in `competitors/<competitorId>.json`
- Exposes path helpers, not just domain operations

`apps/market-research-app/backend/persistence/users.js`

- Stores users as `users/<userId>.json`

Why this matters:

- routes and handlers are forced to think in terms of files and paths
- report history and retention are tied to directory traversal
- future subscription, credits, and billing data would inherit the same problem if added here

### 3. Handlers know about file layout

`apps/market-research-app/backend/tasks/handlers/market-research.js`

- Reads `competitor-tasks.json` and `report.json` via path helpers plus `tryReadJsonFile(...)`
- Reads competitor output by resolving a file path first
- Writes final assembled report using `fs.mkdir(...)` and `fs.writeFile(...)`

This is one of the most important places to fix first. Task handlers should orchestrate business flow, not know where data lives.

Required direction:

- handlers should call repository methods such as `getCompetitorProfile`, `getInitialReportDraft`, `saveFinalReport`, `listCompetitorTasks`, `markSessionComplete`
- handlers should not build paths
- handlers should not call `fs` or raw JSON helpers for business data

### 4. Queue task definitions embed file-oriented output assumptions

`apps/market-research-app/backend/tasks/queue/market-research-initial.js`
`apps/market-research-app/backend/tasks/queue/market-research-competitor.js`
`apps/market-research-app/backend/tasks/queue/market-research-summary.js`

- Each task includes `outputFile` and `progressFile`
- Queueing code creates progress directories up front

Why this matters:

- task payload shape is mixed with filesystem execution details
- queue storage and artifact storage are not separated concerns

### 5. Handlers and agent execution are coupled to file outputs

`apps/market-research-app/backend/tasks/handlers/index.js`

- Templating injects `OUTPUT_FILE` and `PROGRESS_FILE`
- Enables unrestricted file writes for agents

`packages/agentic-server/src/executor/task-progress.js`

- Progress reporting is implemented as a writable markdown file under `temp/progress`

`packages/agentic-server/src/executor/task-logger.js`

- Task logs are written to local log files

Why this matters:

- artifacts, logs, and progress are currently treated as local files rather than pluggable runtime outputs
- this makes multi-instance execution and external storage harder

### 6. Delegation tooling still depends on temp files

`packages/llm-core/src/tools/delegation-tools.js`

- reads delegation request content from a temp file
- writes synthetic chat history files for delegated edit flows

This is not the first production blocker for market research persistence, but it follows the same pattern and should be considered in the broader storage abstraction work.

### 7. Cleanup and retention logic assumes local sessions

`apps/market-research-app/backend/utils/market-research-cleanup.js`

- scans sessions from local persistence
- deletes session metadata only

Why this matters:

- retention will be incomplete once reports, competitor profiles, logs, and credits move into proper stores
- production retention should be repository-driven and policy-driven

## Architectural direction

The system should be split into separate abstractions for:

1. Queue state
2. Domain data
3. Generated artifacts
4. Delegation payloads and agent context handoff
5. Runtime progress/log streaming

These must not be hidden behind one large "storage service". They are different concerns and should be switchable independently.

## Target abstraction model

### A. Queue store

Responsible for task lifecycle and claiming work.

Proposed interface:

```js
class QueueStore {
  enqueue(task) {}
  get(taskId) {}
  list(filters) {}
  listPending(limit) {}
  countRunning() {}
  claimNext({ workerId, limit, leaseMs }) {}
  markRunning(taskId, meta) {}
  markCompleted(taskId, resultMeta) {}
  markFailed(taskId, error) {}
  markCanceled(taskId) {}
  restart(taskId) {}
  recoverExpiredLeases() {}
}
```

Backends:

- `FileQueueStore`
- `MongoQueueStore`
- later `RedisQueueStore`
- later `SqlQueueStore`

Important note:

- Redis is a strong future fit for queue state
- MongoDB is acceptable as the first queue store if we keep the queue interface strict
- `queue-processor` and `TaskOrchestrator` must depend on `QueueStore`, not on file persistence functions

### B. Market research repository

Responsible for market research business data.

Proposed interface:

```js
class MarketResearchRepository {
  upsertSession(input) {}
  getSession(sessionId) {}
  listSessionsByOwner(userId, filters) {}
  saveInitialReportDraft(sessionId, report) {}
  getInitialReportDraft(sessionId) {}
  saveCompetitorTaskRefs(sessionId, refs) {}
  listCompetitorTaskRefs(sessionId) {}
  saveCompetitorProfile(sessionId, competitorId, profile) {}
  getCompetitorProfile(sessionId, competitorId) {}
  getCompetitorProfiles(sessionId, competitorIds) {}
  saveOpportunity(sessionId, opportunity) {}
  getOpportunity(sessionId) {}
  saveFinalReport(sessionId, report) {}
  getFinalReport(sessionId) {}
  markSessionComplete(sessionId, meta) {}
  deleteSession(sessionId) {}
}
```

Backends:

- `FileMarketResearchRepository`
- `MongoMarketResearchRepository`
- later `SqlMarketResearchRepository`

Important note:

- handlers and routes should only use this repository
- path helpers should become file-backend internals, not exported application API

### C. User and billing repositories

Even if subscriptions and credits are still incomplete, the storage boundary should be introduced now.

Proposed interfaces:

- `UserRepository`
- `SubscriptionRepository`
- `CreditLedgerRepository`

This avoids repeating the same file-coupling mistakes when billing is implemented.

### D. Artifact store

Responsible for large generated payloads and optional file/blob storage.

Examples:

- report JSON
- competitor JSON
- raw agent outputs
- exported PDFs later

Possible backends:

- local filesystem for development
- MongoDB documents for small/medium payloads
- object storage for larger artifacts later

Important note:

- domain records can reference artifacts by logical keys
- do not force every generated payload to live in the same database as queue state

### E. Progress and log sinks

Progress and logs should also move behind interfaces.

Proposed interfaces:

- `TaskProgressStore`
- `TaskLogStore`

Backends:

- filesystem for local dev
- MongoDB or Redis for short-lived progress state
- blob/object storage or centralized logging for durable logs

### F. Delegation store

Delegated work instructions and synthetic agent context should not depend on temp files on the parent runner.

Proposed interfaces:

- `DelegationStore`
- `AgentContextStore`

Proposed responsibilities:

- persist delegation instruction payloads by logical ID
- persist metadata about parent task, child task, session, and delegation type
- persist synthetic chat/context records used to bootstrap delegated agents
- allow any runner to resolve delegated work context by ID

Example interface:

```js
class DelegationStore {
  createInstruction(input) {}
  getInstruction(instructionId) {}
  markConsumed(instructionId, meta) {}
  listByParentTask(parentTaskId) {}
}

class AgentContextStore {
  createContext(input) {}
  getContext(contextId) {}
  appendMessage(contextId, message) {}
}
```

Important note:

- this store may live in the same MongoDB cluster as production data at first
- it can also be isolated into a separate database if you want operational separation
- the application layer should not care which one is used

For a distributed agent system this is essential:

- parent runner writes delegation instruction and context records
- queue payload references `instructionId` or `contextId`
- child runner reads context from durable storage
- no shared local disk is required between runners

## Recommended first production shape

For the first production implementation:

- MongoDB for market research domain data
- MongoDB for queue state
- MongoDB for delegation instructions and synthetic agent context
- filesystem can remain temporarily for logs and progress if needed

But the code must be written so that:

- queue code can move from MongoDB to Redis without changing handlers/routes
- domain data can stay in MongoDB while queue state moves elsewhere
- domain data can later move from MongoDB to SQL without changing task handlers

That means the migration priority is interface-first, backend-second.

## MongoDB data model proposal

### Collections

`queue_tasks`

- `_id`
- `type`
- `status`
- `params`
- `dependsOn`
- `agentConfig`
- `systemInstructionFile`
- `artifactRefs`
- `progressRef`
- `logRef`
- `createdAt`
- `startedAt`
- `completedAt`
- `failedAt`
- `leaseOwner`
- `leaseExpiresAt`
- `error`

Indexes:

- `{ status: 1, createdAt: 1 }`
- `{ leaseExpiresAt: 1 }`
- `{ "params.sessionId": 1 }`

`market_research_sessions`

- `_id`
- `sessionId`
- `ownerId`
- `idea`
- `status`
- `numCompetitors`
- `competitorCount`
- `createdAt`
- `lastAccessedAt`
- `completedAt`

Indexes:

- `{ ownerId: 1, createdAt: -1 }`
- `{ sessionId: 1 }` unique
- `{ lastAccessedAt: 1 }`

`market_research_reports`

- `_id`
- `sessionId`
- `kind`: `draft | final | opportunity`
- `payload`
- `createdAt`
- `updatedAt`

Indexes:

- `{ sessionId: 1, kind: 1 }` unique

`market_research_competitors`

- `_id`
- `sessionId`
- `competitorId`
- `taskId`
- `name`
- `url`
- `payload`
- `createdAt`
- `updatedAt`

Indexes:

- `{ sessionId: 1, competitorId: 1 }` unique
- `{ sessionId: 1, taskId: 1 }`

`delegation_instructions`

- `_id`
- `instructionId`
- `parentTaskId`
- `childTaskId`
- `type`
- `status`: `pending | consumed | failed | expired`
- `scope`
- `payload`
- `createdAt`
- `consumedAt`
- `expiresAt`

Indexes:

- `{ instructionId: 1 }` unique
- `{ parentTaskId: 1, createdAt: -1 }`
- `{ childTaskId: 1 }`
- `{ expiresAt: 1 }`

`agent_contexts`

- `_id`
- `contextId`
- `parentTaskId`
- `childTaskId`
- `kind`: `delegation_bootstrap | synthetic_chat | runner_state`
- `messages`
- `metadata`
- `createdAt`
- `updatedAt`

Indexes:

- `{ contextId: 1 }` unique
- `{ parentTaskId: 1 }`
- `{ childTaskId: 1 }`

`users`

- `_id`
- `userId`
- `email`
- `name`
- `picture`
- `plan`
- `createdAt`
- `lastSeenAt`

Later collections:

- `subscriptions`
- `credit_ledger`
- `billing_events`

## Migration phases

### Phase 1. Introduce storage contracts

Goal:

- remove direct filesystem knowledge from application code

Tasks:

- create interfaces for `QueueStore`, `MarketResearchRepository`, and `UserRepository`
- add file-backed implementations that preserve current behavior
- inject these dependencies through app bootstrap
- stop importing file persistence modules directly from handlers/routes/orchestrator

Exit criteria:

- current behavior still works with file-backed adapters
- handlers/routes only depend on interfaces

### Phase 2. Remove handler and route leakage

Goal:

- make task handlers storage-agnostic

Tasks:

- replace path-building and `tryReadJsonFile(...)` calls in `backend/tasks/handlers/market-research.js`
- replace direct `fs.writeFile(...)` report assembly writes with repository calls
- replace route access to `listSessions`, `getSession`, `getMarketResearchReport`, `getCompetitorProfile` with repository methods

Exit criteria:

- no handler or route computes business-data file paths
- no handler or route reads/writes business JSON directly

### Phase 3. Refactor queue processor to use `QueueStore`

Goal:

- make queue execution backend-pluggable

Tasks:

- replace `tasksPersistence.*` usage in orchestrator and queue processor
- redesign claiming semantics around leases instead of file moves
- add retry metadata, attempt count, dead-letter support, and worker ownership

Exit criteria:

- queue runtime no longer depends on directory scanning
- one backend can be swapped without changing orchestrator logic

### Phase 4. Add MongoDB implementations

Goal:

- provide first production backend

Tasks:

- implement `MongoQueueStore`
- implement `MongoMarketResearchRepository`
- implement `MongoUserRepository`
- add Mongo connection lifecycle and configuration
- add indexes on startup or via migrations

Exit criteria:

- app can run with Mongo-backed queue and domain data
- file-backed implementation still exists for local/dev fallback

### Phase 5. Introduce migrations and bootstrap checks

Goal:

- make schema evolution explicit and safe

Tasks:

- choose migration tooling for MongoDB
- add startup validation for required collections and indexes
- version document shapes where needed
- document rollback approach

Exit criteria:

- production deploys do not rely on ad hoc collection creation
- schema/index changes are repeatable

### Phase 6. Move delegation handoff off local temp files

Goal:

- make delegated work runnable on any server

Tasks:

- replace temp-file-based delegation request passing with `DelegationStore`
- replace synthetic local chat history files with durable `AgentContextStore` records
- change delegated queue payloads to reference logical IDs like `instructionId` and `contextId`
- update workers to resolve delegation context from stores, not local disk

Exit criteria:

- parent and child tasks no longer require shared filesystem access
- delegated tasks can start on a different runner from the parent

### Phase 7. Separate artifacts, progress, and logs

Goal:

- decouple queue/data persistence from runtime file artifacts

Tasks:

- replace `outputFile` and `progressFile` task fields with logical references
- introduce `ArtifactStore`, `TaskProgressStore`, and `TaskLogStore`
- keep local files as one adapter if needed, but do not expose paths to handlers

Exit criteria:

- task payloads describe logical storage targets, not raw paths
- progress and logs are backend-pluggable

### Phase 8. Migrate cleanup and retention

Goal:

- align retention with durable storage

Tasks:

- move cleanup job onto repository methods
- delete all related artifacts/data for expired sessions
- prepare separate retention rules for free vs paid plans

Exit criteria:

- retention works across all active backends
- cleanup is not tied to local directory structure

## Concrete code changes to make first

Start with these files:

- `apps/market-research-app/backend/tasks/handlers/market-research.js`
- `apps/market-research-app/backend/routes/market-research.js`
- `apps/market-research-app/backend/persistence/market-research.js`
- `apps/market-research-app/backend/persistence/users.js`
- `packages/agentic-server/src/orchestrator/task.js`
- `packages/agentic-server/src/orchestrator/queue-processor.js`
- `packages/agentic-server/src/persistence/tasks.js`

Recommended first refactor steps:

1. Turn `backend/persistence/market-research.js` into a file-backed repository implementation instead of a shared path/helper module.
2. Add repository methods for all reads/writes currently done from handlers.
3. Inject repository instances into route factories and task handler factories.
4. Add a `QueueStore` wrapper around current file-backed queue behavior.
5. Add `DelegationStore` and `AgentContextStore` contracts before changing delegation flows.
6. Move orchestrator and queue processor onto `QueueStore`.

## Non-goals for the first iteration

- full billing implementation
- full Redis queue implementation
- object storage for all artifacts
- advanced event sourcing

Those can come later. The first milestone is a clean persistence boundary.

## Success criteria

This work is done when:

- handlers do not know where reports or competitor profiles are stored
- routes do not know where sessions are stored
- queue processor does not know how task state is physically persisted
- MongoDB can be introduced without rewriting business logic
- Redis queue adoption later would only require a new `QueueStore` implementation
- SQL domain storage later would only require new repository implementations

## Bottom line

The first production implementation can use MongoDB for both queue state and domain data, but the code should not become "MongoDB-shaped". The real deliverable is a set of storage contracts that isolate queue semantics, business persistence, and artifact storage from handlers, routes, and orchestration flow.
