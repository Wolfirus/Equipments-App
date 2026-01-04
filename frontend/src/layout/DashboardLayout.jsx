import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NavItem = ({ to, label, icon }) => {
  const location = useLocation();
  const active = location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <li className="mt-1">
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition
          ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
      >
        <span className="text-lg">{icon}</span>
        {label}
      </Link>
    </li>
  );
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-72 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-5 border-b border-gray-200">
          <div className="text-lg font-black text-slate-900">Équipements</div>
          <div className="text-xs text-slate-500">Plateforme de réservation</div>
        </div>

        <nav className="p-3">
          <ul>
            <NavItem to="/" label="Accueil" icon="🏠" />
            <NavItem to="/equipment" label="Équipements" icon="🧰" />
            <NavItem to="/reservations" label="Réservations" icon="📅" />
            <NavItem to="/profile" label="Profil" icon="👤" />

            <div className="mt-6 px-4 text-xs uppercase tracking-wider text-slate-400">
              Public
            </div>
            <NavItem to="/" label="Site" icon="🌐" />
            <NavItem to="/about" label="À propos" icon="ℹ️" />
            <NavItem to="/contact" label="Contact" icon="✉️" />

            {user?.role === "admin" && (
              <>
                <div className="mt-6 px-4 text-xs uppercase tracking-wider text-slate-400">
                  Administration
                </div>
                <NavItem to="/admin" label="Dashboard" icon="⚙️" />
                <NavItem to="/admin/equipments" label="Gestion équipements" icon="🛠️" />
                <NavItem to="/admin/reservations" label="Gestion réservations" icon="✅" />
                <NavItem to="/admin/messages" label="Messages" icon="💬" />
              </>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="pl-72 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-sm text-slate-500">Bienvenue</div>
              <div className="text-lg font-bold text-slate-900">
                {user ? user.name : "Invité"}
              </div>
              {/* debug */}
              <div className="text-[11px] text-slate-400">
                route: {location.pathname}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                >
                  Déconnexion
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Inscription
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
