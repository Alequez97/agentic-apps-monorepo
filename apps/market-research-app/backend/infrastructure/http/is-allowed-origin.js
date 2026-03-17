export function isAllowedOrigin(origin, allowedOrigins = []) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  return /^http:\/\/localhost:\d+$/.test(origin);
}
