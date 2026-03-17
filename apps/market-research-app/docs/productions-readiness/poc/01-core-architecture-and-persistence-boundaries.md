NOT DONE

# Core Architecture And Runtime Isolation

Critical findings:

- Queue tasks are not yet modeled as user-owned runtime records, so task visibility and authorization boundaries are still weak.
- Socket events are still emitted too broadly instead of being scoped to the owning user or session.
- Queue runtime semantics are still transitional: no `leaseOwner`, no `leaseExpiresAt`, no heartbeat, and no robust multi-worker recovery model.
- Progress and logs are still local-runtime concerns instead of durable shared runtime outputs.

Why this is not done:

- The persistence boundary is cleaner than before, and queue/app storage can now be configured separately.
- However, a credible multi-user POC still needs tenant isolation and safer queue ownership semantics, not just cleaner repository structure.

What must happen next:

- Add `ownerId` to queued tasks and enforce owner-aware task reads.
- Stop broadcasting task and market-research events globally; emit them to user-scoped Socket.IO rooms instead.
- Protect `/api/tasks` behind auth and owner filtering, or remove it from non-admin flows.
- Add lease-based queue fields and behavior:
  - `leaseOwner`
  - `leaseExpiresAt`
  - worker heartbeat / renewal
- Replace startup-only orphan recovery with lease-aware recovery logic.

POC exit criteria:

- one user cannot see another user's tasks or live task events
- task runtime records are explicitly owned and queryable by owner
- running tasks can be safely recovered after worker death without relying only on process restart
