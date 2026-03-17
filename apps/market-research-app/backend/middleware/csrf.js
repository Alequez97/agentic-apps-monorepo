import { randomBytes, timingSafeEqual } from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function shouldSkipCsrf(method) {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function isCsrfExemptPath(path) {
  const normalizedPath =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  return normalizedPath === "/auth/google" || normalizedPath === "/api/auth/google";
}

function buildCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function issueCsrfToken(res) {
  const token = randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
  return token;
}

export function clearCsrfToken(res) {
  res.clearCookie(CSRF_COOKIE_NAME, buildCsrfCookieOptions());
}

export function requireCsrf(req, res, next) {
  if (shouldSkipCsrf(req.method) || isCsrfExemptPath(req.path)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: "Missing CSRF token" });
  }

  const cookieBuffer = Buffer.from(cookieToken, "utf-8");
  const headerBuffer = Buffer.from(headerToken, "utf-8");

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  return next();
}
