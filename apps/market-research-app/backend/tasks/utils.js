import { randomBytes } from "crypto";

export function generateTaskId(prefix) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const random = randomBytes(3).toString("hex");
  return `${prefix}-${timestamp}-${random}`;
}
