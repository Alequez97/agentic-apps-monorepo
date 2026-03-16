import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import config from "../config.js";
import * as logger from "../utils/logger.js";
import { upsertUser, getUser } from "../persistence/users.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const oauthClient = new OAuth2Client(config.googleClientId);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/google
// Verify a Google ID token, upsert user, issue HttpOnly JWT cookie.
router.post("/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential || typeof credential !== "string") {
    return res.status(400).json({ error: "credential is required" });
  }

  if (!config.googleClientId) {
    logger.error("GOOGLE_CLIENT_ID is not configured", {
      component: "AuthRoutes",
    });
    return res
      .status(503)
      .json({ error: "Google Sign-In is not configured on this server" });
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
  const user = await upsertUser({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });

  const token = jwt.sign({ sub: user.userId }, config.jwtSecret, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, COOKIE_OPTIONS);

  logger.info("User signed in via Google", {
    userId: user.userId,
    component: "AuthRoutes",
  });

  return res.json({
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
    },
  });
});

// GET /api/auth/me
// Re-hydrate auth state from HttpOnly cookie.
router.get("/me", requireAuth, async (req, res) => {
  const user = await getUser(req.userId);

  if (!user) {
    res.clearCookie("jwt", COOKIE_OPTIONS);
    return res.status(401).json({ error: "User not found" });
  }

  return res.json({
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      picture: user.picture,
    },
  });
});

// POST /api/auth/logout
// Clear the JWT cookie.
router.post("/logout", (req, res) => {
  res.clearCookie("jwt", COOKIE_OPTIONS);
  return res.json({ success: true });
});

export default router;
