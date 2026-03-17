DONE

# Async Task Orchestration And Live Progress

Current state:

- Market research runs asynchronously.
- Task orchestration exists in the backend.
- Socket events stream live progress to the frontend.

Production note:

- The core capability exists, but retry strategy, dead-letter handling, and operational guarantees are still not production-ready.
