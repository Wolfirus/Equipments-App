import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservationAPI } from '../services/api';

const ReservationManagement = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [view, setView] = useState("list");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({ start: "", end: "" });

  /** INITIAL FETCH */
  useEffect(() => {
    if (user && token) fetchReservations();
  }, [user, token]);

  /** FETCH LIST */
  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        status: filterStatus,
        category: filterCategory,
        start: filterDateRange.start,
        end: filterDateRange.end,
        page: 1,
        limit: 20
      };

      const response = await reservationAPI.getReservations(params);

      if (response.success) {
        setReservations(response.data.reservations);
      } else {
        setError("Impossible de charger les réservations");
      }
    } catch (e) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  /** FETCH ONE RESERVATION */
  const fetchSingleReservation = async (reservationId) => {
    try {
      const response = await reservationAPI.getReservationById(reservationId);
      if (response.success) {
        setSelectedReservation(response.data);
      } else {
        setError("Réservation introuvable");
      }
    } catch {
      setError("Impossible de charger cette réservation");
    }
  };

  /** CANCEL */
  const cancelReservation = async (reservationId, reason) => {
    try {
      const response = await reservationAPI.cancelReservation(reservationId, { reason });
      if (response.success) {
        setReservations(prev =>
          prev.map(r => r._id === reservationId ? { ...r, status: "cancelled" } : r)
        );
      } else setError("Échec de l'annulation");
    } catch {
      setError("Erreur réseau");
    }
  };

  /** DATE FORMATTERS */
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-FR");

  /** LIST RENDER */
  const renderListView = () => (
    <div className="glass-card">
      <h2>Réservations</h2>

      {/* Filters */}
      <div className="reservation-filters">
        <div className="filter-row">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="active">Actives</option>
            <option value="completed">Terminées</option>
            <option value="cancelled">Annulées</option>
          </select>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Toutes catégories</option>
          </select>
        </div>

        <div className="filter-row">
          <input type="date"
            value={filterDateRange.start}
            onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))} />

          <input type="date"
            value={filterDateRange.end}
            onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))} />
        </div>

        <button className="btn-primary" onClick={fetchReservations}>Filtrer</button>

        <button className="btn-ghost" onClick={() => {
          setFilterStatus("");
          setFilterCategory("");
          setFilterDateRange({ start: "", end: "" });
          fetchReservations();
        }}>
          Effacer filtres
        </button>

        <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
          + Nouvelle réservation
        </button>
      </div>

      {/* Reservation list */}
      <div className="reservation-list">
        {reservations.length === 0 ? (
          <div className="empty-state">
            <p>Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="reservations-grid">
            {reservations.map(res => (
              <div key={res._id} className={`reservation-item status-${res.status}`}>
                <div className="reservation-header">
                  <h4>{res.equipment_id?.name || "Équipement"}</h4>
                  <span>{formatDate(res.start_date)} → {formatDate(res.end_date)}</span>
                </div>

                <div className="reservation-actions">
                  {res.status === "pending" && (
                    <button className="btn-small btn-danger"
                      onClick={() => cancelReservation(res._id, "Annulé par utilisateur")}>
                      Annuler
                    </button>
                  )}

                  <button className="btn-small"
                    onClick={() => fetchSingleReservation(res._id)}>
                    Voir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /** CALENDAR VIEW */
  const renderCalendarView = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const days = [];
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // empty placeholders
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`e-${i}`} className="calendar-day empty" />);
    }

    // actual days
    for (let d = 1; d <= totalDays; d++) {
      const hasReservation = reservations.some(r => {
        const date = new Date(r.start_date);
        return date.getDate() === d && date.getMonth() === month;
      });

      days.push(
        <div key={d} className={`calendar-day ${hasReservation ? "has-reservation" : ""}`}>
          {d}
        </div>
      );
    }

    return (
      <div className="calendar-view">
        <h3>Calendrier du mois</h3>

        <div className="calendar-grid">{days}</div>

        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-color has-reservation"></span> Réservation
          </div>
          <div className="legend-item">
            <span className="legend-color"></span> Disponible
          </div>
        </div>
      </div>
    );
  };

  /** MAIN RETURN */
  if (loading) {
    return (
      <div className="center-page"><div className="glass-card"><h1>Chargement...</h1></div></div>
    );
  }

  if (error) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h1>Erreur</h1>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchReservations}>Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-page">
      <div className="glass-card">

        <div className="page-header">
          <h1>Gestion des Réservations</h1>

          <div className="view-toggle">
            <button className={`btn-toggle ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>Liste</button>
            <button className={`btn-toggle ${view === "calendar" ? "active" : ""}`} onClick={() => setView("calendar")}>Calendrier</button>
          </div>
        </div>

        {selectedReservation && (
          <div className="selected-reservation">
            <h3>Réservation sélectionnée</h3>
            <p><strong>Équipement :</strong> {selectedReservation.equipment_id?.name}</p>
            <p><strong>Période :</strong> {formatDate(selectedReservation.start_date)} - {formatDate(selectedReservation.end_date)}</p>
          </div>
        )}

        {view === "list" && renderListView()}
        {view === "calendar" && renderCalendarView()}
      </div>

      {/* Modal Création */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nouvelle Réservation</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>

            <form className="modal-form">
              <label>Équipement</label>
              <select required>
                <option value="">Sélectionner</option>
              </select>

              <label>Date début</label>
              <input type="date" required />

              <label>Date fin</label>
              <input type="date" required />

              <label>Quantité</label>
              <input type="number" min="1" required />

              <label>Objectif</label>
              <textarea rows="3" required />

              <button type="submit" className="btn-primary">Créer</button>
              <button className="btn-secondary" onClick={() => setShowCreateForm(false)}>Annuler</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationManagement;
