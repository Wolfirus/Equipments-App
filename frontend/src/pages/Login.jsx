import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/auth/login", form);
      const { token, user } = res.data;
      login(user, token);

      if (user.role === "admin") navigate("/app/admin", { replace: true });
      else if (user.role === "supervisor") navigate("/app/supervisor", { replace: true });
      else navigate("/app/user", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Connexion</h1>
          <p className="text-sm text-slate-600 mt-1">Accédez à votre espace.</p>

          {error && (
            <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                type="email"
                name="email"
                placeholder="exemple@mail.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Mot de passe</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-slate-900 font-semibold">
              Créer un compte
            </Link>
          </p>

          <button
            className="mt-4 w-full px-4 py-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-sm"
            onClick={() => navigate(from)}
            type="button"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
