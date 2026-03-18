import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import config from "../config.js";
import * as logger from "../utils/logger.js";
import { requireAuth } from "../middleware/auth.js";
import { clearCsrfToken, issueCsrfToken } from "../middleware/csrf.js";
import { validateRequest } from "../middleware/validation.js";
import { googleAuthBodySchema } from "../validation/auth.js";

export function createAuthRouter({ userRepository, subscriptionService }) {
  const router = Router();
  const oauthClient = new OAuth2Client(config.googleClientId);

  const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  function buildUserResponse(user, subscription) {
    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
      plan: subscription?.plan ?? "free",
      creditsUsed: subscription?.creditsUsed ?? 0,
      creditsTotal: subscription?.creditsTotal ?? 0,
      creditsRemaining: subscription?.creditsRemaining ?? 0,
    };
  }

  router.post("/google", validateRequest({ body: googleAuthBodySchema }), async (req, res) => {
    const { credential } = req.body;

    if (!config.googleClientId) {
      logger.error("GOOGLE_CLIENT_ID is not configured", {
        component: "AuthRoutes",
      });
      return res.status(503).json({ error: "Google Sign-In is not configured on this server" });
    }

    let ticket;
    try {
      ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
    } catch (error) {
      logger.warn("Invalid Google ID token", {
        error: error.message,
        component: "AuthRoutes",
      });
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const payload = ticket.getPayload();
    const user = await userRepository.upsertUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    });
    const subscription = await subscriptionService.getSubscription(user.userId);

    const token = jwt.sign({ sub: user.userId }, config.jwtSecret, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, COOKIE_OPTIONS);
    const csrfToken = issueCsrfToken(res);

    logger.info("User signed in via Google", {
      userId: user.userId,
      component: "AuthRoutes",
    });

    return res.json({
      user: buildUserResponse(user, subscription),
      csrfToken,
    });
  });

  router.get("/me", requireAuth, async (req, res) => {
    const user = await userRepository.getUser(req.userId);

    if (!user) {
      res.clearCookie("jwt", COOKIE_OPTIONS);
      return res.status(401).json({ error: "User not found" });
    }
    const subscription = await subscriptionService.getSubscription(user.userId);
    const csrfToken = issueCsrfToken(res);

    return res.json({
      user: buildUserResponse(user, subscription),
      csrfToken,
    });
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie("jwt", COOKIE_OPTIONS);
    clearCsrfToken(res);
    return res.json({ success: true });
  });

  return router;
}
