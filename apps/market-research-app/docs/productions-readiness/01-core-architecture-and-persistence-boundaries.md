NOT DONE

# Core Architecture And Persistence Boundaries

Critical findings:

- Handler code still leaks through the persistence boundary and knows how market research data is stored.
- Queue runtime is still modeled around file-store style state transitions instead of production queue semantics such as claim, lease, retry, and acknowledgement.
- Delegation handoff still depends on local files and synthetic local context, which is not safe for distributed runners.
- Progress and artifact location details are still exposed upward into task composition instead of being fully hidden behind storage contracts.

Why this is not done:

- The architecture is significantly cleaner than before, but the remaining abstractions are still transitional.
- Production-ready distributed execution requires contract-first queue, progress, delegation, and repository boundaries.

What must happen next:

- Introduce explicit contracts in `agentic-server` for queue store, task progress store, task log store, task event publisher, and task queue/scheduler.
- Remove direct persistence access from market research handlers and move all report/competitor/session access behind repositories.
- Replace file-shaped queue transitions with production queue semantics.
- Move delegation instructions and delegated agent context into durable stores instead of local temp files.
