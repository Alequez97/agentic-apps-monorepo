# Delegation And Distributed Execution

This document describes how task delegation works after the recent queue and delegation refactors.

It intentionally describes the current runtime behavior.
It is not an implementation plan.

## Current delegation flow

The parent market-research task enables `delegate_task` through:

- `apps/market-research-app/backend/tasks/handlers/index.js`
- `packages/llm-core/src/tools/delegation-tools.js`

For the market-research app, delegation is now fully caller-configured:

1. The parent task calls `delegate_task` with:
   - `type`
   - `request`
   - `params`
2. `DelegationToolExecutor` resolves the request content.
3. The executor looks up the registered delegation target for that `type`.
4. The target-specific `buildQueueParams(...)` function maps:
   - parent task ID
   - request content
   - tool params
   into the child queue payload.
5. The executor calls the target's `queue(...)` function.

For `market-research-competitor`, the app currently maps:

- `request` -> `competitorBriefing`
- `parentTaskId` -> `delegatedByTaskId`

This keeps task-specific behavior out of `llm-core`.

## What changed

Before the refactor, delegation tooling contained app-specific branches and legacy fallback behavior from another project.

After the refactor:

- `llm-core` no longer hardcodes `market-research-competitor`
- delegation behavior is defined by the app at registration time
- delegation uses inline `request` only
- the queue store uses a single canonical contract (`claimTask`, `completeTask`, `failTask`, `cancelTask`, `requeueTask`)

## What is still not distributed-safe

This app is cleaner now, but it is still not ready for distributed runners.

The remaining blockers are:

- delegated request content is still resolved by the parent runner process before queueing the child task
- task progress is still file-backed
- task logs are still file-backed
- queue state can now be selected per provider, but the production Mongo path has not been validated end-to-end yet
- artifacts are now written through logical repository/output tools, but the default local provider still persists them on local disk

That means this is still a single-host development/runtime shape, not a multi-runner production shape.

## Why the file-based approach still fails in a distributed system

In a distributed system, parent and child tasks may run on different machines.

If queue state, progress, logs, artifacts, or delegation bootstrap context depend on local disk:

- another runner cannot safely claim or inspect the same task state
- progress and logs become machine-local instead of task-local
- artifact paths stop being globally meaningful
- cleanup and recovery depend on which machine created the files
- delegation/bootstrap state cannot be reconstructed reliably on a different runner

The core issue is not just "files are inconvenient".
The issue is that local filesystem state is not a durable, shared coordination boundary.

## Production direction

For distributed execution, delegation should move to durable logical stores:

- queue payload contains logical references, not machine-local file paths
- delegation request payloads live in durable storage
- child task bootstrap/context is loaded by ID
- progress and logs publish to pluggable stores/sinks
- artifacts are addressed by logical keys, not local path conventions

In other words:

- the refactor removed app-specific delegation coupling
- it did not solve distributed execution yet
- distributed execution still requires durable shared stores
