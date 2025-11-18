import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/auth/login", form);
      const { token, user } = res.data;
      login(user, token);

      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "supervisor")
        navigate("/supervisor", { replace: true });
      else navigate("/user", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Erreur de connexion");
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

        {error && <div className="auth-error">{error}</div>}

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
    </div>
  );
};

export default Login;
