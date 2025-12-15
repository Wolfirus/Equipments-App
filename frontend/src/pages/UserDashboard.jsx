import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client, { authHeader } from "../api/client";

const UserDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentReservations, setRecentReservations] = useState([]);
  const [error, setError] = useState(null);

  // Charger stats + dernières réservations
  useEffect(() => {
    if (!user || !token) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Statistiques globales de l’utilisateur
        const statsRes = await client.get("/reservations/stats", {
          headers: authHeader(token),
        });

        if (statsRes.data?.success) {
          setStats(statsRes.data.data.overview);
        }

        // 2) Dernières réservations de l’utilisateur (max 5)
        const listRes = await client.get("/reservations", {
          headers: authHeader(token),
          params: {
            page: 1,
            limit: 5,
            sort: "start_date",
            order: "desc",
          },
        });

        if (listRes.data?.success) {
          setRecentReservations(listRes.data.data.reservations || []);
        }
      } catch (err) {
        console.error(err);
        setError("Impossible de charger vos données pour le moment.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "approved":
        return "Approuvée";
      case "active":
        return "Active";
      case "completed":
        return "Terminée";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "status-badge status-pending";
      case "approved":
        return "status-badge status-approved";
      case "active":
        return "status-badge status-active";
      case "completed":
        return "status-badge status-completed";
      case "cancelled":
        return "status-badge status-cancelled";
      default:
        return "status-badge";
    }
  };

  if (!user) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h1>Authentification requise</h1>
          <p>Veuillez vous connecter pour accéder à votre tableau de bord.</p>
          <button
            className="btn-primary"
            onClick={() => navigate("/login")}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container user-dashboard">
      <div className="dashboard-layout">
        {/* COLONNE PRINCIPALE */}
        <div className="dashboard-main">
          {/* En-tête */}
          <section className="glass-card dashboard-header">
            <h1>Bonjour, {user.name}</h1>
            <p className="dashboard-subtitle">
              Gérez vos réservations d’équipements et consultez votre activité.
            </p>

            <div className="dashboard-actions">
              <button
                className="btn-primary"
                onClick={() => navigate("/equipment")}
              >
                Réserver un équipement
              </button>
              <button
                className="btn-ghost"
                onClick={() => navigate("/profile")}
              >
                Voir mon profil
              </button>
            </div>
          </section>

          {/* Statistiques rapides */}
          <section className="dashboard-section">
            <h2 className="section-title">Mes statistiques</h2>

            {loading && !stats && (
              <div className="glass-card">
                <div className="loading-spinner">Chargement...</div>
              </div>
            )}

            {!loading && stats && (
              <div className="stats-grid">
                <div className="glass-card stat-card">
                  <span className="stat-label">Total des réservations</span>
                  <span className="stat-value">
                    {stats.total_reservations ?? 0}
                  </span>
                </div>

                <div className="glass-card stat-card">
                  <span className="stat-label">En attente</span>
                  <span className="stat-value">
                    {stats.pending_reservations ?? 0}
                  </span>
                </div>

                <div className="glass-card stat-card">
                  <span className="stat-label">Actives</span>
                  <span className="stat-value">
                    {stats.active_reservations ?? 0}
                  </span>
                </div>

                <div className="glass-card stat-card">
                  <span className="stat-label">Terminées</span>
                  <span className="stat-value">
                    {stats.completed_reservations ?? 0}
                  </span>
                </div>

                <div className="glass-card stat-card">
                  <span className="stat-label">Annulées</span>
                  <span className="stat-value">
                    {stats.cancelled_reservations ?? 0}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="dashboard-error">
                {error}
              </p>
            )}
          </section>

          {/* Astuces / infos */}
          <section className="dashboard-section">
            <h2 className="section-title">Astuces d’utilisation</h2>
            <div className="glass-card tips-card">
              <ul className="tips-list">
                <li>
                  Réservez toujours vos équipements en avance pour être sûr de
                  la disponibilité.
                </li>
                <li>
                  Sur la page <strong>Catalogue d’équipements</strong>, utilisez
                  les filtres pour trouver plus rapidement ce qu’il vous faut.
                </li>
                <li>
                  Si une réservation est <strong>en attente</strong> trop
                  longtemps, contactez votre superviseur ou l’administrateur.
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* ASIDE : HISTORIQUE */}
        <aside className="dashboard-aside">
          <div className="glass-card dashboard-history">
            <h2 className="section-title">Mes dernières réservations</h2>

            {loading && (
              <div className="loading-spinner">Chargement...</div>
            )}

            {!loading && recentReservations.length === 0 && (
              <p className="empty-text">
                Vous n’avez encore aucune réservation.
              </p>
            )}

            {!loading && recentReservations.length > 0 && (
              <ul className="history-list">
                {recentReservations.map((res) => (
                  <li key={res._id} className="history-item">
                    <div className="history-main">
                      <div className="history-title">
                        {res.equipment_id?.name || "Équipement"}
                      </div>
                      <div className="history-dates">
                        {formatDate(res.start_date)} →{" "}
                        {formatDate(res.end_date)}
                      </div>
                    </div>
                    <div className="history-meta">
                      <span className={statusBadgeClass(res.status)}>
                        {formatStatusLabel(res.status)}
                      </span>
                      {res.quantity > 1 && (
                        <span className="history-qty">
                          {res.quantity}x
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Si plus tard tu veux une page d’historique complète,
                tu pourras activer ce bouton */}
            {/* 
            <button
              className="btn-ghost history-more"
              onClick={() => navigate("/reservations")}
            >
              Voir tout l’historique
            </button>
            */}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default UserDashboard;
