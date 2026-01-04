import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await client.post("/auth/register", form);
      const { token, user } = res.data;
      login(user, token);

      if (user.role === "admin") navigate("/app/admin", { replace: true });
      else if (user.role === "supervisor") navigate("/app/supervisor", { replace: true });
      else navigate("/app/user", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Erreur à la création du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-md px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Inscription</h1>
          <p className="text-sm text-slate-600 mt-1">Créez un compte.</p>

          {error && (
            <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-slate-700">Nom complet</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                type="text"
                name="name"
                placeholder="Votre nom"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

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

            <div>
              <label className="text-xs font-semibold text-slate-700">Rôle</label>
              <select
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="user">Utilisateur</option>
                <option value="supervisor">Superviseur</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Création..." : "Créer le compte"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-slate-900 font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
