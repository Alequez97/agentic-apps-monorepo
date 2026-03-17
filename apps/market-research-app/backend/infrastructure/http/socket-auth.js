import jwt from "jsonwebtoken";

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return cookies;
      }
      const name = part.slice(0, separatorIndex).trim();
      const value = decodeURIComponent(part.slice(separatorIndex + 1).trim());
      cookies[name] = value;
      return cookies;
    }, {});
}

export function getSocketUserId(socket, jwtSecret) {
  const token = parseCookies(socket.handshake.headers.cookie).jwt;
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret).sub;
  } catch {
    return null;
  }
}
