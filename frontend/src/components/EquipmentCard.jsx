import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EquipmentCard = ({ equipment, onReserve, compact = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReserve = () => {
    if (onReserve) {
      onReserve(equipment._id);
    } else {
      navigate(`/equipment/${equipment._id}`);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#22c55e'; // Green
      case 'maintenance':
        return '#f59e0b'; // Orange
      case 'retired':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'maintenance':
        return 'Maintenance';
      case 'retired':
        return 'Retiré';
      default:
        return status;
    }
  };

  const getUtilizationRate = () => {
    if (equipment.total_quantity === 0) return 0;
    return Math.round(((equipment.total_quantity - equipment.available_quantity) / equipment.total_quantity) * 100);
  };

  const formatPrice = (price, type = 'hourly') => {
    if (price === 0) return 'Gratuit';
    return `${price.toFixed(2)}€/${type === 'hourly' ? 'h' : 'jour'}`;
  };

  const cardClass = compact
    ? 'equipment-card compact'
    : 'equipment-card';

  const imagesToShow = equipment.images ? equipment.images.slice(0, 3) : [];

  return (
    <div className={cardClass}>
      {/* Image Section */}
      <div className="equipment-card-image">
        {imagesToShow.length > 0 ? (
          <div className="equipment-card-images">
            {imagesToShow.map((image, index) => (
              <div key={index} className="equipment-card-image-item">
                <img
                  src={image}
                  alt={`${equipment.name} - Image ${index + 1}`}
                  className="equipment-card-img"
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="equipment-card-image-placeholder">
            <span className="equipment-card-placeholder-icon">📦</span>
          </div>
        )}

        {/* Status Badge */}
        <div
          className="equipment-card-status"
          style={{ backgroundColor: getStatusColor(equipment.status) }}
        >
          {getStatusText(equipment.status)}
        </div>
      </div>

      {/* Content Section */}
      <div className="equipment-card-content">
        <div className="equipment-card-header">
          <h3 className="equipment-card-title">{equipment.name}</h3>
          <div className="equipment-card-meta">
            {equipment.specifications?.brand && (
              <span className="equipment-card-brand">{equipment.specifications.brand}</span>
            )}
            <span className="equipment-card-category">{equipment.category}</span>
          </div>
        </div>

        <p className="equipment-card-description">
          {equipment.description?.substring(0, compact ? 80 : 120)}
          {equipment.description?.length > (compact ? 80 : 120) && '...'}
        </p>

        {/* Specifications */}
        <div className="equipment-card-specs">
          {equipment.specifications?.model && (
            <div className="equipment-card-spec">
              <span className="spec-label">Modèle:</span>
              <span className="spec-value">{equipment.specifications.model}</span>
            </div>
          )}

          {equipment.specifications?.year_manufactured && (
            <div className="equipment-card-spec">
              <span className="spec-label">Année:</span>
              <span className="spec-value">{equipment.specifications.year_manufactured}</span>
            </div>
          )}

          {equipment.location && (
            <div className="equipment-card-spec">
              <span className="spec-label">Lieu:</span>
              <span className="spec-value">{equipment.location}</span>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="equipment-card-availability">
          <div className="availability-info">
            <span className="availability-label">Disponibilité:</span>
            <span className="availability-count">
              {equipment.available_quantity}/{equipment.total_quantity}
            </span>
          </div>
          <div className="utilization-bar">
            <div
              className="utilization-fill"
              style={{ width: `${getUtilizationRate()}%` }}
            />
          </div>
          <span className="utilization-text">
            {getUtilizationRate()}% utilisé
          </span>
        </div>

        {/* Pricing */}
        <div className="equipment-card-pricing">
          {equipment.rental_info?.hourly_rate > 0 && (
            <div className="price-info">
              <span className="price-label">Heure:</span>
              <span className="price-value">
                {formatPrice(equipment.rental_info.hourly_rate, 'hourly')}
              </span>
            </div>
          )}

          {equipment.rental_info?.daily_rate > 0 && (
            <div className="price-info">
              <span className="price-label">Jour:</span>
              <span className="price-value">
                {formatPrice(equipment.rental_info.daily_rate, 'daily')}
              </span>
            </div>
          )}
        </div>

        {/* Rating */}
        {equipment.usage_stats?.average_rating && (
          <div className="equipment-card-rating">
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`rating-star ${star <= equipment.usage_stats.average_rating ? 'filled' : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="rating-text">
              ({equipment.usage_stats.average_rating.toFixed(1)}/5)
            </span>
            <span className="rating-count">
              {equipment.usage_stats.total_rentals} réservations
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="equipment-card-footer">
        {/* Approval Badge */}
        {equipment.rental_info?.requires_approval && (
          <div className="approval-badge">
            <span className="approval-icon">⚠️</span>
            <span className="approval-text">Approbation requise</span>
          </div>
        )}

        {/* Training Required */}
        {equipment.rental_info?.requires_training && (
          <div className="training-badge">
            <span className="training-icon">🎓</span>
            <span className="training-text">Formation requise</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="equipment-card-actions">
          <button
            className="btn-ghost btn-small"
            onClick={() => navigate(`/equipment/${equipment._id}`)}
          >
            Détails
          </button>

          {equipment.available_quantity > 0 && user && (
            <button
              className="btn-primary btn-small"
              onClick={handleReserve}
              disabled={isLoading}
            >
              {isLoading ? '...' : 'Réserver'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentCard;