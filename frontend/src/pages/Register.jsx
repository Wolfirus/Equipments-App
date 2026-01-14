import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      login(data.user, data.token);
      navigate("/equipment");
    } catch (e2) {
      setErr(e2.message || "Erreur inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Inscription</h1>
        <p className="text-sm text-slate-600 mt-1">
          Créez un compte pour réserver des équipements.
        </p>

        {err && (
          <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {err}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-semibold text-slate-700">Nom</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Mot de passe</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-4 text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link className="text-slate-900 underline" to="/login">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
