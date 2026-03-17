NOT DONE

# Security Hardening

Missing:

- No rate limiting on auth or report-generation endpoints.
- No clear CSRF posture is documented.
- No production-grade audit logging exists for account and billing actions.
- No abuse controls exist for scripted credit burn or task spam.

Why this is not done:

- The app has auth and input checks, but not a full production security baseline.
