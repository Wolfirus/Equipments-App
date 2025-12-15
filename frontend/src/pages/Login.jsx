import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import CenterAlert from "../components/CenterAlert";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await client.post("/auth/login", form);
      const { token, user } = res.data;

      // save user + token
      login(user, token);

      // success message
      setAlert({
        message: "Connexion réussie ✅",
        type: "success",
      });

      // redirect by role ONLY
      setTimeout(() => {
        if (user.role === "admin") {
          navigate("/admin", { replace: true });
        } else if (user.role === "supervisor") {
          navigate("/supervisor", { replace: true });
        } else {
          navigate("/user", { replace: true });
        }
      }, 1200);

    } catch (err) {
      console.error(err);
      setAlert({
        message: err.response?.data?.message || "Erreur de connexion",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <h1>Connexion</h1>
        <p className="auth-subtitle">
          Accédez à votre espace en utilisant vos identifiants.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="auth-footer">
          Pas encore de compte ?{" "}
          <Link to="/register" className="auth-link">
            Créer un compte
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

export default Login;
