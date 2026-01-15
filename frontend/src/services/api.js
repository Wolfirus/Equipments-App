const API_BASE =
  (process.env.REACT_APP_API_URL || "").replace(/\/$/, "") ||
  "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

function toQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  const q = usp.toString();
  return q ? `?${q}` : "";
}

async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = payload?.message || "Request failed";
    throw new Error(msg);
  }

  // backend standard: {success,message,data}
  return payload?.data !== undefined ? payload.data : payload;
}

/* =========================
   AUTH
========================= */
export const authAPI = {
  login: (payload) =>
    request(`/auth/login`, { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) =>
    request(`/auth/register`, { method: "POST", body: JSON.stringify(payload) }),
};

/* =========================
   USERS
========================= */
export const usersAPI = {
  me: () => request(`/users/me`),
  updateMe: (payload) =>
    request(`/users/me`, { method: "PATCH", body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request(`/users/me/password`, { method: "PATCH", body: JSON.stringify(payload) }),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return request(`/users/me/avatar`, { method: "PATCH", body: fd });
  },

  // admin
  list: () => request(`/users`),
  update: (id, payload) =>
    request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  setRole: (id, role) =>
    request(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  remove: (id) => request(`/users/${id}`, { method: "DELETE" }),
};

/* =========================
   PROFILE
========================= */
export const profileAPI = {
  // ✅ nouveaux noms
  get: () => request(`/profile`),
  update: (payload) =>
    request(`/profile`, { method: "PUT", body: JSON.stringify(payload) }),
  updatePreferences: (payload) =>
    request(`/profile/preferences`, { method: "PUT", body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    request(`/profile/password`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAccount: () => request(`/profile`, { method: "DELETE" }),

  // ✅ ALIAS (compatibilité ancien front)
  getProfile: () => request(`/profile`),
  updateProfile: (payload) =>
    request(`/profile`, { method: "PUT", body: JSON.stringify(payload) }),
  changeProfilePassword: (payload) =>
    request(`/profile/password`, { method: "PUT", body: JSON.stringify(payload) }),
};

export const equipmentAPI = {
  // ✅ NOMS PRINCIPAUX (nouveaux)
  list: (params = {}) => request(`/equipment${toQuery(params)}`),
  get: (id) => request(`/equipment/${id}`),

  create: (payload) =>
    request(`/equipment`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    request(`/equipment/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (id) =>
    request(`/equipment/${id}`, {
      method: "DELETE",
    }),

  categories: () => request(`/categories`),

  // ==========================
  // ✅ ALIAS (ancien code)
  // ==========================

  // utilisé dans EquipmentDetails, Reservation, etc.
  getEquipmentById: (id) => request(`/equipment/${id}`),

  // parfois utilisé avec id ou params
  getEquipment: (idOrParams) => {
    if (typeof idOrParams === "object") {
      return request(`/equipment${toQuery(idOrParams)}`);
    }
    return request(`/equipment/${idOrParams}`);
  },

  getAllEquipment: (params = {}) => request(`/equipment${toQuery(params)}`),
  getAllEquipments: (params = {}) => request(`/equipment${toQuery(params)}`),

  addEquipment: (payload) =>
    request(`/equipment`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateEquipment: (id, payload) =>
    request(`/equipment/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteEquipment: (id) =>
    request(`/equipment/${id}`, {
      method: "DELETE",
    }),

  getCategories: () => request(`/categories`),
};

/* =========================
   RESERVATIONS
========================= */
export const reservationAPI = {
  me: (params = {}) => request(`/reservations/me${toQuery(params)}`),
  manage: (params = {}) => request(`/reservations/manage${toQuery(params)}`),

  create: (payload) =>
    request(`/reservations`, { method: "POST", body: JSON.stringify(payload) }),

  approve: (id) =>
    request(`/reservations/${id}/approve`, { method: "PUT", body: JSON.stringify({}) }),

  reject: (id, reason = "Demande refusée") =>
    request(`/reservations/${id}/reject`, { method: "PUT", body: JSON.stringify({ reason }) }),

  cancel: (id) => request(`/reservations/${id}`, { method: "DELETE" }),
};

/* =========================
   NOTIFICATIONS
========================= */
export const notificationsAPI = {
  list: (params = {}) => request(`/notifications${toQuery(params)}`),
  unread: (params = {}) => request(`/notifications/unread${toQuery(params)}`),
  readAll: () =>
    request(`/notifications/read-all`, { method: "PUT", body: JSON.stringify({}) }),
  readOne: (id) =>
    request(`/notifications/${id}/read`, { method: "PUT", body: JSON.stringify({}) }),
  remove: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
};

/* =========================
   MESSAGES
========================= */
export const messagesAPI = {
  send: (payload) =>
    request(`/messages`, { method: "POST", body: JSON.stringify(payload) }),
  list: () => request(`/messages`),
  remove: (id) => request(`/messages/${id}`, { method: "DELETE" }),
};

/* =========================
   ADMIN
========================= */
export const adminAPI = {
  stats: (params = {}) => request(`/admin/stats${toQuery(params)}`),
};

/**
 * ✅ export default POUR COMPATIBILITÉ avec ton ancien code
 * Si une page fait `import api from "../services/api"`
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
