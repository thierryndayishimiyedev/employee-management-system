// Central API client for talking to your Express/Supabase backend.
//
// Adjust API_BASE_URL and the route paths below to match your actual
// Express routes file (this assumes conventional REST paths built on
// top of the service functions you shared: createManager, getManagers,
// getManagerById, updateManager, deactivateManager).
//
// CRA env vars must be prefixed with REACT_APP_ and are read at build time.
// Put this in your .env file at the project root:
//   REACT_APP_API_BASE_URL=http://localhost:5000/api

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  // Adjust this to however your authStore actually persists the JWT.
  // Common patterns: localStorage.getItem('token'), or reading it off
  // the user object returned by useAuth().
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, token } = {}) {
  const authToken = token || getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // no JSON body (e.g. 204) — that's fine
  }

  if (!res.ok) {
    const message = payload?.error || payload?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload;
}

// ---- Positions ----
// Assumes GET /api/positions returns a list of { position_id, position_name, department_id, ... }
export function getPositions(token) {
  return request('/positions', { token });
}

// ---- Managers ----
export function getManagers(token) {
  return request('/managers', { token });
}

export function getManagerById(id, token) {
  return request(`/managers/${id}`, { token });
}

export function createManager(payload, token) {
  return request('/managers', { method: 'POST', body: payload, token });
}

export function updateManager(id, payload, token) {
  return request(`/managers/${id}`, { method: 'PUT', body: payload, token });
}

export function deactivateManager(id, token) {
  return request(`/managers/${id}/deactivate`, { method: 'PATCH', token });
}

// Real staff-count + payroll per manager (grouped by department).
// production_kg comes back null — no production table exists yet.
export function getManagerOverviews(token) {
  return request('/managers/overview', { token });
}
