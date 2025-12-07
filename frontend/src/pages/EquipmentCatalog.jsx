import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { equipmentAPI } from '../services/api';
import EquipmentCard from '../components/EquipmentCard';

const EquipmentCatalog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // State for equipment, filters, and loading
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Check if viewing single equipment
  const isSingleView = !!id;

  // Filter params from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get('search') || '');
    setSelectedCategory(params.get('category') || '');
    setSelectedStatus(params.get('status') || '');
    setSelectedAvailability(params.get('available') === 'true');
    setSortBy(params.get('sort') || 'name');
    setSortOrder(params.get('order') || 'asc');
    setCurrentPage(parseInt(params.get('page')) || 1);
  }, [location.search]);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch equipment when filters change
  useEffect(() => {
    if (!isSingleView) {
      fetchEquipment();
    } else {
      fetchSingleEquipment();
    }
  }, [searchTerm, selectedCategory, selectedStatus, selectedAvailability, sortBy, sortOrder, currentPage, isSingleView]);

  const fetchCategories = async () => {
    try {
      const response = await equipmentAPI.getCategories();
      if (response.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        search: searchTerm,
        category: selectedCategory,
        status: selectedStatus,
        available: selectedAvailability,
        sort: sortBy,
        order: sortOrder,
        page: currentPage,
        limit: 12
      };

      const response = await equipmentAPI.getEquipment(params);
      if (response.success) {
        setEquipment(response.data.equipment);
        setTotalPages(response.data.pagination.pages);
      } else {
        setError('Failed to fetch equipment');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleEquipment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await equipmentAPI.getEquipmentById(id);
      if (response.success) {
        setEquipment([response.data.data]);
      } else {
        setError('Equipment not found');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    updateURL();
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    updateURL();
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    updateURL();
  };

  const handleAvailabilityChange = (available) => {
    setSelectedAvailability(available);
    setCurrentPage(1);
    updateURL();
  };

  const handleSort = (newSortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1);
    updateURL();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    updateURL();
  };

  const handleReserve = (equipmentId) => {
    // Navigate to reservation page with pre-filled equipment
    navigate(`/reservations?equipment=${equipmentId}`);
  };

  const updateURL = () => {
    const params = new URLSearchParams();

    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedStatus) params.set('status', selectedStatus);
    if (selectedAvailability) params.set('available', 'true');
    if (sortBy) params.set('sort', sortBy);
    if (sortOrder) params.set('order', sortOrder);
    if (currentPage > 1) params.set('page', currentPage);

    const newURL = `${location.pathname}${params.toString()}`;
    navigate(newURL, { replace: true });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedAvailability(false);
    setSortBy('name');
    setSortOrder('asc');
    setCurrentPage(1);
    updateURL();
  };

  // Single equipment view
  if (isSingleView) {
    if (loading) {
      return (
        <div className="center-page">
          <div className="glass-card">
            <div className="loading-spinner">Chargement...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="center-page">
          <div className="glass-card">
            <h2>Erreur</h2>
            <p>{error}</p>
            <button className="btn-primary" onClick={() => navigate('/equipment')}>
              Retour à la liste
            </button>
          </div>
        </div>
      );
    }

    const equipmentItem = equipment[0];
    if (!equipmentItem) {
      return (
        <div className="center-page">
          <div className="glass-card">
            <h2>Équipement non trouvé</h2>
            <button className="btn-primary" onClick={() => navigate('/equipment')}>
              Retour à la liste
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="equipment-catalog">
        <div className="catalog-header">
          <h1>{equipmentItem.name}</h1>
          <div className="catalog-actions">
            <button className="btn-ghost" onClick={() => navigate('/equipment')}>
              ← Retour
            </button>
          </div>
        </div>

        <EquipmentCard
          equipment={equipmentItem}
          onReserve={handleReserve}
          compact={false}
        />
      </div>
    );
  }

  // Catalog view
  return (
    <div className="equipment-catalog">
      <div className="catalog-header">
        <div className="catalog-title">
          <h1>Catalogue d'équipements</h1>
          <p>Découvrez et réservez les équipements disponibles</p>
        </div>

        <div className="catalog-filters">
          <button
            className="btn-filter"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </button>

          <div className={`filter-controls ${showFilters ? 'show' : ''}`}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />

            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="filter-select"
            >
              <option value="">Toutes catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="filter-select"
            >
              <option value="">Tous statuts</option>
              <option value="available">Disponible</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="filter-select"
            >
              <option value="name">Nom</option>
              <option value="created_at">Date d'ajout</option>
              <option value="total_quantity">Quantité</option>
              <option value="utilization_rate">Utilisation</option>
            </select>

            <button
              onClick={() => {
                setSelectedAvailability(!selectedAvailability);
                setCurrentPage(1);
                updateURL();
              }}
              className={`btn-toggle ${selectedAvailability ? 'active' : ''}`}
            >
              {selectedAvailability ? 'Disponible seulement' : 'Inclure indisponible'}
            </button>

            {(searchTerm || selectedCategory || selectedStatus || selectedAvailability || sortBy !== 'name') && (
              <button className="btn-ghost" onClick={clearFilters}>
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="catalog-loading">
          <div className="loading-spinner">Chargement...</div>
        </div>
      ) : error ? (
        <div className="catalog-error">
          <div className="glass-card">
            <h2>Erreur</h2>
            <p>{error}</p>
            <button className="btn-primary" onClick={() => {
              setError(null);
              fetchEquipment();
            }}>
              Réessayer
            </button>
          </div>
        </div>
      ) : (
        <div className="catalog-content">
          {equipment.length === 0 ? (
            <div className="empty-state">
              <div className="glass-card">
                <h2>Aucun équipement trouvé</h2>
                <p>
                  {searchTerm || selectedCategory || selectedStatus || selectedAvailability
                    ? 'Aucun équipement ne correspond à vos critères.'
                    : 'Aucun équipement disponible pour le moment.'}
                </p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    clearFilters();
                    fetchEquipment();
                  }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          ) : (
            <div className="equipment-grid">
              {equipment.map(item => (
                <EquipmentCard
                  key={item._id}
                  equipment={item}
                  onReserve={handleReserve}
                  compact={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && !error && (
        <div className="catalog-pagination">
          <button
            className="btn-ghost"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Précédent
          </button>

          <span className="pagination-info">
            Page {currentPage} sur {totalPages}
          </span>

          <button
            className="btn-ghost"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default EquipmentCatalog;