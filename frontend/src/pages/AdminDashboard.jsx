import React, { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [error, setError] = useState("");

  // ✅ supporte plusieurs formats de réponse backend
  const extractUsers = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.data?.users)) return payload.data.users;
    if (Array.isArray(payload?.data?.data?.users)) return payload.data.data.users;
    return [];
  };

  // ✅ supporte user enveloppé: {success, data: {...}} ou direct
  const extractUser = (payload) => {
    // payload = res.data
    return payload?.data?.user || payload?.data || payload?.user || payload;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setError("");
        setLoading(true);

        const res = await client.get("/users");
        const list = extractUsers(res.data);

        setUsers(list);
      } catch (err) {
        console.error("GET /users error:", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Impossible de charger les utilisateurs.";

        setError(msg);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <div className="bg-white shadow-xl rounded-2xl p-6">
        <div className="font-semibold text-slate-900">Accès administrateur requis.</div>
      </div>
    );
  }

  const startEdit = (u) => {
    setEditingId(u._id);
    setEditForm({ name: u.name, email: u.email });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", email: "" });
  };

  const handleSaveEdit = async (id) => {
    if (!window.confirm("Confirmer la mise à jour de cet utilisateur ?")) return;

    try {
      setSavingId(id);
      const res = await client.patch(`/users/${id}`, {
        name: editForm.name,
        email: editForm.email,
      });

      const updated = extractUser(res.data);

      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, ...updated } : u)));
      cancelEdit();
    } catch (err) {
      alert(err?.response?.data?.message || "Erreur lors de la mise à jour.");
    } finally {
      setSavingId(null);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      setSavingId(id);
      const res = await client.patch(`/users/${id}/role`, { role: newRole });

      const updated = extractUser(res.data);
      const role = updated?.role ?? res.data?.role ?? newRole;

      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role } : u)));
    } catch (err) {
      alert(err?.response?.data?.message || "Erreur lors du changement de rôle.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;

    try {
      setSavingId(id);
      await client.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Erreur lors de la suppression.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard Administrateur</h1>
        <p className="text-sm text-slate-600 mt-1">Bienvenue, {user.name}. Gérez les utilisateurs.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Utilisateurs</div>
          <div className="text-xs text-slate-500">{users.length} utilisateur(s)</div>
        </div>

        {loading ? (
          <div className="p-6 text-slate-600">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Nom</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Rôle</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => {
                  const isEditing = editingId === u._id;

                  return (
                    <tr key={u._id} className="border-t">
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          />
                        ) : (
                          <span className="font-medium text-slate-900">{u.name}</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                            value={editForm.email}
                            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                          />
                        ) : (
                          <span className="text-slate-600">{u.email}</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                          value={u.role}
                          disabled={savingId === u._id}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="user">Utilisateur</option>
                          <option value="supervisor">Superviseur</option>
                          <option value="admin">Administrateur</option>
                        </select>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="inline-flex gap-2">
                            <button
                              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                              onClick={cancelEdit}
                              disabled={savingId === u._id}
                            >
                              Annuler
                            </button>

                            <button
                              className="px-3 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
                              onClick={() => handleSaveEdit(u._id)}
                              disabled={savingId === u._id}
                            >
                              Enregistrer
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex gap-2">
                            <button
                              className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                              onClick={() => startEdit(u)}
                            >
                              Modifier
                            </button>

                            {u.email === user.email ? (
                              <span className="text-xs text-slate-500 px-3 py-2">Mon compte</span>
                            ) : (
                              <button
                                className="px-3 py-2 rounded-lg bg-red-600 text-white hover:opacity-90"
                                onClick={() => handleDeleteUser(u._id)}
                                disabled={savingId === u._id}
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!users.length && !error && (
              <div className="p-6 text-slate-600">Aucun utilisateur trouvé.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
