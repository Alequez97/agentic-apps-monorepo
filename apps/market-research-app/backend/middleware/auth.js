import jwt from "jsonwebtoken";
import config from "../config.js";

const JWT_SECRET = config.jwtSecret;

/**
 * Soft auth — attaches req.userId if a valid JWT cookie is present.
 * Never rejects the request; always calls next().
 */
export function softAuth(req, res, next) {
  const token = req.cookies?.jwt;
  if (token) {
    try {
      req.userId = jwt.verify(token, JWT_SECRET).sub;
    } catch {
      // Invalid or expired token — just ignore
    }
  }
  next();
}

/**
 * Hard auth — rejects with 401 if no valid JWT cookie is present.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.jwt;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.userId = jwt.verify(token, JWT_SECRET).sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
