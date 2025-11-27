import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reservationAPI, equipmentAPI } from '../services/api';
import './EquipmentCard'; // Assuming this exists

const ReservationManagement = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'calendar', 'both'
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateRange, setFilterDateRange] = useState({ start: '', end: '' });

  // Fetch reservations on component mount
  useEffect(() => {
    if (user && token) {
      fetchReservations();
    }
  }, [user, token]);

  const fetchReservations = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        status: filterStatus,
        category: filterCategory,
        page: 1,
        limit: 20
      };

      const response = await reservationAPI.getReservations(params);

      if (response.success) {
        setReservations(response.data.reservations);
      } else {
        setError(response.error || 'Failed to fetch reservations');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleReservation = async (reservationId) => {
    try {
      const response = await reservationAPI.getReservationById(reservationId);

      if (response.success) {
        setSelectedReservation(response.data);
      } else {
        setError('Reservation not found');
      }
    } catch (error) {
      setError('Failed to fetch reservation details');
    }
  };

  const createReservation = async (reservationData) => {
    try {
      setLoading(true);
      const response = await reservationAPI.createReservation(reservationData);

      if (response.success) {
        // Fetch updated list
        await fetchReservations();
        setShowCreateForm(false);
        // Navigate to reservation details or management
        navigate('/reservations');
      } else {
        setError(response.error || 'Failed to create reservation');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateReservation = async (reservationId, updateData) => {
    try {
      const response = await reservationAPI.updateReservation(reservationId, updateData);

      if (response.success) {
        // Update local state
        setReservations(prev =>
          prev.map(reservation =>
            reservation._id === reservationId ? { ...reservation, ...response.data } : reservation
          )
        );
        setError('Reservation updated successfully');
      } else {
        setError(response.error || 'Failed to update reservation');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const cancelReservation = async (reservationId, reason) => {
    try {
      const response = await reservationAPI.cancelReservation(reservationId, { reason });

      if (response.success) {
        // Update local state
        setReservations(prev =>
          prev.map(reservation =>
            reservation._id === reservationId ? { ...reservation, status: 'cancelled' } : reservation
          )
        );
        setError('Reservation cancelled');
      } else {
        setError(response.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (error && !loading) {
    return (
      <div className="center-page">
        <div className="glass-card">
          <h1>Erreur</h1>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => fetchReservations()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const renderListView = () => {
    return (
      <div className="glass-card">
        <h2>Réservations</h2>

        {/* Filters */}
        <div className="reservation-filters">
          <div className="filter-row">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="active">Actives</option>
              <option value="completed">Terminées</option>
              <option value="cancelled">Annulées</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">Toutes les catégories</option>
              {/* Categories will be populated from API */}
            </select>
          </div>

          <div className="filter-row">
            <input
              type="date"
              value={filterDateRange.start}
              onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="filter-input"
              placeholder="Date de début"
            />
            <input
              type="date"
              value={filterDateRange.end}
              onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="filter-input"
              placeholder="Date de fin"
            />
          </div>

          <button
            className="btn-ghost"
            onClick={() => {
              setFilterStatus('');
              setFilterCategory('');
              setFilterDateRange({ start: '', end: '' });
            }}
          >
            Effacer les filtres
          </button>

          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            Nouvelle réservation
          </button>
        </div>

        <div className="reservation-list">
          {reservations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>Aucune réservation trouvée</p>
            </div>
          ) : (
            <div className="reservations-grid">
              {reservations.map(reservation => (
                <div
                  key={reservation._id}
                  className={`reservation-item status-${reservation.status}`}
                  onClick={() => fetchSingleReservation(reservation._id)}
                >
                  <div className="reservation-header">
                    <h4>{reservation.equipment_id?.name || 'Équipement inconnu'}</h4>
                    <div className="reservation-meta">
                      <span className={`status-badge status-${reservation.status}`}>
                        {reservation.status === 'pending' && 'En attente'}
                        {reservation.status === 'approved' && 'Approuvée'}
                        {reservation.status === 'active' && 'Active'}
                        {reservation.status === 'completed' && 'Terminée'}
                        {reservation.status === 'cancelled' && 'Annulée'}
                      </span>
                      </span>
                      <span className="reservation-dates">
                        {formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}
                      </span>
                    </div>
                  </div>

                  <div className="reservation-content">
                    <p>{reservation.purpose}</p>
                    {reservation.notes && (
                      <p><strong>Notes:</strong> {reservation.notes}</p>
                    )}
                  </div>

                  <div className="reservation-actions">
                    {reservation.status === 'pending' && user && (
                      <button
                        className="btn-small btn-danger"
                        onClick={() => cancelReservation(reservation._id, "Annulation de l'utilisateur")}
                      >
                        Annuler
                      </button>
                    )}

                    {(reservation.status === 'pending' || reservation.status === 'approved') && (
                      <button
                        className="btn-small btn-secondary"
                        onClick={() => fetchSingleReservation(reservation._id)}
                      >
                        Modifier
                      </button>
                    )}

                    <button
                      className="btn-small"
                      onClick={() => navigate(`/reservations/${reservation._id}`)}
                      >
                        Détails
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    // Simple calendar implementation
    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const days = [];

      // Add empty days at the beginning
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
      }

      // Add days with reservations
      for (let i = 1; i <= daysInMonth; i++) {
        const dayNumber = i - firstDay + 1;
        const hasReservation = reservations.some(reservation => {
          const reservationDate = new Date(reservation.start_date);
          return reservationDate.getDate() === dayNumber &&
                 reservationDate.getMonth() === month &&
                 reservationDate.getFullYear() === year;
        });

        days.push(
          <div
            key={i}
            className={`calendar-day ${hasReservation ? 'has-reservation' : ''} ${new Date(year, month, i).getDay() === 0 || new Date(year, month, i).getDay() === 6 ? 'weekend' : ''}`}
            onClick={() => {
              const dayReservations = reservations.filter(reservation => {
                const reservationDate = new Date(reservation.start_date);
                return reservationDate.getDate() === dayNumber &&
                       reservationDate.getMonth() === month &&
                       reservationDate.getFullYear() === year;
              });

              if (dayReservations.length > 0) {
                // Show reservations for this day
                // Implementation would go here
              }
            }}
          >
            {i}
          </div>
        );
      }

      return (
        <div className="calendar-view">
          <div className="calendar-header">
            <button
              onClick={() => {
                const prevMonth = new Date(year, month - 1);
                setFilterDateRange({
                  ...filterDateRange,
                  start: prevMonth
                });
              }}
            >
              ←
            </button>
            <div className="calendar-title">
              {new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
            <button
              onClick={() => {
                const nextMonth = new Date(year, month + 1);
                setFilterDateRange({
                  ...filterDateRange,
                  start: nextMonth
                });
              }}
            >
              →
            </button>
          </div>

          <div className="calendar-grid">
            {days}
          </div>

          <div className="calendar-legend">
            <div className="legend-item">
              <div className="legend-color has-reservation"></div>
              <span> Jour avec réservation</span>
            </div>
            <div className="legend-item">
              <div className="legend-color"></div>
              <span> Jour disponible</span>
            </div>
          </div>
        </div>
      );
  };

  return (
    <div className="center-page">
      <div className="glass-card">
        <div className="page-header">
          <h1>Gestion des Réservations</h1>
          <div className="view-toggle">
            <button
              className={`btn-toggle ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              Liste
            </button>
            <button
              className={`btn-toggle ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              Calendrier
            </button>
          </div>
        </div>

        <div className="reservation-controls">
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Nouvelle réservation
          </button>
        </div>

        {selectedReservation && (
          <div className="selected-reservation">
            <h3>Réservation sélectionnée</h3>
            <div className="selected-details">
              <p><strong>Équipement:</strong> {selectedReservation.equipment_id?.name}</p>
              <p><strong>Période:</strong> {formatDate(selectedReservation.start_date)} - {formatDate(selectedReservation.end_date)}</p>
              <p><strong>Statut:</strong> {selectedReservation.status}</p>
            </div>
            <div className="selected-actions">
              <button className="btn-small btn-secondary">Modifier</button>
              <button className="btn-small btn-danger">Annuler</button>
            </div>
          </div>
        )}

        {view === 'list' && renderListView()}
        {view === 'calendar' && renderCalendarView()}
      </div>

      {/* Create Reservation Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Nouvelle Réservation</h2>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={(e) => {
              e.preventDefault();
              // Handle form submission
            }}>
              <div className="form-group">
                <label>Équipement</label>
                <select name="equipmentId" required>
                  {/* Equipment options would be populated here */}
                  <option value="">Sélectionnez un équipement</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date de début</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Date de fin</label>
                <input
                  type="date"
                  name="endDate"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>Quantité</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label>Objectif</label>
                <textarea
                  name="purpose"
                  required
                  rows="3"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea
                  name="notes"
                  rows="2"
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Création...' : 'Créer la réservation'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationManagement;