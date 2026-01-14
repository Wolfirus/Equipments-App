import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, unreadCount, logout, refreshUnread } = useAuth();

  useEffect(() => {
    if (user) refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-slate-900">
          ISGB Equipments
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/about" className="text-slate-600 hover:text-slate-900">À propos</Link>
          <Link to="/contact" className="text-slate-600 hover:text-slate-900">Contact</Link>

          {user ? (
            <>
              <Link to="/equipment" className="text-slate-600 hover:text-slate-900">Équipements</Link>
              <Link to="/reservations" className="text-slate-600 hover:text-slate-900">Réservations</Link>
              <Link to="/profile" className="text-slate-600 hover:text-slate-900">Profil</Link>

              {(user.role === "admin" || user.role === "supervisor") && (
                <Link to="/admin" className="text-slate-600 hover:text-slate-900">Admin</Link>
              )}

              <button
                onClick={() => navigate("/notifications")}
                className="relative px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={logout}
                className="px-3 py-1 rounded-lg bg-slate-900 text-white hover:opacity-90"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-slate-900">Connexion</Link>
              <Link to="/register" className="px-3 py-1 rounded-lg bg-slate-900 text-white hover:opacity-90">
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
