NOT DONE

# Core Architecture And Runtime Isolation

Current state:

- Queue tasks are now modeled as user-owned runtime records via `ownerId`.
- Socket events are now emitted to user-scoped Socket.IO rooms instead of being broadcast globally.
- `/api/tasks` is protected by auth and filtered by `ownerId`.
- Queue runtime semantics now include `leaseOwner`, `leaseExpiresAt`, heartbeat renewal, and expired-lease recovery.
- Progress/log delivery remains transport-scoped through the app bridge, while task logs themselves are still persisted locally by the runtime.

Why this is not done:

- The core architectural gap from this POC item is largely implemented in code.
- This file remains only because the final closeout step should include verification and then either removal of the file or moving any truly remaining concern into a narrower follow-up item.

Implemented:

- Added `ownerId` to queued tasks and propagated it through delegated tasks.
- Replaced global task and market-research emits with user-room-scoped Socket.IO delivery.
- Protected `/api/tasks` behind auth and owner filtering.
- Added lease-based queue fields and behavior:
  - `leaseOwner`
  - `leaseExpiresAt`
  - heartbeat / renewal
- Replaced startup-only orphan recovery with lease-aware recovery logic.
- Added integration coverage for:
  - socket owner-room delivery in `backend/tests/integration/socket/task-events/owner-room-delivery.test.js`
  - expired lease requeue in `backend/tests/integration/runtime/leases/expired-lease-requeue.test.js`

Remaining closeout work:

- Run one final manual multi-user verification in the deployed POC environment.
- Optionally add or restore explicit automated coverage for `/api/tasks` owner filtering if broader route-level test coverage is desired.
- Remove this file once the team is satisfied the POC exit criteria are met.

POC exit criteria status:

- one user cannot see another user's tasks or live task events: implemented in code, partially verified by automated socket coverage
- task runtime records are explicitly owned and queryable by owner: implemented in code
- running tasks can be safely recovered after worker death without relying only on process restart: implemented in code, verified by lease recovery coverage
