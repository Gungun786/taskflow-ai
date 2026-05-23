import { getAuthHeaders } from "./auth";

// client/services/tasks.js
// All API calls — matches your Express routes exactly

const BASE = import.meta.env.VITE_API_URL || "/api";

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

// ————— Tasks
export const getTasks = (qs = "") => req(`/tasks${qs ? "?" + qs : ""}`);
export const getTask = (id) => req(`/tasks/${id}`);
export const createTask = (data) =>
  req("/tasks", { method: "POST", body: JSON.stringify(data) });
export const updateTask = (id, data) =>
  req(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const patchTask = (id, data) =>
  req(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteTask = (id) => req(`/tasks/${id}`, { method: "DELETE" });

export const getStats = () => req("/tasks/stats/summary");

// ————— AI Agent
export const chatWithAgent = (messages) =>
  req("/agent/chat", { method: "POST", body: JSON.stringify({ messages }) });

// ————— Projects (stub — extend when you add a projects model)
export const getProjects = () => Promise.resolve([]);
