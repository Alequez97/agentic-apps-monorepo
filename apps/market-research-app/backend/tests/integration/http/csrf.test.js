import test from "node:test";
import assert from "node:assert/strict";
import { requireCsrf } from "../../../middleware/csrf.js";

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
