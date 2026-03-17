import axios from "axios";
import { API_BASE_URL } from "../config/runtime";

// In-memory CSRF token for cross-origin deployments where the API cookie
// is not readable via document.cookie (different subdomain/domain).
let _csrfToken = null;

export function setCsrfToken(token) {
  _csrfToken = token || null;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

client.interceptors.request.use((requestConfig) => {
  const method = (requestConfig.method || "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = _csrfToken;
    if (token) {
      requestConfig.headers = requestConfig.headers || {};
      requestConfig.headers["X-CSRF-Token"] = token;
    }
  }

  return requestConfig;
});

export default client;
