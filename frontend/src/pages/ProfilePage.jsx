import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileAPI } from "../services/api";

export default function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    department: "General",
    bio: "",
    avatar_url: "",
  });

  const [pwd, setPwd] = useState({ current: "", next: "" });

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await profileAPI.getProfile();
        const data = res?.data || res;

        setProfile({
          name: data?.name || user.name || "",
          email: data?.email || user.email || "",
          phone: data?.phone || "",
          department: data?.department || "General",
          bio: data?.bio || "",
          avatar_url: data?.avatar_url || "",
        });
      } catch (e) {
        setErr(e.message || "Erreur de chargement profil");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="font-semibold text-slate-900">
          Authentication requise
        </div>
        <button
          className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90 text-sm"
          onClick={() => navigate("/login")}
        >
          Se connecter
        </button>
      </div>
    );
  }

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        department: profile.department,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
      };

      const r = await updateProfile(payload);
      if (!r?.success) throw new Error(r?.error || "Erreur update");
      setOk("Profil mis à jour ✅");
    } catch (e2) {
      setErr(e2.message || "Erreur update");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setOk("");

    try {
      const r = await changePassword(pwd.current, pwd.next);
      if (!r?.success) throw new Error(r?.error || "Erreur mot de passe");
      setOk("Mot de passe changé ✅");
      setPwd({ current: "", next: "" });
    } catch (e2) {
      setErr(e2.message || "Erreur mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Profil</h1>
          <p className="text-sm text-slate-600">Gérez vos informations.</p>
        </div>
        <button
          className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Déconnexion
        </button>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {err}
        </div>
      )}
      {ok && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 text-sm">
          {ok}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="font-semibold text-slate-900">Informations</div>

          <form className="mt-4 space-y-4" onSubmit={saveProfile}>
            <div>
              <label className="text-xs font-semibold text-slate-700">Nom</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none bg-gray-50"
                value={profile.email}
                disabled
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Téléphone
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Département
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                value={profile.department}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, department: e.target.value }))
                }
              >
                <option value="General">Général</option>
                <option value="IT">IT</option>
                <option value="HR">RH</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Opérations</option>
                <option value="Research">Recherche</option>
                <option value="Development">Développement</option>
                <option value="Sales">Ventes</option>
                <option value="Support">Support</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Biographie
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                rows={4}
                value={profile.bio}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, bio: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Avatar URL
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                value={profile.avatar_url}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, avatar_url: e.target.value }))
                }
              />
            </div>

            <button
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white hover:opacity-90 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Sauvegarde..." : "Mettre à jour"}
            </button>
          </form>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="font-semibold text-slate-900">Sécurité</div>

          <form className="mt-4 space-y-4" onSubmit={savePassword}>
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Mot de passe actuel
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                type="password"
                value={pwd.current}
                onChange={(e) =>
                  setPwd((p) => ({ ...p, current: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Nouveau mot de passe
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none"
                type="password"
                value={pwd.next}
                onChange={(e) =>
                  setPwd((p) => ({ ...p, next: e.target.value }))
                }
                required
                minLength={6}
              />
            </div>

            <button
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white hover:opacity-90 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Changement..." : "Changer le mot de passe"}
            </button>
          </form>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-500">Chargement...</div>}
    </div>
  );
}
