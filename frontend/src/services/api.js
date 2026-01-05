const API_BASE =
  (process.env.REACT_APP_API_URL || "").replace(/\/$/, "") ||
  "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("auth_token");
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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

/* =========================
   EQUIPMENT API
========================= */
export const equipmentAPI = {
  list: (params = {}) => request(`/equipment${toQuery(params)}`),
  get: (id) => request(`/equipment/${id}`),

  create: (payload) =>
    request(`/equipment`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    request(`/equipment/${id}`, {
      method: "PUT", // ✅ matches backend
      body: JSON.stringify(payload),
    }),

  remove: (id) =>
    request(`/equipment/${id}`, {
      method: "DELETE",
    }),

  // backward compatibility
  getEquipment: (params = {}) => request(`/equipment${toQuery(params)}`),
  getEquipmentById: (id) => request(`/equipment/${id}`),
  getCategories: () => request(`/categories`),
};

/* =========================
   RESERVATION API
========================= */
export const reservationAPI = {
  list: (params = {}) => request(`/reservations${toQuery(params)}`),
  get: (id) => request(`/reservations/${id}`),

  create: (payload) =>
    request(`/reservations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id, payload) =>
    request(`/reservations/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  approve: (id, payload = {}) =>
    request(`/reservations/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  reject: (id, payload = {}) =>
    request(`/reservations/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  cancel: (id, payload = {}) =>
    request(`/reservations/${id}`, {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),

  // backward compatibility
  getReservations: (params = {}) => request(`/reservations${toQuery(params)}`),
  getReservationById: (id) => request(`/reservations/${id}`),
  createReservation: (payload) =>
    request(`/reservations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateReservation: (id, payload) =>
    request(`/reservations/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  cancelReservation: (id, payload = {}) =>
    request(`/reservations/${id}`, {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),
};

/* =========================
   PROFILE API
========================= */
export const profileAPI = {
  getProfile: () => request(`/profile`),

  updateProfile: (payload) =>
    request(`/profile`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  updatePreferences: (payload) =>
    request(`/profile/preferences`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  changePassword: (payload) =>
    request(`/profile/password`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteAccount: (payload) =>
    request(`/profile`, {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),
};

export default {
  equipmentAPI,
  reservationAPI,
  profileAPI,
};
