import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout, unreadCount, markNotificationsAsRead } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showNotifications && unreadCount > 0) {
      markNotificationsAsRead();
    }
  };

  const isActivePath = (path) => location.pathname.startsWith(path);

  const navLinks = [
    { path: "/", label: "Accueil", exact: true },
    { path: "/about", label: "À propos" },
    { path: "/contact", label: "Contact" },
  ];

  const authenticatedLinks = [
    {
      path: "/equipment",
      label: "Équipements",
      roles: ["user", "supervisor", "admin"],
      icon: "🔧",
    },
    {
      path: "/reservations",
      label: "Réservations",
      roles: ["user", "supervisor", "admin"],
      icon: "📅",
    },
    {
      path: "/profile",
      label: "Profil",
      roles: ["user", "supervisor", "admin"],
      icon: "👤",
    },
    {
      path: "/admin",
      label: "Admin",
      roles: ["admin"],
      icon: "⚙️",
      submenu: [
        { path: "/admin", label: "Tableau de bord" },
        { path: "/admin/analytics", label: "Analytiques" },
        { path: "/admin/messages", label: "Messages" },
      ],
    },
    {
      path: "/supervisor",
      label: "Superviseur",
      roles: ["supervisor", "admin"],
      icon: "👨‍💼",
    },
    {
      path: "/user",
      label: "Utilisateur",
      roles: ["user", "supervisor", "admin"],
      icon: "📊",
    },
  ];

  const filteredLinks = authenticatedLinks.filter(
    (link) => !link.roles || link.roles.includes(user?.role)
  );

  return (
    <>
      <nav className="glass-navbar">
        <div className="nav-inner">

          {/* LOGO */}
          <div className="nav-left" onClick={() => navigate("/")} role="button">
            <div className="nav-logo-mark">EQ</div>
            <div className="nav-logo-text">
              <span className="nav-logo-title">Équipements</span>
              <span className="nav-logo-subtitle">Plateforme de réservation</span>
            </div>
          </div>

          {/* NAVIGATION - DESKTOP */}
          <div className="nav-center">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${
                  link.exact && location.pathname === link.path ? "active" : ""
                } ${isActivePath(link.path) ? "active-path" : ""}`}
              >
                {link.label}
              </Link>
            ))}

            {user &&
              filteredLinks.map((link) =>
                link.submenu ? (
                  <div key={link.path} className="nav-dropdown">
                    <Link
                      to={link.path}
                      className={`nav-link nav-dropdown-toggle ${
                        isActivePath(link.path) ? "active-path" : ""
                      }`}
                    >
                      <span className="nav-link-icon">{link.icon}</span>
                      {link.label}
                    </Link>
                    <div className="nav-dropdown-menu">
                      {link.submenu.map((sub) => (
                        <Link key={sub.path} to={sub.path} className="nav-dropdown-item">
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`nav-link ${isActivePath(link.path) ? "active-path" : ""}`}
                  >
                    <span className="nav-link-icon">{link.icon}</span>
                    {link.label}
                  </Link>
                )
              )}
          </div>

          {/* RIGHT SECTION */}
          <div className="nav-right">
            {user ? (
              <>
                {/* Notifications */}
                <div
                  className="nav-notifications"
                  onClick={toggleNotifications}
                  role="button"
                >
                  <span className="nav-notification-icon">🔔</span>
                  {unreadCount > 0 && (
                    <span className="nav-notification-badge">{unreadCount}</span>
                  )}
                </div>

                {/* USER PROFILE */}
                <div className="nav-user-section">
                  <div className="nav-user-info" onClick={() => navigate("/profile")}>
                    <div className="nav-user-avatar">
                      <div className="nav-avatar-fallback">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="nav-user-details">
                      <span className="nav-user-name">{user.name}</span>
                      <span className="nav-user-role">{user.role}</span>
                    </div>
                  </div>

                  <button className="btn-ghost" onClick={handleLogout}>
                    Déconnexion
                  </button>
                </div>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => navigate("/login")}>
                  Connexion
                </button>
                <button className="btn-primary" onClick={() => navigate("/register")}>
                  Inscription
                </button>
              </>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && user && (
          <div className="nav-notifications-dropdown">
            <div className="nav-notifications-header">
              <h3>Notifications</h3>
              <button className="btn-close" onClick={() => setShowNotifications(false)}>
                ✕
              </button>
            </div>
            <div className="nav-notifications-content">
              <p className="nav-notifications-empty">
                {unreadCount === 0
                  ? "Aucune notification"
                  : `${unreadCount} notification(s) non lue(s)`}
              </p>
            </div>
            <div className="nav-notifications-footer">
              <Link to="/notifications" className="btn-ghost">
                Voir tout
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* MOBILE NAV */}
      {isMobile && (
        <div className="mobile-nav-overlay" onClick={() => setShowNotifications(false)}>
          <div className="mobile-nav" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <div className="mobile-nav-user">
                <div className="mobile-nav-avatar">
                  <div className="mobile-nav-avatar-fallback">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                </div>
                <div className="mobile-nav-user-info">
                  <span className="mobile-nav-name">{user?.name}</span>
                  <span className="mobile-nav-role">{user?.role}</span>
                </div>
              </div>

              <button className="mobile-nav-close" onClick={() => setShowNotifications(false)}>
                ✕
              </button>
            </div>

            <div className="mobile-nav-content">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mobile-nav-link ${
                    location.pathname === link.path ? "active" : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {user &&
                filteredLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`mobile-nav-link ${isActivePath(link.path) ? "active" : ""}`}
                  >
                    <span className="mobile-nav-icon">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}

              {user && (
                <button className="mobile-nav-logout" onClick={handleLogout}>
                  <span className="mobile-nav-icon">🚪</span>
                  Déconnexion
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
