import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";

/** Broadcast so the auth provider can drop a stale session from anywhere. */
export const UNAUTHORIZED_EVENT = "sm:unauthorized";

const TOKEN_KEY = "sm_auth_token";

/** Cross-origin deploys (Vercel → Render) cannot rely on cookies alone. */
export function getAuthToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export function clearAuthToken() {
  setAuthToken(null);
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Normalised error shape used by every screen: `code` is an i18n key under
 * `errors.*`, `details` carries extra context such as available stock.
 */
export class RequestError extends Error {
  constructor(code, { status, details } = {}) {
    super(code);
    this.name = "RequestError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return Promise.reject(new RequestError("timeout"));
    }
    if (!error.response) {
      return Promise.reject(new RequestError("network"));
    }

    const { status, data } = error.response;
    const code = data?.error || (status >= 500 ? "server" : "invalidForm");

    if (status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(new RequestError(code, { status, details: data?.details }));
  }
);

const unwrap = (promise) => promise.then((response) => response.data);

export const request = {
  get: (url, params) => unwrap(api.get(url, { params })),
  post: (url, body) => unwrap(api.post(url, body)),
  put: (url, body) => unwrap(api.put(url, body)),
  delete: (url) => unwrap(api.delete(url)),
};

/**
 * Sends a record together with an optional image as multipart/form-data.
 * `null` and `undefined` fields are dropped so partial updates stay partial.
 */
export function sendForm(url, { method = "post", fields = {}, file = null, fileField = "image" }) {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    form.append(key, typeof value === "boolean" ? String(value) : value);
  }
  if (file) form.append(fileField, file);

  return unwrap(api.request({ url, method, data: form }));
}

export function assetUrl(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  // Uploads live next to the API, which may sit on a different host than the UI.
  const base = API_BASE.replace(/\/api\/?$/, "");
  return `${base}${path}`;
}
