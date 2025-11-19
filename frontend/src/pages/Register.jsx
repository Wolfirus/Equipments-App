import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/auth/register", form);
      const { token, user } = res.data;
      login(user, token);

      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "supervisor")
        navigate("/supervisor", { replace: true });
      else navigate("/user", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Erreur à la création du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <h1>Inscription</h1>
        <p className="auth-subtitle">
          Créez un compte et choisissez votre rôle dans la plateforme.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Nom complet</label>
          <input
            type="text"
            name="name"
            placeholder="Votre nom"
            value={form.name}
            onChange={handleChange}
            required
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="exemple@mail.com"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Mot de passe</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label>Rôle</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="user">Utilisateur</option>
            <option value="supervisor">Superviseur</option>
          </select>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Création..." : "Créer le compte"}
          </button>
        </form>

        <p className="auth-footer">
          Déjà inscrit ?{" "}
          <Link to="/login" className="auth-link">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
