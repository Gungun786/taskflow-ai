const BASE = import.meta.env.VITE_API_URL || "/api";
const STORAGE_KEY = "tf_auth";

export function getSavedAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveAuth(auth) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } catch (e) {
    // ignore storage errors
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore storage errors
  }
}

export function getAuthHeaders() {
  const auth = getSavedAuth();
  if (!auth?.token) return {};
  return { Authorization: `Bearer ${auth.token}` };
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(opts.headers || {}),
    },
    ...opts,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const login = (data) => req("/auth/login", { method: "POST", body: JSON.stringify(data) });
export const signup = (data) => req("/auth/signup", { method: "POST", body: JSON.stringify(data) });
export const me = () => req("/auth/me");
