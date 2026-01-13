// frontend/src/services/api.js
import client from "../api/client";

/** Helper: standardize responses */
const safe = async (promise) => {
  try {
    const res = await promise;
    return { success: true, data: res.data };
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Erreur réseau";
    return { success: false, error: msg, raw: err?.response?.data };
  }
};

/* ================= AUTH ================= */
export const authAPI = {
  login: (payload) => safe(client.post("/auth/login", payload)),
  register: (payload) => safe(client.post("/auth/register", payload)),
};

/* ================= USERS (ADMIN) ================= */
export const usersAPI = {
  getUsers: () => safe(client.get("/users")),
  getMe: () => safe(client.get("/users/me")),
  updateMe: (payload) => safe(client.patch("/users/me", payload)),
  updateUser: (id, payload) => safe(client.put(`/users/${id}`, payload)),
  deleteUser: (id) => safe(client.delete(`/users/${id}`)),
};

/* ================= PROFILE ================= */
export const profileAPI = {
  // ✅ aliases compatibles avec ProfilePage.jsx
  get: () => safe(client.get("/profile")),
  getProfile: () => safe(client.get("/profile")),

  update: (payload) => safe(client.put("/profile", payload)),
  updateProfile: (payload) => safe(client.put("/profile", payload)),

  updatePreferences: (payload) => safe(client.put("/profile/preferences", payload)),
  changePassword: (payload) => safe(client.put("/profile/password", payload)),
  deleteAccount: (payload) => safe(client.delete("/profile", { data: payload })),
};

/* ================= CATEGORIES ================= */
export const categoryAPI = {
  getCategories: (params = {}) => safe(client.get("/categories", { params })),
  getTree: () => safe(client.get("/categories/tree")),
  getById: (id) => safe(client.get(`/categories/${id}`)),
  getCategoryEquipment: (id, params = {}) =>
    safe(client.get(`/categories/${id}/equipment`, { params })),

  // Admin
  create: (payload) => safe(client.post("/categories", payload)),
  update: (id, payload) => safe(client.put(`/categories/${id}`, payload)),
  remove: (id) => safe(client.delete(`/categories/${id}`)),
  stats: () => safe(client.get("/categories/stats")),
};

/* ================= EQUIPMENT ================= */
export const equipmentAPI = {
  // ✅ tes pages utilisent getEquipment + getEquipmentById + getCategories
  getEquipment: (params = {}) => safe(client.get("/equipment", { params })),
  list: (params = {}) => safe(client.get("/equipment", { params })),

  getEquipmentById: (id) => safe(client.get(`/equipment/${id}`)),
  get: (id) => safe(client.get(`/equipment/${id}`)),

  // ✅ Admin page utilise create/update/remove (on garde les deux)
  createEquipment: (payload) => safe(client.post("/equipment", payload)),
  create: (payload) => safe(client.post("/equipment", payload)),

  updateEquipment: (id, payload) => safe(client.put(`/equipment/${id}`, payload)),
  update: (id, payload) => safe(client.put(`/equipment/${id}`, payload)),

  deleteEquipment: (id) => safe(client.delete(`/equipment/${id}`)),
  remove: (id) => safe(client.delete(`/equipment/${id}`)),

  // categories
  getCategories: (params = {}) => safe(client.get("/categories", { params })),
};

/* ================= RESERVATIONS ================= */
export const reservationAPI = {
  getReservations: (params = {}) => safe(client.get("/reservations", { params })),
  list: (params = {}) => safe(client.get("/reservations", { params })),

  getReservationById: (id) => safe(client.get(`/reservations/${id}`)),
  get: (id) => safe(client.get(`/reservations/${id}`)),

  createReservation: (payload) => safe(client.post("/reservations", payload)),
  create: (payload) => safe(client.post("/reservations", payload)),

  updateReservation: (id, payload) => safe(client.put(`/reservations/${id}`, payload)),
  update: (id, payload) => safe(client.put(`/reservations/${id}`, payload)),

  cancelReservation: (id) => safe(client.put(`/reservations/${id}/cancel`)),
  cancel: (id) => safe(client.put(`/reservations/${id}/cancel`)),

  approveReservation: (id, payload = {}) => safe(client.put(`/reservations/${id}/approve`, payload)),
  approve: (id, payload = {}) => safe(client.put(`/reservations/${id}/approve`, payload)),

  rejectReservation: (id, payload = {}) => safe(client.put(`/reservations/${id}/reject`, payload)),
  reject: (id, payload = {}) => safe(client.put(`/reservations/${id}/reject`, payload)),

  getEquipmentAvailability: (equipmentId, params = {}) =>
    safe(client.get(`/reservations/equipment/${equipmentId}/availability`, { params })),

  getStats: () => safe(client.get("/reservations/stats")),
};

/* ================= MESSAGES ================= */
export const messageAPI = {
  // ✅ Contact.jsx يستعمل messageAPI.create أو sendMessage حسب نسختك → نخلي الاثنين
  sendMessage: (payload) => safe(client.post("/messages", payload)),
  create: (payload) => safe(client.post("/messages", payload)),

  getMessages: () => safe(client.get("/messages")),
  deleteMessage: (id) => safe(client.delete(`/messages/${id}`)),
};

/* ================= NOTIFICATIONS ================= */
export const notificationAPI = {
  getNotifications: (params = {}) => safe(client.get("/notifications", { params })),
  getUnread: (params = {}) => safe(client.get("/notifications/unread", { params })),
  markRead: (id) => safe(client.put(`/notifications/${id}/read`)),
  markAllRead: () => safe(client.put("/notifications/read-all")),
};

export default {
  authAPI,
  usersAPI,
  profileAPI,
  equipmentAPI,
  reservationAPI,
  categoryAPI,
  messageAPI,
  notificationAPI,
};
