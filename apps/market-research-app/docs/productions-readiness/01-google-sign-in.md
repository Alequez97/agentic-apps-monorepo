DONE

# Google Sign-In

Current state:

- Google sign-in exists.
- Backend verifies Google ID tokens.
- Backend issues an HttpOnly JWT cookie.
- Frontend can rehydrate the signed-in user.

Production note:

- This exists, but broader auth hardening is still a separate production task.
