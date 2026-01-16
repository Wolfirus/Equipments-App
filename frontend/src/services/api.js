// src/services/api.js
/**
 * API client centralisé
 * - Gère le baseURL
 * - Ajoute automatiquement le token (Authorization: Bearer ...)
 * - Gère JSON / FormData
 * - Uniformise le traitement des erreurs
 *
 * Convention backend attendue:
 *   res.json({ success: true, message, data })
 * => on retourne toujours `data` si elle existe, sinon le payload complet.
 */

const API_BASE =
  (process.env.REACT_APP_API_URL || "").replace(/\/$/, "") ||
  "http://localhost:5000/api";

/** Récupère le token stocké */
function getToken() {
  return localStorage.getItem("auth_token") || "";
}

/** Construit une query string propre: {page:1, limit:20} => ?page=1&limit=20 */
function toQuery(params = {}) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    usp.set(key, String(value));
  }
  const q = usp.toString();
  return q ? `?${q}` : "";
}

/**
 * Appel HTTP générique
 * @param {string} path exemple: "/auth/login"
 * @param {object} options fetch options
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  // Ajout du token si présent
  if (token) headers.Authorization = `Bearer ${token}`;

  // Si body est FormData => pas de Content-Type (le navigateur le met tout seul)
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Lire la réponse
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  // Gestion erreurs backend
  if (!res.ok) {
    const msg =
      (payload && payload.message) ||
      (typeof payload === "string" ? payload : "Request failed");
    throw new Error(msg);
  }

  // Format backend standard => { success, message, data }
  return payload?.data !== undefined ? payload.data : payload;
}

/* ======================================================
   AUTH
====================================================== */
export const authAPI = {
  login: (payload) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  register: (payload) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
};

/* ======================================================
   USERS (profil + admin users)
====================================================== */
export const usersAPI = {
  // utilisateur connecté
  me: () => request("/users/me"),
  updateMe: (payload) =>
    request("/users/me", { method: "PATCH", body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request("/users/me/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return request("/users/me/avatar", { method: "PATCH", body: fd });
  },

  // admin
  list: () => request("/users"),
  update: (id, payload) =>
    request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  setRole: (id, role) =>
    request(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  remove: (id) => request(`/users/${id}`, { method: "DELETE" }),
};

/* ======================================================
   PROFILE (si tu utilises /api/profile)
====================================================== */
export const profileAPI = {
  get: () => request("/profile"),
  update: (payload) =>
    request("/profile", { method: "PUT", body: JSON.stringify(payload) }),
  updatePreferences: (payload) =>
    request("/profile/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  changePassword: (payload) =>
    request("/profile/password", { method: "PUT", body: JSON.stringify(payload) }),
  deleteAccount: () => request("/profile", { method: "DELETE" }),
};

/* ======================================================
   EQUIPMENT
====================================================== */
export const equipmentAPI = {
  list: (params = {}) => request(`/equipment${toQuery(params)}`),
  getById: (id) => request(`/equipment/${id}`),

  // disponibilité sur une période
  availability: (id, params) =>
    request(`/equipment/${id}/availability${toQuery(params)}`),

  create: (payload) =>
    request("/equipment", { method: "POST", body: JSON.stringify(payload) }),

  update: (id, payload) =>
    request(`/equipment/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  remove: (id) => request(`/equipment/${id}`, { method: "DELETE" }),

  categories: () => request("/categories"),
};

/* ======================================================
   RESERVATIONS
====================================================== */
export const reservationAPI = {
  myList: (params = {}) => request(`/reservations/me${toQuery(params)}`),
  manageList: (params = {}) => request(`/reservations/manage${toQuery(params)}`),

  create: (payload) =>
    request("/reservations", { method: "POST", body: JSON.stringify(payload) }),

  approve: (id) =>
    request(`/reservations/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({}),
    }),

  reject: (id, reason = "Demande refusée") =>
    request(`/reservations/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),

  cancel: (id) => request(`/reservations/${id}`, { method: "DELETE" }),
};

/* ======================================================
   NOTIFICATIONS
====================================================== */
export const notificationsAPI = {
  list: (params = {}) => request(`/notifications${toQuery(params)}`),
  unread: (params = {}) => request(`/notifications/unread${toQuery(params)}`),

  readAll: () =>
    request("/notifications/read-all", { method: "PUT", body: JSON.stringify({}) }),

  readOne: (id) =>
    request(`/notifications/${id}/read`, { method: "PUT", body: JSON.stringify({}) }),

  remove: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
};

/* ======================================================
   MESSAGES (contact)
====================================================== */
export const messagesAPI = {
  send: (payload) =>
    request("/messages", { method: "POST", body: JSON.stringify(payload) }),
  list: () => request("/messages"),
  remove: (id) => request(`/messages/${id}`, { method: "DELETE" }),
};

/* ======================================================
   ADMIN
====================================================== */
export const adminAPI = {
  stats: (params = {}) => request(`/admin/stats${toQuery(params)}`),
};

/**
 * Export default facultatif (si certaines pages font `import api from ...`)
 * Mais idéalement: utiliser les exports nommés (authAPI, usersAPI, etc.)
 */
const api = {
  request,
  authAPI,
  usersAPI,
  profileAPI,
  equipmentAPI,
  reservationAPI,
  notificationsAPI,
  messagesAPI,
  adminAPI,
};

export default api;
