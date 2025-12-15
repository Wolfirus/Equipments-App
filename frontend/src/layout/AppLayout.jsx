// src/layout/AppLayout.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItemsByRole = {
  user: [
    { to: "/user", label: "Tableau de bord", icon: "📊" },
    { to: "/equipment", label: "Équipements", icon: "🧪" },
    { to: "/reservations", label: "Mes réservations", icon: "📅" },
    { to: "/profile", label: "Profil", icon: "👤" },
  ],
  supervisor: [
    { to: "/supervisor", label: "Tableau de bord", icon: "📊" },
    { to: "/equipment", label: "Équipements", icon: "🧪" },
    { to: "/reservations", label: "Réservations", icon: "📅" },
    { to: "/profile", label: "Profil", icon: "👤" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "📊" },
    { to: "/equipment", label: "Équipements", icon: "🧪" },
    { to: "/reservations", label: "Réservations", icon: "📅" },
    { to: "/admin/messages", label: "Messages", icon: "✉️" },
    { to: "/profile", label: "Profil", icon: "👤" },
  ],
};

const roleLabel = (role) => {
  if (role === "admin") return "Administrateur";
  if (role === "supervisor") return "Superviseur";
  return "Utilisateur";
};

const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const role = user?.role || "user";
  const navItems = navItemsByRole[role] || [];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">
          <div className="app-shell__logo">EQ</div>
          <div className="app-shell__brand-text">
            <span className="app-shell__brand-title">Équipements</span>
            <span className="app-shell__brand-subtitle">
              Espace {roleLabel(role)}
            </span>
          </div>
        </div>

        <nav className="app-shell__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "app-shell__nav-item" +
                (isActive ? " app-shell__nav-item--active" : "")
              }
            >
              <span className="app-shell__nav-icon">{item.icon}</span>
              <span className="app-shell__nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-shell__sidebar-footer">
          <span className="app-shell__role-pill">{roleLabel(role)}</span>
        </div>
      </aside>

      {/* Main area */}
      <div className="app-shell__main">
        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
