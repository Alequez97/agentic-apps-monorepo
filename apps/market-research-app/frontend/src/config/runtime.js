function normalizeApiBaseUrl(value) {
  if (!value || typeof value !== "string") {
    return "/api";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "/api";
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function resolveSocketConfig(apiBaseUrl) {
  if (isAbsoluteUrl(apiBaseUrl)) {
    const url = new URL(apiBaseUrl);
    return {
      socketOrigin: url.origin,
      socketPath: `${url.pathname}/socket.io`,
    };
  }

  return {
    socketOrigin: window.location.origin,
    socketPath: `${apiBaseUrl}/socket.io`,
  };
}

export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
);

const socketConfig = resolveSocketConfig(API_BASE_URL);

export const SOCKET_ORIGIN = socketConfig.socketOrigin;
export const SOCKET_PATH = socketConfig.socketPath;
