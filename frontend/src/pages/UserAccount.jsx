import React, { useState, useEffect } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function UserAccount() {
  const { user, token, login, logout } = useAuth();
  const [form, setForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Mise à jour profil
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await client.patch(`/users/${user.id}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      login(res.data, token);
      setMsg("Profil mis à jour avec succès");
    } catch (err) {
      setMsg("Erreur lors de la mise à jour du profil");
    }

    setLoading(false);
  };

  // 🔹 Mise à jour mot de passe
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      await client.patch(`/users/${user.id}/password`, passwordForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMsg("Mot de passe modifié avec succès");
    } catch (err) {
      setMsg("Erreur lors du changement du mot de passe");
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="glass-card">
        <h1>Mon compte</h1>

        {msg && <div className="auth-success">{msg}</div>}

        <h2>Informations personnelles</h2>
        <form onSubmit={handleUpdateProfile} className="account-form">
          <label>Nom</label>
          <input name="name" value={form.name} onChange={handleChange} />

          <label>Email</label>
          <input name="email" value={form.email} onChange={handleChange} />

          <button className="btn-primary" disabled={loading}>
            Modifier le profil
          </button>
        </form>

        <h2>Modifier le mot de passe</h2>
        <form onSubmit={handleUpdatePassword} className="account-form">
          <label>Ancien mot de passe</label>
          <input
            type="password"
            name="oldPassword"
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
            }
          />

          <label>Nouveau mot de passe</label>
          <input
            type="password"
            name="newPassword"
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
          />

          <button className="btn-secondary" disabled={loading}>
            Modifier le mot de passe
          </button>
        </form>
      </div>
    </div>
  );
}
