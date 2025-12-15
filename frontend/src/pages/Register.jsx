import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import CenterAlert from "../components/CenterAlert";

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await client.post("/auth/register", form);
      const { token, user } = res.data;

      // auto-login après inscription
      login(user, token);

      setAlert({
        message: "Compte créé avec succès 🎉",
        type: "success",
      });

      setTimeout(() => {
        if (user.role === "admin") navigate("/admin", { replace: true });
        else if (user.role === "supervisor")
          navigate("/supervisor", { replace: true });
        else navigate("/user", { replace: true });
      }, 1500);
    } catch (err) {
      console.error(err);
      setAlert({
        message: err.response?.data?.message || "Erreur lors de l'inscription",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <h1>Créer un compte</h1>
        <p className="auth-subtitle">
          Inscrivez-vous pour accéder à la plateforme.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Nom</label>
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
            minLength={6}
          />

          <label>Rôle</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="user">Utilisateur</option>
            <option value="supervisor">Superviseur</option>
          </select>

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Création..." : "Créer un compte"}
          </button>
        </form>

        <p className="auth-footer">
          Déjà inscrit ?{" "}
          <Link to="/login" className="auth-link">
            Se connecter
          </Link>
        </p>
      </div>

      {alert && (
        <CenterAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
};

export default Register;
