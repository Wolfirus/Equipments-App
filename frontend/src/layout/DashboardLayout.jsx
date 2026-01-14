import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SideItem = ({ to, label, icon }) => {
  return (
    <li className="mt-1">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
            isActive
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`
        }
        end={to === "/"}
      >
        <span className="text-lg">{icon}</span>
        {label}
      </NavLink>
    </li>
  );
};

export default function DashboardLayout() {
  const { user, logout, unreadCount } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isManager = isAdmin || isSupervisor;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <Link to="/" className="block">
            <div className="text-lg font-black text-slate-900">Équipements</div>
            <div className="text-xs text-slate-500">Plateforme de réservation</div>
          </Link>
        </div>

        <nav className="p-3">
          <ul>
            {/* ✅ MENU UTILISATEUR: affiché seulement pour role=user */}
            {!isManager && (
              <>
                <SideItem to="/equipment" label="Équipements" icon="🧰" />
                <SideItem to="/reservations" label="Réservations" icon="📅" />
              </>
            )}

            {/* ✅ Toujours visible */}
            <SideItem to="/notifications" label="Notifications" icon="🔔" />
            <SideItem to="/profile" label="Profil" icon="👤" />

            <div className="mt-6 px-4 text-xs uppercase tracking-wider text-slate-400">
              Informations
            </div>
            <SideItem to="/about" label="À propos" icon="ℹ️" />
            <SideItem to="/contact" label="Contact" icon="✉️" />

            {/* ✅ ADMINISTRATION: supervisor + admin */}
            {isManager && (
              <>
                <div className="mt-6 px-4 text-xs uppercase tracking-wider text-slate-400">
                  Administration
                </div>

                {/* ✅ Supervisor: on supprime "Dashboard"
                    ✅ Admin: on garde la route /admin mais label devient "Gestion utilisateurs"
                */}
                {isAdmin && (
                  <SideItem to="/admin" label="Gestion utilisateurs" icon="👥" />
                )}

                <SideItem
                  to="/admin/equipments"
                  label="Gestion équipements"
                  icon="🛠️"
                />
                <SideItem
                  to="/admin/reservations"
                  label="Gestion réservations"
                  icon="✅"
                />
                <SideItem to="/admin/messages" label="Messages" icon="💬" />
              </>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-sm text-slate-500">Bienvenue</div>
              <div className="text-lg font-bold text-slate-900">
                {user ? user.name : "Invité"}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="relative px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                onClick={() => navigate("/notifications")}
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
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
