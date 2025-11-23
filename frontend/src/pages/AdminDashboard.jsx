import React, { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setError("");
        const res = await client.get("/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Erreur chargement utilisateurs :", err);
        setError("Impossible de charger les utilisateurs.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  if (!user || user.role !== "admin") {
    return <p className="center-text">Accès administrateur requis.</p>;
  }

  const startEdit = (u) => {
    setEditingId(u._id);
    setEditForm({ name: u.name, email: u.email });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", email: "" });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async (id) => {
    if (!window.confirm("Confirmer la mise à jour de cet utilisateur ?")) {
      return;
    }

    try {
      setSavingId(id);
      const res = await client.patch(
        `/users/${id}`,
        {
          name: editForm.name,
          email: editForm.email,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, ...res.data } : u))
      );
      cancelEdit();
    } catch (err) {
      console.error("Erreur mise à jour utilisateur :", err);
      alert(
        err.response?.data?.message || "Erreur lors de la mise à jour de l'utilisateur."
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      setSavingId(id);
      const res = await client.patch(
        `/users/${id}/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, role: res.data.role } : u))
      );
    } catch (err) {
      console.error("Erreur changement rôle :", err);
      alert("Erreur lors du changement de rôle.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (id) => {
    const confirm = window.confirm(
      "Voulez-vous vraiment supprimer cet utilisateur ?"
    );
    if (!confirm) return;

    try {
      setSavingId(id);
      await client.delete(`/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error("Erreur suppression utilisateur :", err);
      alert("Erreur lors de la suppression de l'utilisateur.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="title">Dashboard Administrateur</h1>
      <p className="subtitle">
        Bienvenue, {user.name}. Gérez les comptes utilisateurs de la plateforme.
      </p>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <p className="center-text">Chargement...</p>
      ) : (
        <div className="glass-card admin-card">
          <h2>Utilisateurs</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEditing = editingId === u._id;

                return (
                  <tr key={u._id}>
                    <td>
                      {isEditing ? (
                        <input
                          className="input-inline"
                          value={editForm.name}
                          onChange={(e) =>
                            handleEditChange("name", e.target.value)
                          }
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="input-inline"
                          value={editForm.email}
                          onChange={(e) =>
                            handleEditChange("email", e.target.value)
                          }
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={u.role}
                        disabled={savingId === u._id}
                        onChange={(e) =>
                          handleRoleChange(u._id, e.target.value)
                        }
                      >
                        <option value="user">Utilisateur</option>
                        <option value="supervisor">Superviseur</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isEditing ? (
                        <>
                          <button
                            className="btn-secondary btn-small"
                            disabled={savingId === u._id}
                            onClick={cancelEdit}
                          >
                            Annuler
                          </button>
                          <button
                            className="btn-purple btn-small"
                            disabled={savingId === u._id}
                            onClick={() => handleSaveEdit(u._id)}
                          >
                            Enregistrer
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => startEdit(u)}
                          >
                            Modifier
                          </button>

                          {u._id === user.id || u.email === user.email ? (
                            <span className="badge-disabled">
                              Mon compte
                            </span>
                          ) : (
                            <button
                              className="btn-danger btn-small"
                              disabled={savingId === u._id}
                              onClick={() => handleDeleteUser(u._id)}
                            >
                              Supprimer
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
