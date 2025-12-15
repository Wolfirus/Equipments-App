import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { reservationAPI } from "../services/api";
import CenterAlert from "../components/CenterAlert";

const ReservationManagement = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [view, setView] = useState("list");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({ start: "", end: "" });

  const [alert, setAlert] = useState(null);

  /** INITIAL FETCH */
  useEffect(() => {
    if (user && token) fetchReservations();
  }, [user, token]);

  /** FETCH LIST */
  const fetchReservations = async () => {
    try {
      setLoading(true);

      const params = {
        status: filterStatus,
        category: filterCategory,
        start: filterDateRange.start,
        end: filterDateRange.end,
        page: 1,
        limit: 20,
      };

      const response = await reservationAPI.getReservations(params);

      if (response.success) {
        setReservations(response.data.reservations);
      } else {
        setAlert({
          message: "Impossible de charger les réservations",
          type: "error",
        });
      }
    } catch {
      setAlert({
        message: "Erreur réseau lors du chargement",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /** FETCH ONE */
  const fetchSingleReservation = async (reservationId) => {
    try {
      const response = await reservationAPI.getReservationById(reservationId);
      if (response.success) {
        setSelectedReservation(response.data);
      } else {
        setAlert({
          message: "Réservation introuvable",
          type: "error",
        });
      }
    } catch {
      setAlert({
        message: "Impossible de charger cette réservation",
        type: "error",
      });
    }
  };

  /** CANCEL */
  const cancelReservation = async (reservationId, reason) => {
    try {
      const response = await reservationAPI.cancelReservation(reservationId, {
        reason,
      });

      if (response.success) {
        setReservations((prev) =>
          prev.map((r) =>
            r._id === reservationId ? { ...r, status: "cancelled" } : r
          )
        );

        setAlert({
          message: "Réservation annulée avec succès ❌",
          type: "success",
        });
      } else {
        setAlert({
          message: "Échec de l'annulation",
          type: "error",
        });
      }
    } catch {
      setAlert({
        message: "Erreur réseau lors de l'annulation",
        type: "error",
      });
    }
  };

  /** FORMAT DATE */
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("fr-FR");

  /** LIST VIEW */
  const renderListView = () => (
    <div className="glass-card">
      <h2>Réservations</h2>

      <div className="reservation-list">
        {reservations.length === 0 ? (
          <div className="empty-state">
            <p>Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="reservations-grid">
            {reservations.map((res) => (
              <div
                key={res._id}
                className={`reservation-item status-${res.status}`}
              >
                <div className="reservation-header">
                  <h4>{res.equipment_id?.name || "Équipement"}</h4>
                  <span>
                    {formatDate(res.start_date)} →{" "}
                    {formatDate(res.end_date)}
                  </span>
                </div>

                <div className="reservation-actions">
                  {res.status === "pending" && (
                    <button
                      className="btn-small btn-danger"
                      onClick={() =>
                        cancelReservation(
                          res._id,
                          "Annulé par utilisateur"
                        )
                      }
                    >
                      Annuler
                    </button>
                  )}

                  <button
                    className="btn-small"
                    onClick={() => fetchSingleReservation(res._id)}
                  >
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

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`e-${i}`} className="calendar-day empty" />);
    }

    for (let d = 1; d <= totalDays; d++) {
      const hasReservation = reservations.some((r) => {
        const date = new Date(r.start_date);
        return (
          date.getDate() === d && date.getMonth() === month
        );
      });

      days.push(
        <div
          key={d}
          className={`calendar-day ${
            hasReservation ? "has-reservation" : ""
          }`}
        >
          {d}
        </div>
      );
    }

    return (
      <div className="calendar-view">
        <h3>Calendrier du mois</h3>
        <div className="calendar-grid">{days}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h1>Chargement...</h1>
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
            <button
              className={`btn-toggle ${
                view === "list" ? "active" : ""
              }`}
              onClick={() => setView("list")}
            >
              Liste
            </button>
            <button
              className={`btn-toggle ${
                view === "calendar" ? "active" : ""
              }`}
              onClick={() => setView("calendar")}
            >
              Calendrier
            </button>
          </div>
        </div>

        {selectedReservation && (
          <div className="selected-reservation">
            <h3>Réservation sélectionnée</h3>
            <p>
              <strong>Équipement :</strong>{" "}
              {selectedReservation.equipment_id?.name}
            </p>
            <p>
              <strong>Période :</strong>{" "}
              {formatDate(
                selectedReservation.start_date
              )}{" "}
              -{" "}
              {formatDate(
                selectedReservation.end_date
              )}
            </p>
          </div>
        )}

        {view === "list" && renderListView()}
        {view === "calendar" && renderCalendarView()}
      </div>

      {alert && (
        <CenterAlert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
};

export default ReservationManagement;
