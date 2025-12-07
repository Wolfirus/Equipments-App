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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  const isActivePath = (path) => {
    return location.pathname.startsWith(path);
  };

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
      icon: "🔧"
    },
    {
      path: "/reservations",
      label: "Réservations",
      roles: ["user", "supervisor", "admin"],
      icon: "📅"
    },
    {
      path: "/profile",
      label: "Profil",
      roles: ["user", "supervisor", "admin"],
      icon: "👤"
    },
    {
      path: "/admin",
      label: "Admin",
      roles: ["admin"],
      icon: "⚙️",
      submenu: [
        { path: "/admin", label: "Tableau de bord" },
        { path: "/admin/analytics", label: "Analytiques" },
        { path: "/admin/messages", label: "Messages" }
      ]
    },
    {
      path: "/supervisor",
      label: "Superviseur",
      roles: ["supervisor", "admin"],
      icon: "👨‍💼"
    },
    {
      path: "/user",
      label: "Utilisateur",
      roles: ["user", "supervisor", "admin"],
      icon: "📊"
    }
  ];

  const filteredLinks = authenticatedLinks.filter(link =>
    !link.roles || link.roles.includes(user?.role)
  );

  return (
<<<<<<< HEAD
    <nav className="glass-navbar">
      <div className="nav-inner">

        {/* LOGO */}
        <div className="nav-left" onClick={() => navigate("/")} role="button">
          <div className="nav-logo-mark">EQ</div>
          <div className="nav-logo-text">
            <span className="nav-logo-title">Equipements</span>
            <span className="nav-logo-subtitle">
              Plateforme de réservation
            </span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="nav-center">
          <Link to="/" className="nav-link">Accueil</Link>
          <Link to="/about" className="nav-link">À propos</Link>
          <Link to="/contact" className="nav-link">Contact</Link>

          {user && (
            <>
              {/* ADMIN */}
              {user.role === "admin" && (
                <>
                  <Link to="/admin" className="nav-link">Admin</Link>
                  <Link to="/admin/messages" className="nav-link">Messages</Link>
                </>
              )}

              {/* SUPERVISEUR */}
              {user.role === "supervisor" && (
                <Link to="/supervisor" className="nav-link">
                  Superviseur
                </Link>
              )}

              {/* UTILISATEUR */}
              {user.role === "user" && (
                <Link to="/user" className="nav-link">
                  Utilisateur
                </Link>
              )}

              {/* MON COMPTE */}
              <Link to="/account" className="nav-link">
                Mon compte
              </Link>
            </>
          )}
        </div>

        {/* RIGHT SIDE: USER INFO */}
        <div className="nav-right">
          {user ? (
            <>
              <span className="nav-user">
                {user.name} ({user.role})
              </span>
              <button className="btn-ghost" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => navigate("/login")}>
                Connexion
              </button>
              <button className="btn-primary" onClick={() => navigate("/register")}>
                Inscription
=======
    <>
      <nav className="glass-navbar">
        <div className="nav-inner">
          {/* Logo Section */}
          <div className="nav-left" onClick={() => navigate("/")} role="button">
            <div className="nav-logo-mark">EQ</div>
            <div className="nav-logo-text">
              <span className="nav-logo-title">Équipements</span>
              <span className="nav-logo-subtitle">
                Plateforme de réservation
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="nav-center">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${link.exact && location.pathname === link.path ? 'active' : ''} ${isActivePath(link.path) ? 'active-path' : ''}`}
              >
                {link.label}
              </Link>
            ))}

            {user && filteredLinks.map((link) => {
              if (link.submenu) {
                return (
                  <div key={link.path} className="nav-dropdown">
                    <Link
                      to={link.path}
                      className={`nav-link nav-dropdown-toggle ${isActivePath(link.path) ? 'active-path' : ''}`}
                    >
                      <span className="nav-link-icon">{link.icon}</span>
                      {link.label}
                    </Link>
                    <div className="nav-dropdown-menu">
                      {link.submenu.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className="nav-dropdown-item"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${isActivePath(link.path) ? 'active-path' : ''}`}
                >
                  <span className="nav-link-icon">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="nav-right">
            {user ? (
              <>
                {/* Notifications */}
                <div
                  className="nav-notifications"
                  onClick={toggleNotifications}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleNotifications()}
                >
                  <span className="nav-notification-icon">🔔</span>
                  {unreadCount > 0 && (
                    <span className="nav-notification-badge">{unreadCount}</span>
                  )}
                </div>

                {/* User Profile */}
                <div className="nav-user-section">
                  <div className="nav-user-info" onClick={() => navigate("/profile")}>
                    <div className="nav-user-avatar">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="nav-avatar-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
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
                <button
                  className="btn-ghost"
                  onClick={() => navigate("/login")}
                >
                  Connexion
                </button>
                <button
                  className="btn-primary"
                  onClick={() => navigate("/register")}
                >
                  Inscription
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications Dropdown */}
        {showNotifications && user && (
          <div className="nav-notifications-dropdown">
            <div className="nav-notifications-header">
              <h3>Notifications</h3>
              <button
                className="btn-close"
                onClick={() => setShowNotifications(false)}
              >
                ✕
              </button>
            </div>
            <div className="nav-notifications-content">
              {/* This will be populated with actual notifications */}
              <p className="nav-notifications-empty">
                {unreadCount === 0 ? "Aucune notification" : `${unreadCount} notification(s) non lue(s)`}
              </p>
            </div>
            <div className="nav-notifications-footer">
              <Link
                to="/notifications"
                className="btn-ghost"
                onClick={() => setShowNotifications(false)}
              >
                Voir tout
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Navigation */}
      {isMobile && (
        <div className="mobile-nav-overlay" onClick={() => setShowNotifications(false)}>
          <div className="mobile-nav" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <div className="mobile-nav-user">
                <div className="mobile-nav-avatar">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.name}
                      className="mobile-nav-avatar-img"
                    />
                  ) : (
                    <div className="mobile-nav-avatar-fallback">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="mobile-nav-user-info">
                  <span className="mobile-nav-name">{user?.name}</span>
                  <span className="mobile-nav-role">{user?.role}</span>
                </div>
              </div>
              <button
                className="mobile-nav-close"
                onClick={() => setShowNotifications(false)}
              >
                ✕
>>>>>>> compyle/recreate-app-design-admin-profile
              </button>
            </div>
            <div className="mobile-nav-content">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                  onClick={() => setShowNotifications(false)}
                >
                  {link.label}
                </Link>
              ))}

              {user && filteredLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mobile-nav-link ${isActivePath(link.path) ? 'active' : ''}`}
                  onClick={() => setShowNotifications(false)}
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