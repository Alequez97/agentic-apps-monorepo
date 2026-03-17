import test from "node:test";
import assert from "node:assert/strict";
import { requireCsrf, issueCsrfToken } from "../../../middleware/csrf.js";

function createResponseDouble() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test("csrf middleware skips google sign-in on the mounted /api path", () => {
  // Arrange
  const req = {
    method: "POST",
    path: "/auth/google",
    cookies: {},
    get() {
      return undefined;
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  // Act
  requireCsrf(req, res, () => {
    nextCalled = true;
  });

  // Assert
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("issueCsrfToken sets cookie with sameSite lax for cross-site OAuth compatibility", () => {
  // Arrange
  let capturedName;
  let capturedOptions;
  const res = {
    cookie(name, _value, options) {
      capturedName = name;
      capturedOptions = options;
    },
  };

  // Act
  issueCsrfToken(res);

  // Assert — sameSite must be "lax" so the CSRF cookie is accessible after a
  // cross-site top-level redirect (e.g. Google OAuth redirect on mobile).
  assert.equal(capturedName, "csrf_token");
  assert.equal(capturedOptions.sameSite, "lax");
  assert.equal(capturedOptions.httpOnly, false);
});

test("csrf middleware rejects other post requests without a token", () => {
  // Arrange
  const req = {
    method: "POST",
    path: "/market-research/report-1",
    cookies: {},
    get() {
      return undefined;
    },
  };
  const res = createResponseDouble();
  let nextCalled = false;

  // Act
  requireCsrf(req, res, () => {
    nextCalled = true;
  });

  // Assert
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.payload, { error: "Missing CSRF token" });
});
