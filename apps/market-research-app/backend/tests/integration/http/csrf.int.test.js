import { afterEach, describe, expect, it } from "vitest";
import { createIntegrationTestContext } from "../helpers/create-test-app.js";

describe("csrf integration", () => {
  const contexts = [];

  afterEach(async () => {
    while (contexts.length > 0) {
      const ctx = contexts.pop();
      await ctx.cleanup();
    }
  });

  async function createContext() {
    const ctx = await createIntegrationTestContext();
    contexts.push(ctx);
    return ctx;
  }

  it("skips csrf enforcement for POST /api/auth/google and falls through to route validation", async () => {
    const ctx = await createContext();

    const response = await ctx.request(ctx.app).post("/api/auth/google").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).not.toBe("Missing CSRF token");
  });

  it("issues a csrf cookie with SameSite=Lax from the real auth endpoint", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("csrf-cookie");

    const response = await ctx.request(ctx.app)
      .get("/api/auth/me")
      .set("Cookie", `jwt=${auth.jwt}`);

    expect(response.status).toBe(200);
    const setCookieHeader = response.headers["set-cookie"] ?? [];
    const csrfCookie = setCookieHeader.find((value) => value.startsWith("csrf_token="));

    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).toContain("SameSite=Lax");
  });

  it("rejects protected POST requests without a csrf token", async () => {
    const ctx = await createContext();
    const auth = await ctx.createAuth("csrf-reject");
    const reportId = "99999999-9999-9999-9999-999999999999";

    const response = await ctx.request(ctx.app)
      .post(`/api/market-research/${reportId}/analyze`)
      .set("Cookie", `jwt=${auth.jwt}`)
      .send({ idea: "AI compliance copilot" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Missing CSRF token" });
  });
});
