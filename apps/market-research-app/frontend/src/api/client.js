import axios from "axios";

function getCookie(name) {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

const client = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

client.interceptors.request.use((requestConfig) => {
  const method = (requestConfig.method || "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = getCookie("csrf_token");
    if (csrfToken) {
      requestConfig.headers = requestConfig.headers || {};
      requestConfig.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return requestConfig;
});

export default client;
